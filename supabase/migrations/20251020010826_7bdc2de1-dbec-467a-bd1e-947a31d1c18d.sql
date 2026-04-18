-- Add email_alerts_enabled column to website_settings table
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN DEFAULT true;

-- Update the update_website_settings function to handle footer_logo_url and email_alerts_enabled
CREATE OR REPLACE FUNCTION public.update_website_settings(settings jsonb)
RETURNS SETOF website_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.website_settings
  SET
    bank_name = COALESCE((settings->>'bank_name')::TEXT, bank_name),
    bank_email = COALESCE((settings->>'bank_email')::TEXT, bank_email),
    bank_phone = COALESCE((settings->>'bank_phone')::TEXT, bank_phone),
    bank_address = COALESCE((settings->>'bank_address')::TEXT, bank_address),
    support_email = COALESCE((settings->>'support_email')::TEXT, support_email),
    logo_url = COALESCE((settings->>'logo_url')::TEXT, logo_url),
    favicon_url = COALESCE((settings->>'favicon_url')::TEXT, favicon_url),
    footer_logo_url = COALESCE((settings->>'footer_logo_url')::TEXT, footer_logo_url),
    email_alerts_enabled = COALESCE((settings->>'email_alerts_enabled')::BOOLEAN, email_alerts_enabled),
    primary_color = COALESCE((settings->>'primary_color')::TEXT, primary_color),
    secondary_color = COALESCE((settings->>'secondary_color')::TEXT, secondary_color),
    updated_at = now()
  WHERE id = (SELECT id FROM public.website_settings LIMIT 1);
  
  RETURN QUERY SELECT * FROM public.website_settings LIMIT 1;
END;
$function$;