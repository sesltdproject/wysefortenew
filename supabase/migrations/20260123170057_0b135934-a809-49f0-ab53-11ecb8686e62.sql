-- Update website_settings defaults to use Wyseforte Bank branding
UPDATE public.website_settings
SET 
  bank_name = CASE WHEN bank_name = 'Wyseforte Bank' THEN 'Wyseforte Bank' ELSE bank_name END,
  bank_email = CASE WHEN bank_email = 'support@capitalinvbank.com' THEN 'support@capitalinvbank.com' ELSE bank_email END,
  support_email = CASE WHEN support_email = 'support@capitalinvbank.com' THEN 'support@capitalinvbank.com' ELSE support_email END;

-- Alter default values for new records
ALTER TABLE public.website_settings 
  ALTER COLUMN bank_name SET DEFAULT 'Wyseforte Bank',
  ALTER COLUMN bank_email SET DEFAULT 'support@capitalinvbank.com';