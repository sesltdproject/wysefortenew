-- Drop and recreate get_website_settings to include auth_emails_enabled
DROP FUNCTION IF EXISTS public.get_website_settings();

CREATE FUNCTION public.get_website_settings()
RETURNS SETOF website_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM website_settings LIMIT 1;
$function$;

-- Create email_verification_codes table for account application verification
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  attempts INTEGER DEFAULT 0
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email ON public.email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires ON public.email_verification_codes(expires_at);

-- Enable RLS
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for initial verification request)
CREATE POLICY "Allow public insert for email verification" ON public.email_verification_codes
  FOR INSERT WITH CHECK (true);

-- Allow public select for verification check
CREATE POLICY "Allow public select for email verification" ON public.email_verification_codes
  FOR SELECT USING (true);

-- Allow public update for marking as verified
CREATE POLICY "Allow public update for email verification" ON public.email_verification_codes
  FOR UPDATE USING (true);