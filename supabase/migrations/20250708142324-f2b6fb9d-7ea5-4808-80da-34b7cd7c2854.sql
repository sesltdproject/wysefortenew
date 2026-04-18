
-- Fix infinite recursion in profiles RLS policy by creating a security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop and recreate the problematic admin policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Create function to generate 10-digit account numbers
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  suffix TEXT;
  account_number TEXT;
  exists_check BOOLEAN;
BEGIN
  -- Set prefix based on account type
  CASE account_type
    WHEN 'checking' THEN prefix := '100301';
    WHEN 'savings' THEN prefix := '110220';
    ELSE prefix := '900000'; -- Default for custom accounts
  END CASE;
  
  -- Generate unique 4-digit suffix
  LOOP
    suffix := LPAD(floor(random() * 10000)::TEXT, 4, '0');
    account_number := prefix || suffix;
    
    -- Check if account number already exists
    SELECT EXISTS(
      SELECT 1 FROM public.accounts WHERE account_number = account_number
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN account_number;
END;
$$ LANGUAGE plpgsql;

-- Update John Doe's existing accounts with proper 10-digit format
UPDATE public.accounts 
SET account_number = public.generate_account_number('checking')
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'john.doe@starbank.com')
  AND account_type = 'checking';

UPDATE public.accounts 
SET account_number = public.generate_account_number('savings')
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'john.doe@starbank.com')
  AND account_type = 'savings';

-- Ensure all accounts have proper status
UPDATE public.accounts 
SET status = 'active'
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'john.doe@starbank.com');

-- Add RLS policies for account management by admins
CREATE POLICY "Admins can update account status" 
ON public.accounts 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');

-- Update the seed function to use proper account number generation
CREATE OR REPLACE FUNCTION public.seed_user_data(user_id uuid, user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  checking_account_id UUID;
  savings_account_id UUID;
  checking_account_num TEXT;
  savings_account_num TEXT;
BEGIN
  -- Only seed for our demo users
  IF user_email IN ('john.doe@starbank.com', 'admin@starbank.com') THEN
    -- Generate proper account numbers
    checking_account_num := public.generate_account_number('checking');
    savings_account_num := public.generate_account_number('savings');
    
    -- Create checking account
    INSERT INTO public.accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'checking', checking_account_num, 4225.22, 'active')
    RETURNING id INTO checking_account_id;
    
    -- Create savings account  
    INSERT INTO public.accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'savings', savings_account_num, 8234.56, 'active')
    RETURNING id INTO savings_account_id;
    
    -- Create sample transactions for checking account
    INSERT INTO public.transactions (account_id, transaction_type, amount, description, reference_number, status, created_at) VALUES
    (checking_account_id, 'deposit', 3500.00, 'Salary Deposit', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '1 day'),
    (checking_account_id, 'withdrawal', 129.99, 'Online Purchase - Amazon', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW()),
    (checking_account_id, 'withdrawal', 4.50, 'Coffee Shop', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '2 days'),
    (checking_account_id, 'withdrawal', 45.00, 'Gas Station', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '3 days'),
    (checking_account_id, 'withdrawal', 100.00, 'ATM Withdrawal', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '7 days');
    
    -- Create sample transactions for savings account
    INSERT INTO public.transactions (account_id, transaction_type, amount, description, reference_number, status, created_at) VALUES
    (savings_account_id, 'deposit', 500.00, 'Monthly Savings', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '1 day'),
    (savings_account_id, 'deposit', 1000.00, 'Bonus Deposit', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '15 days');
    
    -- Create sample KYC documents
    INSERT INTO public.kyc_documents (user_id, document_type, verification_status, uploaded_at) VALUES
    (user_id, 'passport', 'approved', NOW() - INTERVAL '30 days'),
    (user_id, 'utility_bill', 'pending', NOW() - INTERVAL '5 days');
    
    -- Create sample support ticket for regular user (not admin)
    IF user_email = 'john.doe@starbank.com' THEN
      INSERT INTO public.support_tickets (user_id, subject, message, status, priority, created_at) VALUES
      (user_id, 'Mobile App Login Issue', 'I am having trouble logging into the mobile banking app. Can you please help?', 'open', 'medium', NOW() - INTERVAL '2 days');
    END IF;
  END IF;
END;
$function$;
