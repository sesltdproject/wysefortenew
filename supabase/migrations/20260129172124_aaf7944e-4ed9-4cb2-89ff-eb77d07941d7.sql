-- =====================================================
-- SECURITY FIX: Remove overly permissive RLS policies
-- =====================================================

-- 1. Fix email_verification_codes table - remove public access
-- Only edge functions (using service role) should access this table

DROP POLICY IF EXISTS "Allow public select" ON public.email_verification_codes;
DROP POLICY IF EXISTS "Allow public insert" ON public.email_verification_codes;
DROP POLICY IF EXISTS "Allow public update" ON public.email_verification_codes;

-- Edge functions use service role key which bypasses RLS, so no policies needed for them
-- But we need to ensure RLS is enabled (it should be already)
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- 2. Fix website_settings table - remove public SELECT that exposes SMTP credentials
-- Create a secure RPC function to get public settings (excluding sensitive fields)

DROP POLICY IF EXISTS "Everyone can view website settings" ON public.website_settings;

-- Only admins can view full settings (including SMTP credentials) via direct table access
CREATE POLICY "Admins can view all website settings" 
ON public.website_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a security definer function to return only public/safe settings
CREATE OR REPLACE FUNCTION public.get_public_website_settings()
RETURNS TABLE (
  id uuid,
  bank_name text,
  bank_email text,
  bank_phone text,
  bank_address text,
  support_email text,
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  footer_logo_url text,
  show_navigation_menu boolean,
  website_visibility boolean,
  show_kyc_page boolean,
  receipt_header_color text,
  receipt_accent_color text,
  receipt_title text,
  receipt_watermark_text text,
  receipt_footer_disclaimer text,
  receipt_custom_message text,
  receipt_reference_prefix text,
  receipt_show_logo boolean,
  receipt_show_watermark boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    bank_name,
    bank_email,
    bank_phone,
    bank_address,
    support_email,
    logo_url,
    favicon_url,
    primary_color,
    secondary_color,
    footer_logo_url,
    show_navigation_menu,
    website_visibility,
    show_kyc_page,
    receipt_header_color,
    receipt_accent_color,
    receipt_title,
    receipt_watermark_text,
    receipt_footer_disclaimer,
    receipt_custom_message,
    receipt_reference_prefix,
    receipt_show_logo,
    receipt_show_watermark
  FROM public.website_settings
  LIMIT 1;
$$;

-- Grant execute to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_website_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_website_settings() TO authenticated;

-- 3. Add password reset audit logging table
CREATE TABLE IF NOT EXISTS public.password_reset_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  action text NOT NULL, -- 'initiated', 'code_sent', 'verified', 'failed', 'completed'
  success boolean DEFAULT false,
  failure_reason text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view password reset audit" 
ON public.password_reset_audit 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert (for edge functions)
-- No explicit policy needed as service role bypasses RLS

-- 4. Add rate limiting table for password resets
CREATE TABLE IF NOT EXISTS public.password_reset_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or email
  identifier_type text NOT NULL, -- 'ip' or 'email'
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamp with time zone DEFAULT now(),
  last_attempt_at timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  UNIQUE(identifier, identifier_type)
);

-- Enable RLS
ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view (edge functions use service role)
CREATE POLICY "Admins can view rate limits" 
ON public.password_reset_rate_limits 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage rate limits" 
ON public.password_reset_rate_limits 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Add trigger to clear password_hash after account creation
CREATE OR REPLACE FUNCTION public.clear_application_password()
RETURNS TRIGGER AS $$
BEGIN
  -- When application status changes to 'approved', clear the password
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.password_hash := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS clear_password_on_approval ON public.account_applications;
CREATE TRIGGER clear_password_on_approval
  BEFORE UPDATE ON public.account_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_application_password();

-- 6. Clear any existing plaintext passwords from approved/rejected applications
UPDATE public.account_applications 
SET password_hash = NULL 
WHERE status IN ('approved', 'rejected') AND password_hash IS NOT NULL;