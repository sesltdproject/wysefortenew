-- Add backup_codes column to user_security table
ALTER TABLE public.user_security 
ADD COLUMN IF NOT EXISTS backup_codes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS backup_codes_generated_at timestamp with time zone;

-- Create user_security records for all existing users who don't have one
INSERT INTO public.user_security (user_id, two_factor_enabled, security_code_enabled, account_locked, login_attempts)
SELECT 
  au.id,
  false,
  false,
  false,
  0
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_security us WHERE us.user_id = au.id
);

-- Function to toggle security code
CREATE OR REPLACE FUNCTION public.toggle_security_code(
  p_user_id uuid,
  p_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is updating their own settings
  IF auth.uid() != p_user_id AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Update security code enabled status
  UPDATE public.user_security
  SET 
    security_code_enabled = p_enabled,
    updated_at = now(),
    last_updated = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to update security code
CREATE OR REPLACE FUNCTION public.update_security_code(
  p_user_id uuid,
  p_old_code text,
  p_new_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to generate backup codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Function to verify security code
CREATE OR REPLACE FUNCTION public.verify_security_code(
  p_user_id uuid,
  p_code text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;