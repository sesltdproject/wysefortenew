-- Add new account types to existing enum (safer approach - doesn't break views)
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'premium_checking';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'premium_savings';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'high_yield_savings';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'trust_account';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'escrow_account';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'investment_account';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'business_account';

-- Update generate_account_number function to accept account_type parameter
-- and generate proper format: XXX-000XXXXXXXXX
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  random_suffix TEXT;
  account_number TEXT;
  exists_check BOOLEAN;
BEGIN
  -- Map account type to 3-letter prefix
  CASE account_type
    WHEN 'checking' THEN prefix := 'CHK';
    WHEN 'savings' THEN prefix := 'SAV';
    WHEN 'premium checking', 'premium_checking' THEN prefix := 'PCK';
    WHEN 'premium savings', 'premium_savings' THEN prefix := 'PSV';
    WHEN 'high yield savings', 'high_yield_savings' THEN prefix := 'HYS';
    WHEN 'trust account', 'trust_account' THEN prefix := 'TST';
    WHEN 'escrow account', 'escrow_account' THEN prefix := 'ESC';
    WHEN 'investment account', 'investment_account' THEN prefix := 'INV';
    WHEN 'business account', 'business_account' THEN prefix := 'BUS';
    ELSE prefix := 'GEN'; -- Generic fallback
  END CASE;
  
  -- Generate unique account number in format: XXX-000XXXXXXXXX (16 chars)
  LOOP
    -- Generate 9-digit random number (000000000 to 999999999)
    random_suffix := LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
    account_number := prefix || '-000' || random_suffix;
    
    -- Check if account number already exists
    SELECT EXISTS(
      SELECT 1 FROM public.accounts WHERE accounts.account_number = generate_account_number.account_number
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN account_number;
END;
$$;