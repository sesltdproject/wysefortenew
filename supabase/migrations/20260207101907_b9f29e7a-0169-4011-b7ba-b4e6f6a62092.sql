-- Reset all existing security codes to '123456' using the hash_security_code function
-- First, get the hash for '123456'
DO $$
DECLARE
  new_hash TEXT;
BEGIN
  -- Generate the hash for the new 6-digit code '123456'
  SELECT encode(digest('123456', 'sha256'), 'hex') INTO new_hash;
  
  -- Update all users who have a security code set
  UPDATE public.user_security
  SET security_code_hash = new_hash,
      updated_at = now()
  WHERE security_code_hash IS NOT NULL;
END $$;