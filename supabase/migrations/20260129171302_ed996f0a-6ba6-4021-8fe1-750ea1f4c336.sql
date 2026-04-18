-- Add super_admin_email column to website_settings to allow dynamic default admin email
ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS super_admin_email text DEFAULT 'superadmin@capinvbank.com';