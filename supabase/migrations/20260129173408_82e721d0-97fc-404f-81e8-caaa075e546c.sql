-- Fix get_website_settings to require admin role
CREATE OR REPLACE FUNCTION public.get_website_settings()
RETURNS TABLE (
  bank_name text,
  bank_address text,
  bank_phone text,
  support_email text,
  logo_url text,
  favicon_url text,
  footer_logo_url text,
  email_alerts_enabled boolean,
  auth_emails_enabled boolean,
  show_navigation_menu boolean,
  website_visibility boolean,
  show_kyc_page boolean,
  smtp_enabled boolean,
  smtp_host text,
  smtp_port integer,
  smtp_username text,
  smtp_password text,
  smtp_from_email text,
  smtp_from_name text,
  smtp_use_ssl boolean,
  resend_enabled boolean,
  receipt_header_color text,
  receipt_accent_color text,
  receipt_title text,
  receipt_show_logo boolean,
  receipt_show_watermark boolean,
  receipt_watermark_text text,
  receipt_footer_disclaimer text,
  receipt_custom_message text,
  receipt_reference_prefix text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to access full settings including SMTP credentials
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    ws.bank_name,
    ws.bank_address,
    ws.bank_phone,
    ws.support_email,
    ws.logo_url,
    ws.favicon_url,
    ws.footer_logo_url,
    ws.email_alerts_enabled,
    ws.auth_emails_enabled,
    ws.show_navigation_menu,
    ws.website_visibility,
    ws.show_kyc_page,
    ws.smtp_enabled,
    ws.smtp_host,
    ws.smtp_port,
    ws.smtp_username,
    ws.smtp_password,
    ws.smtp_from_email,
    ws.smtp_from_name,
    ws.smtp_use_ssl,
    ws.resend_enabled,
    ws.receipt_header_color,
    ws.receipt_accent_color,
    ws.receipt_title,
    ws.receipt_show_logo,
    ws.receipt_show_watermark,
    ws.receipt_watermark_text,
    ws.receipt_footer_disclaimer,
    ws.receipt_custom_message,
    ws.receipt_reference_prefix
  FROM public.website_settings ws
  LIMIT 1;
END;
$$;