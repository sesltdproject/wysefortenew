-- Fix search path for security code functions to access pgcrypto
CREATE OR REPLACE FUNCTION public.update_security_code(p_user_id uuid, p_old_code text, p_new_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  current_hash text;
BEGIN
  -- Verify user is updating their own settings
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get current hash
  SELECT security_code_hash INTO current_hash
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  -- If there's an existing code, verify it matches
  IF current_hash IS NOT NULL AND p_old_code IS NOT NULL THEN
    IF current_hash != crypt(p_old_code, current_hash) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid current security code');
    END IF;
  END IF;
  
  -- Update with new code
  UPDATE public.user_security
  SET 
    security_code_hash = crypt(p_new_code, gen_salt('bf')),
    security_code_enabled = true,
    updated_at = now(),
    last_updated = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  codes text[];
  i integer;
  new_code text;
BEGIN
  -- Verify user is updating their own settings
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Generate 10 random backup codes
  codes := ARRAY[]::text[];
  FOR i IN 1..10 LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    codes := array_append(codes, new_code);
  END LOOP;
  
  -- Store hashed versions of the codes
  UPDATE public.user_security
  SET 
    backup_codes = (
      SELECT jsonb_agg(jsonb_build_object(
        'code_hash', crypt(code, gen_salt('bf')),
        'used', false
      ))
      FROM unnest(codes) AS code
    ),
    backup_codes_generated_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Return the plain text codes (only time they'll be visible)
  RETURN jsonb_build_object('success', true, 'codes', to_jsonb(codes));
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_security_code(p_user_id uuid, p_code text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  stored_hash text;
  backup_codes_data jsonb;
  code_obj jsonb;
  is_backup_code boolean := false;
BEGIN
  -- Get security code hash and backup codes
  SELECT security_code_hash, backup_codes 
  INTO stored_hash, backup_codes_data
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  -- Check if it matches the primary security code
  IF stored_hash IS NOT NULL AND stored_hash = crypt(p_code, stored_hash) THEN
    RETURN jsonb_build_object('success', true, 'type', 'security_code');
  END IF;
  
  -- Check if it matches any unused backup code
  IF backup_codes_data IS NOT NULL THEN
    FOR code_obj IN SELECT * FROM jsonb_array_elements(backup_codes_data)
    LOOP
      IF (code_obj->>'used')::boolean = false AND 
         (code_obj->>'code_hash') = crypt(p_code, (code_obj->>'code_hash')) THEN
        -- Mark this backup code as used
        UPDATE public.user_security
        SET backup_codes = (
          SELECT jsonb_agg(
            CASE 
              WHEN elem->>'code_hash' = code_obj->>'code_hash' 
              THEN jsonb_set(elem, '{used}', 'true'::jsonb)
              ELSE elem
            END
          )
          FROM jsonb_array_elements(backup_codes) AS elem
        ),
        updated_at = now()
        WHERE user_id = p_user_id;
        
        RETURN jsonb_build_object('success', true, 'type', 'backup_code');
      END IF;
    END LOOP;
  END IF;
  
  -- No match found
  RETURN jsonb_build_object('success', false, 'error', 'Invalid security code');
END;
$function$;