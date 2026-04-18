-- Seed initial data for existing mock users
-- Note: Users will need to sign up normally through the app, but we'll create their profile data and accounts

-- Insert initial profiles (these will be created when users sign up)
-- We'll use the trigger to handle profile creation, but let's prepare sample data

-- Create sample accounts and transactions for demonstration
-- User: john.doe@starbank.com (will be created when they sign up)
-- Admin: admin@starbank.com (will be created when they sign up)

-- Sample account data that will be linked to users once they sign up
-- We'll use a function to seed data after user creation

-- Create a function to seed user data after signup
CREATE OR REPLACE FUNCTION public.seed_user_data(user_id UUID, user_email TEXT)
RETURNS VOID AS $$
DECLARE
  checking_account_id UUID;
  savings_account_id UUID;
BEGIN
  -- Only seed for our demo users
  IF user_email IN ('john.doe@starbank.com', 'admin@starbank.com') THEN
    -- Create checking account
    INSERT INTO public.accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'checking', 'CHK-' || SUBSTRING(user_id::text, 1, 8), 4225.22, 'active')
    RETURNING id INTO checking_account_id;
    
    -- Create savings account  
    INSERT INTO public.accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'savings', 'SAV-' || SUBSTRING(user_id::text, 1, 8), 8234.56, 'active')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger to call our seeding function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    CASE 
      WHEN NEW.email = 'admin@starbank.com' THEN 'admin'
      ELSE 'user'
    END
  );
  
  -- Seed demo data for our mock users
  PERFORM public.seed_user_data(NEW.id, NEW.email);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);