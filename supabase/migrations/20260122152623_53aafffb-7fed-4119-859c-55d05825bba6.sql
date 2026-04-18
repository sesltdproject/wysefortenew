-- Fix website settings saving:
-- 1) Make update_website_settings(jsonb) safe-update compatible by adding WHERE clause
-- 2) Add wrapper update_website_settings(json) so rpc calls that send JSON resolve correctly

CREATE OR REPLACE FUNCTION public.update_website_settings(settings jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bank_name text;
  v_bank_address text;
  v_bank_phone text;
  v_support_email text;
  v_logo_url text;
  v_favicon_url text;
  v_footer_logo_url text;
  v_email_alerts boolean;
  v_auth_emails boolean;
  v_show_nav boolean;
  v_website_vis boolean;
  v_show_kyc boolean;
  v_smtp_enabled boolean;
  v_smtp_host text;
  v_smtp_port integer;
  v_smtp_username text;
  v_smtp_password text;
  v_smtp_from_email text;
  v_smtp_from_name text;
  v_smtp_use_ssl boolean;
  v_resend_enabled boolean;
  v_receipt_header_color text;
  v_receipt_accent_color text;
  v_receipt_title text;
  v_receipt_show_logo boolean;
  v_receipt_show_watermark boolean;
  v_receipt_watermark_text text;
  v_receipt_footer_disclaimer text;
  v_receipt_custom_message text;
  v_receipt_reference_prefix text;
  existing_record website_settings%ROWTYPE;
BEGIN
  -- Ensure there is a single settings row to update
  SELECT * INTO existing_record FROM website_settings ORDER BY created_at ASC LIMIT 1;
  IF existing_record.id IS NULL THEN
    INSERT INTO website_settings DEFAULT VALUES RETURNING * INTO existing_record;
  END IF;

  -- Extract values from JSON, using existing values as defaults
  v_bank_name := COALESCE(settings->>'bank_name', existing_record.bank_name);
  v_bank_address := COALESCE(settings->>'bank_address', existing_record.bank_address);
  v_bank_phone := COALESCE(settings->>'bank_phone', existing_record.bank_phone);
  v_support_email := COALESCE(settings->>'support_email', existing_record.support_email);

  v_logo_url := CASE WHEN settings ? 'logo_url' THEN settings->>'logo_url' ELSE existing_record.logo_url END;
  v_favicon_url := CASE WHEN settings ? 'favicon_url' THEN settings->>'favicon_url' ELSE existing_record.favicon_url END;
  v_footer_logo_url := CASE WHEN settings ? 'footer_logo_url' THEN settings->>'footer_logo_url' ELSE existing_record.footer_logo_url END;

  v_email_alerts := CASE WHEN settings ? 'email_alerts_enabled' THEN (settings->>'email_alerts_enabled')::boolean ELSE existing_record.email_alerts_enabled END;
  v_auth_emails := CASE WHEN settings ? 'auth_emails_enabled' THEN (settings->>'auth_emails_enabled')::boolean ELSE existing_record.auth_emails_enabled END;
  v_show_nav := CASE WHEN settings ? 'show_navigation_menu' THEN (settings->>'show_navigation_menu')::boolean ELSE existing_record.show_navigation_menu END;
  v_website_vis := CASE WHEN settings ? 'website_visibility' THEN (settings->>'website_visibility')::boolean ELSE existing_record.website_visibility END;
  v_show_kyc := CASE WHEN settings ? 'show_kyc_page' THEN (settings->>'show_kyc_page')::boolean ELSE existing_record.show_kyc_page END;

  -- SMTP Settings
  v_smtp_enabled := CASE WHEN settings ? 'smtp_enabled' THEN (settings->>'smtp_enabled')::boolean ELSE existing_record.smtp_enabled END;
  v_smtp_host := CASE WHEN settings ? 'smtp_host' THEN settings->>'smtp_host' ELSE existing_record.smtp_host END;
  v_smtp_port := CASE WHEN settings ? 'smtp_port' THEN (settings->>'smtp_port')::integer ELSE existing_record.smtp_port END;
  v_smtp_username := CASE WHEN settings ? 'smtp_username' THEN settings->>'smtp_username' ELSE existing_record.smtp_username END;
  v_smtp_password := CASE WHEN settings ? 'smtp_password' THEN settings->>'smtp_password' ELSE existing_record.smtp_password END;
  v_smtp_from_email := CASE WHEN settings ? 'smtp_from_email' THEN settings->>'smtp_from_email' ELSE existing_record.smtp_from_email END;
  v_smtp_from_name := CASE WHEN settings ? 'smtp_from_name' THEN settings->>'smtp_from_name' ELSE existing_record.smtp_from_name END;
  v_smtp_use_ssl := CASE WHEN settings ? 'smtp_use_ssl' THEN (settings->>'smtp_use_ssl')::boolean ELSE existing_record.smtp_use_ssl END;

  v_resend_enabled := CASE WHEN settings ? 'resend_enabled' THEN (settings->>'resend_enabled')::boolean ELSE existing_record.resend_enabled END;

  -- Receipt customization settings
  v_receipt_header_color := COALESCE(settings->>'receipt_header_color', existing_record.receipt_header_color, '#003366');
  v_receipt_accent_color := COALESCE(settings->>'receipt_accent_color', existing_record.receipt_accent_color, '#22c55e');
  v_receipt_title := COALESCE(settings->>'receipt_title', existing_record.receipt_title, 'Transfer Confirmation Receipt');
  v_receipt_show_logo := CASE WHEN settings ? 'receipt_show_logo' THEN (settings->>'receipt_show_logo')::boolean ELSE COALESCE(existing_record.receipt_show_logo, true) END;
  v_receipt_show_watermark := CASE WHEN settings ? 'receipt_show_watermark' THEN (settings->>'receipt_show_watermark')::boolean ELSE COALESCE(existing_record.receipt_show_watermark, false) END;
  v_receipt_watermark_text := COALESCE(settings->>'receipt_watermark_text', existing_record.receipt_watermark_text, 'COPY');
  v_receipt_footer_disclaimer := COALESCE(settings->>'receipt_footer_disclaimer', existing_record.receipt_footer_disclaimer, 'This is a computer-generated receipt and is valid without signature.');
  v_receipt_custom_message := CASE WHEN settings ? 'receipt_custom_message' THEN settings->>'receipt_custom_message' ELSE existing_record.receipt_custom_message END;
  v_receipt_reference_prefix := COALESCE(settings->>'receipt_reference_prefix', existing_record.receipt_reference_prefix, 'TXN');

  -- ENFORCE: At least one email provider must always be enabled
  IF v_smtp_enabled = FALSE AND v_resend_enabled = FALSE THEN
    v_resend_enabled := TRUE;
  END IF;

  -- Safe-update compatible: include a WHERE clause
  UPDATE website_settings SET
    bank_name = v_bank_name,
    bank_address = v_bank_address,
    bank_phone = v_bank_phone,
    support_email = v_support_email,
    logo_url = v_logo_url,
    favicon_url = v_favicon_url,
    footer_logo_url = v_footer_logo_url,
    email_alerts_enabled = v_email_alerts,
    auth_emails_enabled = v_auth_emails,
    show_navigation_menu = v_show_nav,
    website_visibility = v_website_vis,
    show_kyc_page = v_show_kyc,
    smtp_enabled = v_smtp_enabled,
    smtp_host = v_smtp_host,
    smtp_port = v_smtp_port,
    smtp_username = v_smtp_username,
    smtp_password = v_smtp_password,
    smtp_from_email = v_smtp_from_email,
    smtp_from_name = v_smtp_from_name,
    smtp_use_ssl = v_smtp_use_ssl,
    resend_enabled = v_resend_enabled,
    receipt_header_color = v_receipt_header_color,
    receipt_accent_color = v_receipt_accent_color,
    receipt_title = v_receipt_title,
    receipt_show_logo = v_receipt_show_logo,
    receipt_show_watermark = v_receipt_show_watermark,
    receipt_watermark_text = v_receipt_watermark_text,
    receipt_footer_disclaimer = v_receipt_footer_disclaimer,
    receipt_custom_message = v_receipt_custom_message,
    receipt_reference_prefix = v_receipt_reference_prefix,
    updated_at = now()
  WHERE id = existing_record.id;
END;
$$;

-- Wrapper to support callers that send JSON instead of JSONB
CREATE OR REPLACE FUNCTION public.update_website_settings(settings json)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.update_website_settings(settings::jsonb);
$$;

GRANT EXECUTE ON FUNCTION public.update_website_settings(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_website_settings(json) TO anon, authenticated;
