-- Fix generate_account_number function naming conflict
-- The issue was that the function name and local variable name caused PostgreSQL
-- to interpret "generate_account_number.account_number" as a table reference

CREATE OR REPLACE FUNCTION public.generate_account_number(account_type TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  random_suffix TEXT;
  new_account_number TEXT;  -- Renamed from account_number to avoid naming conflict
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
    new_account_number := prefix || '-000' || random_suffix;
    
    -- Check if account number already exists
    -- Fixed: Reference the local variable directly without function name prefix
    SELECT EXISTS(
      SELECT 1 FROM public.accounts WHERE account_number = new_account_number
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_account_number;
END;
$$;