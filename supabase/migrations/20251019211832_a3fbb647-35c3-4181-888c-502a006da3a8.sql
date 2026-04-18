-- Add footer_logo_url column to website_settings table
ALTER TABLE public.website_settings 
ADD COLUMN footer_logo_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.website_settings.footer_logo_url IS 'URL for the logo displayed in the footer section (separate from header logo)';