-- Create password reset requests table for secure multi-factor password recovery
CREATE TABLE public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reset_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS - only service role (edge functions) should access this
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- No RLS policies - only service role access via edge functions
-- This is intentional security measure - users cannot query this table directly

-- Create index for faster lookups
CREATE INDEX idx_password_reset_email ON password_reset_requests(email);
CREATE INDEX idx_password_reset_code ON password_reset_requests(reset_code);

-- Add cleanup function for expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_requests WHERE expires_at < now() OR used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;