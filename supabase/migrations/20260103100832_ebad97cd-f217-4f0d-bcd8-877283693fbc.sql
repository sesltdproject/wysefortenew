-- Add SMTP configuration fields to website_settings table
ALTER TABLE public.website_settings
ADD COLUMN smtp_enabled boolean DEFAULT false,
ADD COLUMN smtp_host text,
ADD COLUMN smtp_port integer DEFAULT 587,
ADD COLUMN smtp_username text,
ADD COLUMN smtp_password text,
ADD COLUMN smtp_from_email text,
ADD COLUMN smtp_from_name text,
ADD COLUMN smtp_use_ssl boolean DEFAULT true;