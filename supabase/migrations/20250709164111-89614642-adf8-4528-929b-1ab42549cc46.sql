-- Add address fields to profiles table for detailed user creation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS apt_suite TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS state_region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Create account number generation function
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  random_suffix TEXT;
BEGIN
  -- Set prefix based on account type
  CASE LOWER(account_type)
    WHEN 'checking' THEN prefix := 'CHK';
    WHEN 'savings' THEN prefix := 'SAV';
    WHEN 'premium checking' THEN prefix := 'PCK';
    WHEN 'premium savings' THEN prefix := 'PSV';
    WHEN 'high yield savings' THEN prefix := 'HYS';
    WHEN 'escrow account' THEN prefix := 'ESC';
    WHEN 'call account' THEN prefix := 'CAL';
    WHEN 'investment account' THEN prefix := 'INV';
    WHEN 'trust account' THEN prefix := 'TRU';
    ELSE prefix := 'CUS'; -- Custom
  END CASE;
  
  -- Generate random 8-character suffix
  random_suffix := SUBSTRING(gen_random_uuid()::text, 1, 8);
  
  RETURN prefix || '-' || UPPER(random_suffix);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy to allow admins to insert into profiles table
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

-- Add RLS policy to allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

-- Add support ticket status options
ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_ticket_status_check 
CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));