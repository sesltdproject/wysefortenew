-- Update the update_website_settings function to include SMTP fields
CREATE OR REPLACE FUNCTION public.update_website_settings(settings JSONB)
RETURNS SETOF public.website_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.website_settings
  SET
    bank_name = COALESCE((settings->>'bank_name')::TEXT, bank_name),
    bank_email = COALESCE((settings->>'bank_email')::TEXT, bank_email),
    bank_phone = COALESCE((settings->>'bank_phone')::TEXT, bank_phone),
    bank_address = COALESCE((settings->>'bank_address')::TEXT, bank_address),
    support_email = COALESCE((settings->>'support_email')::TEXT, support_email),
    logo_url = CASE WHEN settings ? 'logo_url' THEN (settings->>'logo_url')::TEXT ELSE logo_url END,
    favicon_url = CASE WHEN settings ? 'favicon_url' THEN (settings->>'favicon_url')::TEXT ELSE favicon_url END,
    footer_logo_url = CASE WHEN settings ? 'footer_logo_url' THEN (settings->>'footer_logo_url')::TEXT ELSE footer_logo_url END,
    email_alerts_enabled = COALESCE((settings->>'email_alerts_enabled')::BOOLEAN, email_alerts_enabled),
    show_navigation_menu = COALESCE((settings->>'show_navigation_menu')::BOOLEAN, show_navigation_menu),
    website_visibility = COALESCE((settings->>'website_visibility')::BOOLEAN, website_visibility),
    show_kyc_page = COALESCE((settings->>'show_kyc_page')::BOOLEAN, show_kyc_page),
    primary_color = COALESCE((settings->>'primary_color')::TEXT, primary_color),
    secondary_color = COALESCE((settings->>'secondary_color')::TEXT, secondary_color),
    -- SMTP Settings
    smtp_enabled = COALESCE((settings->>'smtp_enabled')::BOOLEAN, smtp_enabled),
    smtp_host = CASE WHEN settings ? 'smtp_host' THEN (settings->>'smtp_host')::TEXT ELSE smtp_host END,
    smtp_port = COALESCE((settings->>'smtp_port')::INTEGER, smtp_port),
    smtp_username = CASE WHEN settings ? 'smtp_username' THEN (settings->>'smtp_username')::TEXT ELSE smtp_username END,
    smtp_password = CASE WHEN settings ? 'smtp_password' THEN (settings->>'smtp_password')::TEXT ELSE smtp_password END,
    smtp_from_email = CASE WHEN settings ? 'smtp_from_email' THEN (settings->>'smtp_from_email')::TEXT ELSE smtp_from_email END,
    smtp_from_name = CASE WHEN settings ? 'smtp_from_name' THEN (settings->>'smtp_from_name')::TEXT ELSE smtp_from_name END,
    smtp_use_ssl = COALESCE((settings->>'smtp_use_ssl')::BOOLEAN, smtp_use_ssl),
    updated_at = now()
  WHERE id = (SELECT id FROM public.website_settings LIMIT 1);
  
  RETURN QUERY SELECT * FROM public.website_settings LIMIT 1;
END;
$$;