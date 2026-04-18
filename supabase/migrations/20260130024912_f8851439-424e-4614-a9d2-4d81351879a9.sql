-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Drop and recreate the function with proper search_path including extensions schema
DROP FUNCTION IF EXISTS public.hash_security_code(text);

CREATE OR REPLACE FUNCTION public.hash_security_code(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN crypt(p_code, gen_salt('bf'));
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.hash_security_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_security_code(text) TO service_role;