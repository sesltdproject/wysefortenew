
-- Add missing columns to website_settings
ALTER TABLE public.website_settings
  ADD COLUMN IF NOT EXISTS login_alerts_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS login_alert_email text;

-- Drop and recreate the JSON-overload update_website_settings to include login alert fields
DROP FUNCTION IF EXISTS public.update_website_settings(json);

CREATE OR REPLACE FUNCTION public.update_website_settings(settings json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s jsonb := settings::jsonb;

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

  -- SMTP
  v_smtp_enabled boolean;
  v_smtp_host text;
  v_smtp_port integer;
  v_smtp_username text;
  v_smtp_password text;
  v_smtp_from_email text;
  v_smtp_from_name text;
  v_smtp_use_ssl boolean;

  -- Resend
  v_resend_enabled boolean;

  -- Receipt
  v_receipt_header_color text;
  v_receipt_accent_color text;
  v_receipt_title text;
  v_receipt_show_logo boolean;
  v_receipt_show_watermark boolean;
  v_receipt_watermark_text text;
  v_receipt_footer_disclaimer text;
  v_receipt_custom_message text;
  v_receipt_reference_prefix text;

  -- Login Alerts
  v_login_alerts_enabled boolean;
  v_login_alert_email text;

  existing_record website_settings%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT * INTO existing_record FROM website_settings ORDER BY created_at ASC LIMIT 1;
  IF existing_record.id IS NULL THEN
    INSERT INTO website_settings DEFAULT VALUES RETURNING * INTO existing_record;
  END IF;

  v_bank_name := COALESCE(s->>'bank_name', existing_record.bank_name);
  v_bank_address := COALESCE(s->>'bank_address', existing_record.bank_address);
  v_bank_phone := COALESCE(s->>'bank_phone', existing_record.bank_phone);
  v_support_email := COALESCE(s->>'support_email', existing_record.support_email);

  v_logo_url := CASE WHEN s ? 'logo_url' THEN s->>'logo_url' ELSE existing_record.logo_url END;
  v_favicon_url := CASE WHEN s ? 'favicon_url' THEN s->>'favicon_url' ELSE existing_record.favicon_url END;
  v_footer_logo_url := CASE WHEN s ? 'footer_logo_url' THEN s->>'footer_logo_url' ELSE existing_record.footer_logo_url END;

  v_email_alerts := CASE WHEN s ? 'email_alerts_enabled' THEN (s->>'email_alerts_enabled')::boolean ELSE existing_record.email_alerts_enabled END;
  v_auth_emails := CASE WHEN s ? 'auth_emails_enabled' THEN (s->>'auth_emails_enabled')::boolean ELSE existing_record.auth_emails_enabled END;
  v_show_nav := CASE WHEN s ? 'show_navigation_menu' THEN (s->>'show_navigation_menu')::boolean ELSE existing_record.show_navigation_menu END;
  v_website_vis := CASE WHEN s ? 'website_visibility' THEN (s->>'website_visibility')::boolean ELSE existing_record.website_visibility END;
  v_show_kyc := CASE WHEN s ? 'show_kyc_page' THEN (s->>'show_kyc_page')::boolean ELSE existing_record.show_kyc_page END;

  v_smtp_enabled := CASE WHEN s ? 'smtp_enabled' THEN (s->>'smtp_enabled')::boolean ELSE existing_record.smtp_enabled END;
  v_smtp_host := CASE WHEN s ? 'smtp_host' THEN s->>'smtp_host' ELSE existing_record.smtp_host END;
  v_smtp_port := CASE WHEN s ? 'smtp_port' THEN (s->>'smtp_port')::integer ELSE existing_record.smtp_port END;
  v_smtp_username := CASE WHEN s ? 'smtp_username' THEN s->>'smtp_username' ELSE existing_record.smtp_username END;
  v_smtp_password := CASE WHEN s ? 'smtp_password' THEN s->>'smtp_password' ELSE existing_record.smtp_password END;
  v_smtp_from_email := CASE WHEN s ? 'smtp_from_email' THEN s->>'smtp_from_email' ELSE existing_record.smtp_from_email END;
  v_smtp_from_name := CASE WHEN s ? 'smtp_from_name' THEN s->>'smtp_from_name' ELSE existing_record.smtp_from_name END;
  v_smtp_use_ssl := CASE WHEN s ? 'smtp_use_ssl' THEN (s->>'smtp_use_ssl')::boolean ELSE existing_record.smtp_use_ssl END;

  v_resend_enabled := CASE WHEN s ? 'resend_enabled' THEN (s->>'resend_enabled')::boolean ELSE existing_record.resend_enabled END;

  v_receipt_header_color := CASE WHEN s ? 'receipt_header_color' THEN s->>'receipt_header_color' ELSE existing_record.receipt_header_color END;
  v_receipt_accent_color := CASE WHEN s ? 'receipt_accent_color' THEN s->>'receipt_accent_color' ELSE existing_record.receipt_accent_color END;
  v_receipt_title := CASE WHEN s ? 'receipt_title' THEN s->>'receipt_title' ELSE existing_record.receipt_title END;
  v_receipt_show_logo := CASE WHEN s ? 'receipt_show_logo' THEN (s->>'receipt_show_logo')::boolean ELSE existing_record.receipt_show_logo END;
  v_receipt_show_watermark := CASE WHEN s ? 'receipt_show_watermark' THEN (s->>'receipt_show_watermark')::boolean ELSE existing_record.receipt_show_watermark END;
  v_receipt_watermark_text := CASE WHEN s ? 'receipt_watermark_text' THEN s->>'receipt_watermark_text' ELSE existing_record.receipt_watermark_text END;
  v_receipt_footer_disclaimer := CASE WHEN s ? 'receipt_footer_disclaimer' THEN s->>'receipt_footer_disclaimer' ELSE existing_record.receipt_footer_disclaimer END;
  v_receipt_custom_message := CASE WHEN s ? 'receipt_custom_message' THEN s->>'receipt_custom_message' ELSE existing_record.receipt_custom_message END;
  v_receipt_reference_prefix := CASE WHEN s ? 'receipt_reference_prefix' THEN s->>'receipt_reference_prefix' ELSE existing_record.receipt_reference_prefix END;

  -- Login Alert fields
  v_login_alerts_enabled := CASE WHEN s ? 'login_alerts_enabled' THEN (s->>'login_alerts_enabled')::boolean ELSE existing_record.login_alerts_enabled END;
  v_login_alert_email := CASE WHEN s ? 'login_alert_email' THEN s->>'login_alert_email' ELSE existing_record.login_alert_email END;

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
    login_alerts_enabled = v_login_alerts_enabled,
    login_alert_email = v_login_alert_email,
    updated_at = now()
  WHERE id = existing_record.id;

  RETURN json_build_object('success', true, 'message', 'Settings updated successfully');
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'update_website_settings error: % %', SQLSTATE, SQLERRM;
  RETURN json_build_object('success', false, 'error', 'Failed to update settings. Please try again.');
END;
$$;
