-- Create function to hash security codes using bcrypt
CREATE OR REPLACE FUNCTION public.hash_security_code(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(p_code, gen_salt('bf'));
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.hash_security_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_security_code(text) TO service_role;