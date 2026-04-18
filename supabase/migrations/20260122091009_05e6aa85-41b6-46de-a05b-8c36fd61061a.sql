-- Fix search_path for the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_requests WHERE expires_at < now() OR used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;