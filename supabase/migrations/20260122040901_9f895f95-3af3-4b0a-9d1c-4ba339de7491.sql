-- Add columns to user_security table for tracking login IPs
ALTER TABLE public.user_security 
ADD COLUMN IF NOT EXISTS last_login_ip text,
ADD COLUMN IF NOT EXISTS previous_login_ip text,
ADD COLUMN IF NOT EXISTS previous_login_at timestamp with time zone;