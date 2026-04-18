-- Fix the generate_backup_codes function to use jsonb_build_object instead of json_build_object
-- This resolves the "operator does not exist: jsonb || json" error

CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_backup_codes jsonb := '[]'::jsonb;
  v_code text;
  v_hash text;
  v_plain_codes text[] := '{}';
  i integer;
BEGIN
  -- Check if user exists and security code is enabled
  IF NOT EXISTS (SELECT 1 FROM public.user_security WHERE user_id = p_user_id AND security_code_enabled = true) THEN
    RETURN json_build_object('success', false, 'error', 'Security code not enabled');
  END IF;
  
  -- Generate 5 backup codes
  FOR i IN 1..5 LOOP
    -- Generate 10-digit alphanumeric code
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
    v_hash := extensions.crypt(v_code, extensions.gen_salt('bf'));
    
    -- Use jsonb_build_object instead of json_build_object to fix type mismatch
    v_backup_codes := v_backup_codes || jsonb_build_object('hash', v_hash, 'created_at', NOW());
    v_plain_codes := array_append(v_plain_codes, v_code);
  END LOOP;
  
  -- Update user_security with new backup codes
  UPDATE public.user_security 
  SET security_code_backup_codes = v_backup_codes,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object('success', true, 'codes', v_plain_codes);
END;
$function$