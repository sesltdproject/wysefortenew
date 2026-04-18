-- Add resend_enabled column to website_settings table
ALTER TABLE website_settings 
ADD COLUMN resend_enabled boolean DEFAULT true;