-- Fix current invalid state: ensure mutual exclusivity
-- If email alerts are disabled, disable both providers
-- If SMTP is enabled, disable Resend; otherwise default Resend to true
UPDATE website_settings
SET 
  smtp_enabled = CASE WHEN email_alerts_enabled = false THEN false ELSE smtp_enabled END,
  resend_enabled = CASE WHEN email_alerts_enabled = false THEN false 
                        WHEN smtp_enabled = true THEN false 
                        ELSE resend_enabled END;

-- Update the function to properly handle resend_enabled and enforce mutual exclusivity
CREATE OR REPLACE FUNCTION public.update_website_settings(settings JSONB)
RETURNS SETOF public.website_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_alerts BOOLEAN;
  v_smtp_enabled BOOLEAN;
  v_resend_enabled BOOLEAN;
  current_smtp BOOLEAN;
  current_resend BOOLEAN;
BEGIN
  -- Get current values from database
  SELECT smtp_enabled, resend_enabled INTO current_smtp, current_resend 
  FROM website_settings LIMIT 1;

  -- Get new values from input, falling back to current values
  v_email_alerts := COALESCE((settings->>'email_alerts_enabled')::BOOLEAN, 
    (SELECT email_alerts_enabled FROM website_settings LIMIT 1));
  v_smtp_enabled := COALESCE((settings->>'smtp_enabled')::BOOLEAN, current_smtp);
  v_resend_enabled := COALESCE((settings->>'resend_enabled')::BOOLEAN, current_resend);

  -- Enforce: If email alerts disabled, disable both providers
  IF v_email_alerts = FALSE THEN
    v_smtp_enabled := FALSE;
    v_resend_enabled := FALSE;
  -- Enforce mutual exclusivity: If SMTP is being explicitly enabled, disable Resend
  ELSIF (settings ? 'smtp_enabled') AND v_smtp_enabled = TRUE THEN
    v_resend_enabled := FALSE;
  -- Enforce mutual exclusivity: If Resend is being explicitly enabled, disable SMTP  
  ELSIF (settings ? 'resend_enabled') AND v_resend_enabled = TRUE THEN
    v_smtp_enabled := FALSE;
  END IF;

  UPDATE public.website_settings
  SET
    bank_name = COALESCE(settings->>'bank_name', bank_name),
    bank_address = COALESCE(settings->>'bank_address', bank_address),
    bank_phone = COALESCE(settings->>'bank_phone', bank_phone),
    support_email = COALESCE(settings->>'support_email', support_email),
    logo_url = COALESCE(settings->>'logo_url', logo_url),
    favicon_url = COALESCE(settings->>'favicon_url', favicon_url),
    footer_logo_url = COALESCE(settings->>'footer_logo_url', footer_logo_url),
    email_alerts_enabled = v_email_alerts,
    show_navigation_menu = COALESCE((settings->>'show_navigation_menu')::BOOLEAN, show_navigation_menu),
    website_visibility = COALESCE((settings->>'website_visibility')::BOOLEAN, website_visibility),
    show_kyc_page = COALESCE((settings->>'show_kyc_page')::BOOLEAN, show_kyc_page),
    smtp_enabled = v_smtp_enabled,
    smtp_host = COALESCE(settings->>'smtp_host', smtp_host),
    smtp_port = COALESCE((settings->>'smtp_port')::INTEGER, smtp_port),
    smtp_username = COALESCE(settings->>'smtp_username', smtp_username),
    smtp_password = COALESCE(settings->>'smtp_password', smtp_password),
    smtp_from_email = COALESCE(settings->>'smtp_from_email', smtp_from_email),
    smtp_from_name = COALESCE(settings->>'smtp_from_name', smtp_from_name),
    smtp_use_ssl = COALESCE((settings->>'smtp_use_ssl')::BOOLEAN, smtp_use_ssl),
    resend_enabled = v_resend_enabled,
    receipt_header_color = COALESCE(settings->>'receipt_header_color', receipt_header_color),
    receipt_accent_color = COALESCE(settings->>'receipt_accent_color', receipt_accent_color),
    receipt_title = COALESCE(settings->>'receipt_title', receipt_title),
    receipt_show_logo = COALESCE((settings->>'receipt_show_logo')::BOOLEAN, receipt_show_logo),
    receipt_show_watermark = COALESCE((settings->>'receipt_show_watermark')::BOOLEAN, receipt_show_watermark),
    receipt_watermark_text = COALESCE(settings->>'receipt_watermark_text', receipt_watermark_text),
    receipt_footer_disclaimer = COALESCE(settings->>'receipt_footer_disclaimer', receipt_footer_disclaimer),
    receipt_custom_message = COALESCE(settings->>'receipt_custom_message', receipt_custom_message),
    receipt_reference_prefix = COALESCE(settings->>'receipt_reference_prefix', receipt_reference_prefix),
    updated_at = now()
  WHERE id = (SELECT id FROM public.website_settings LIMIT 1);
  
  RETURN QUERY SELECT * FROM public.website_settings LIMIT 1;
END;
$$;