-- Add security_code_hash column to account_applications for storing hashed security codes
ALTER TABLE public.account_applications ADD COLUMN IF NOT EXISTS security_code_hash text;

-- Add must_change_password flag to user_security for forcing password change on first login
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;