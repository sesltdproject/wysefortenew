-- Add 'call_account' to account_type enum
ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'call_account';

-- Add currency column to account_applications table
ALTER TABLE public.account_applications 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';