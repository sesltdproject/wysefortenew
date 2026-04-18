-- Drop and recreate function
DROP FUNCTION IF EXISTS public.get_website_settings();

CREATE FUNCTION public.get_website_settings()
RETURNS TABLE (
  id uuid,
  bank_name text,
  bank_address text,
  bank_phone text,
  support_email text,
  logo_url text,
  favicon_url text,
  footer_logo_url text,
  email_alerts_enabled boolean,
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
  receipt_header_color text,
  receipt_accent_color text,
  receipt_title text,
  receipt_show_logo boolean,
  receipt_show_watermark boolean,
  receipt_watermark_text text,
  receipt_footer_disclaimer text,
  receipt_custom_message text,
  receipt_reference_prefix text,
  resend_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    bank_name,
    bank_address,
    bank_phone,
    support_email,
    logo_url,
    favicon_url,
    footer_logo_url,
    email_alerts_enabled,
    show_navigation_menu,
    website_visibility,
    show_kyc_page,
    smtp_enabled,
    smtp_host,
    smtp_port,
    smtp_username,
    smtp_password,
    smtp_from_email,
    smtp_from_name,
    smtp_use_ssl,
    receipt_header_color,
    receipt_accent_color,
    receipt_title,
    receipt_show_logo,
    receipt_show_watermark,
    receipt_watermark_text,
    receipt_footer_disclaimer,
    receipt_custom_message,
    receipt_reference_prefix,
    resend_enabled
  FROM website_settings
  LIMIT 1;
$$;