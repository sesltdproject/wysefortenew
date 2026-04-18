-- Update backup code generator to generate 10-digit numeric codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
  
  -- Generate 10 random 10-digit backup codes
  codes := ARRAY[]::text[];
  FOR i IN 1..10 LOOP
    -- Generate a random 10-digit number (1000000000 to 9999999999)
    new_code := LPAD(FLOOR(RANDOM() * 9000000000 + 1000000000)::TEXT, 10, '0');
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