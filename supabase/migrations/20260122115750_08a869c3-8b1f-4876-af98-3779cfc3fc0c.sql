-- Add missing auth_emails_enabled column first
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS auth_emails_enabled BOOLEAN DEFAULT true;

-- Drop the existing get_website_settings function to change return type
DROP FUNCTION IF EXISTS public.get_website_settings();

-- Recreate get_website_settings with auth_emails_enabled
CREATE OR REPLACE FUNCTION public.get_website_settings()
RETURNS TABLE (
  bank_name TEXT,
  bank_address TEXT,
  bank_phone TEXT,
  support_email TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  footer_logo_url TEXT,
  email_alerts_enabled BOOLEAN,
  auth_emails_enabled BOOLEAN,
  show_navigation_menu BOOLEAN,
  website_visibility BOOLEAN,
  show_kyc_page BOOLEAN,
  smtp_enabled BOOLEAN,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  smtp_use_ssl BOOLEAN,
  resend_enabled BOOLEAN,
  receipt_header_color TEXT,
  receipt_accent_color TEXT,
  receipt_title TEXT,
  receipt_show_logo BOOLEAN,
  receipt_show_watermark BOOLEAN,
  receipt_watermark_text TEXT,
  receipt_footer_disclaimer TEXT,
  receipt_custom_message TEXT,
  receipt_reference_prefix TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bank_name,
    bank_address,
    bank_phone,
    support_email,
    logo_url,
    favicon_url,
    footer_logo_url,
    email_alerts_enabled,
    auth_emails_enabled,
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
    resend_enabled,
    receipt_header_color,
    receipt_accent_color,
    receipt_title,
    receipt_show_logo,
    receipt_show_watermark,
    receipt_watermark_text,
    receipt_footer_disclaimer,
    receipt_custom_message,
    receipt_reference_prefix
  FROM website_settings
  LIMIT 1;
$$;

-- Update update_website_settings function with proper boolean handling
CREATE OR REPLACE FUNCTION public.update_website_settings(settings JSONB)
RETURNS SETOF public.website_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_alerts BOOLEAN;
  v_auth_emails BOOLEAN;
  v_smtp_enabled BOOLEAN;
  v_resend_enabled BOOLEAN;
  current_values RECORD;
BEGIN
  -- Get current values
  SELECT * INTO current_values FROM website_settings LIMIT 1;

  -- Handle email_alerts_enabled - check if explicitly passed
  IF settings ? 'email_alerts_enabled' THEN
    v_email_alerts := (settings->>'email_alerts_enabled')::BOOLEAN;
  ELSE
    v_email_alerts := current_values.email_alerts_enabled;
  END IF;

  -- Handle auth_emails_enabled - check if explicitly passed
  IF settings ? 'auth_emails_enabled' THEN
    v_auth_emails := (settings->>'auth_emails_enabled')::BOOLEAN;
  ELSE
    v_auth_emails := current_values.auth_emails_enabled;
  END IF;

  -- Handle smtp_enabled - check if explicitly passed
  IF settings ? 'smtp_enabled' THEN
    v_smtp_enabled := (settings->>'smtp_enabled')::BOOLEAN;
  ELSE
    v_smtp_enabled := current_values.smtp_enabled;
  END IF;

  -- Handle resend_enabled - check if explicitly passed
  IF settings ? 'resend_enabled' THEN
    v_resend_enabled := (settings->>'resend_enabled')::BOOLEAN;
  ELSE
    v_resend_enabled := current_values.resend_enabled;
  END IF;

  -- Business Rules:
  -- If BOTH email toggles are disabled, disable providers
  IF v_email_alerts = FALSE AND v_auth_emails = FALSE THEN
    v_smtp_enabled := FALSE;
    v_resend_enabled := FALSE;
  -- Mutual exclusivity for providers when explicitly enabling one
  ELSIF (settings ? 'smtp_enabled') AND v_smtp_enabled = TRUE THEN
    v_resend_enabled := FALSE;
  ELSIF (settings ? 'resend_enabled') AND v_resend_enabled = TRUE THEN
    v_smtp_enabled := FALSE;
  END IF;

  UPDATE public.website_settings SET
    bank_name = COALESCE(settings->>'bank_name', current_values.bank_name),
    bank_address = COALESCE(settings->>'bank_address', current_values.bank_address),
    bank_phone = COALESCE(settings->>'bank_phone', current_values.bank_phone),
    support_email = COALESCE(settings->>'support_email', current_values.support_email),
    logo_url = CASE WHEN settings ? 'logo_url' THEN settings->>'logo_url' ELSE current_values.logo_url END,
    favicon_url = CASE WHEN settings ? 'favicon_url' THEN settings->>'favicon_url' ELSE current_values.favicon_url END,
    footer_logo_url = CASE WHEN settings ? 'footer_logo_url' THEN settings->>'footer_logo_url' ELSE current_values.footer_logo_url END,
    email_alerts_enabled = v_email_alerts,
    auth_emails_enabled = v_auth_emails,
    show_navigation_menu = CASE 
      WHEN settings ? 'show_navigation_menu' THEN (settings->>'show_navigation_menu')::BOOLEAN 
      ELSE current_values.show_navigation_menu 
    END,
    website_visibility = CASE 
      WHEN settings ? 'website_visibility' THEN (settings->>'website_visibility')::BOOLEAN 
      ELSE current_values.website_visibility 
    END,
    show_kyc_page = CASE 
      WHEN settings ? 'show_kyc_page' THEN (settings->>'show_kyc_page')::BOOLEAN 
      ELSE current_values.show_kyc_page 
    END,
    smtp_enabled = v_smtp_enabled,
    smtp_host = CASE WHEN settings ? 'smtp_host' THEN settings->>'smtp_host' ELSE current_values.smtp_host END,
    smtp_port = CASE WHEN settings ? 'smtp_port' THEN (settings->>'smtp_port')::INTEGER ELSE current_values.smtp_port END,
    smtp_username = CASE WHEN settings ? 'smtp_username' THEN settings->>'smtp_username' ELSE current_values.smtp_username END,
    smtp_password = CASE WHEN settings ? 'smtp_password' THEN settings->>'smtp_password' ELSE current_values.smtp_password END,
    smtp_from_email = CASE WHEN settings ? 'smtp_from_email' THEN settings->>'smtp_from_email' ELSE current_values.smtp_from_email END,
    smtp_from_name = CASE WHEN settings ? 'smtp_from_name' THEN settings->>'smtp_from_name' ELSE current_values.smtp_from_name END,
    smtp_use_ssl = CASE 
      WHEN settings ? 'smtp_use_ssl' THEN (settings->>'smtp_use_ssl')::BOOLEAN 
      ELSE current_values.smtp_use_ssl 
    END,
    resend_enabled = v_resend_enabled,
    receipt_header_color = COALESCE(settings->>'receipt_header_color', current_values.receipt_header_color),
    receipt_accent_color = COALESCE(settings->>'receipt_accent_color', current_values.receipt_accent_color),
    receipt_title = COALESCE(settings->>'receipt_title', current_values.receipt_title),
    receipt_show_logo = CASE 
      WHEN settings ? 'receipt_show_logo' THEN (settings->>'receipt_show_logo')::BOOLEAN 
      ELSE current_values.receipt_show_logo 
    END,
    receipt_show_watermark = CASE 
      WHEN settings ? 'receipt_show_watermark' THEN (settings->>'receipt_show_watermark')::BOOLEAN 
      ELSE current_values.receipt_show_watermark 
    END,
    receipt_watermark_text = COALESCE(settings->>'receipt_watermark_text', current_values.receipt_watermark_text),
    receipt_footer_disclaimer = COALESCE(settings->>'receipt_footer_disclaimer', current_values.receipt_footer_disclaimer),
    receipt_custom_message = CASE WHEN settings ? 'receipt_custom_message' THEN settings->>'receipt_custom_message' ELSE current_values.receipt_custom_message END,
    receipt_reference_prefix = COALESCE(settings->>'receipt_reference_prefix', current_values.receipt_reference_prefix),
    updated_at = now()
  WHERE id = current_values.id;

  RETURN QUERY SELECT * FROM public.website_settings LIMIT 1;
END;
$$;

-- Ensure valid state: if both email toggles are false, providers must be false
UPDATE website_settings SET
  smtp_enabled = CASE 
    WHEN email_alerts_enabled = false AND auth_emails_enabled = false 
    THEN false ELSE smtp_enabled END,
  resend_enabled = CASE 
    WHEN email_alerts_enabled = false AND auth_emails_enabled = false 
    THEN false ELSE resend_enabled END;