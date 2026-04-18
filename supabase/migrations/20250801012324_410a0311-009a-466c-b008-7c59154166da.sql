-- Drop existing functions that conflict
DROP FUNCTION IF EXISTS public.seed_user_data(uuid, text);

-- Function to update security code
CREATE OR REPLACE FUNCTION public.update_security_code(
  p_user_id UUID,
  p_security_code TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_security_record RECORD;
  v_hashed_code TEXT;
BEGIN
  -- Hash the security code
  v_hashed_code := extensions.crypt(p_security_code, extensions.gen_salt('bf'));
  
  -- Get or create security record
  SELECT * INTO v_security_record 
  FROM public.user_security 
  WHERE user_id = p_user_id;
  
  IF v_security_record.user_id IS NULL THEN
    INSERT INTO public.user_security (
      user_id, 
      security_code_hash, 
      security_code_enabled,
      security_code_created_at,
      security_code_updated_at
    ) 
    VALUES (
      p_user_id, 
      v_hashed_code, 
      true,
      NOW(),
      NOW()
    );
  ELSE
    UPDATE public.user_security 
    SET security_code_hash = v_hashed_code,
        security_code_enabled = true,
        security_code_updated_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Security code updated successfully');
END;
$$;

-- Function to seed demo user data
CREATE OR REPLACE FUNCTION public.seed_user_data(
  p_user_id UUID,
  p_email TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_checking_account_id UUID;
  v_savings_account_id UUID;
BEGIN
  -- Only seed data for demo users (non-admin users)
  IF p_email NOT LIKE '%admin%' AND p_email != 'admin@starbank.com' THEN
    
    -- Create checking account
    INSERT INTO public.accounts (
      user_id,
      account_type,
      account_number,
      balance,
      status
    ) VALUES (
      p_user_id,
      'checking',
      generate_account_number('checking'),
      FLOOR(RANDOM() * 10000 + 1000)::NUMERIC,
      'active'
    ) RETURNING id INTO v_checking_account_id;
    
    -- Create savings account
    INSERT INTO public.accounts (
      user_id,
      account_type,
      account_number,
      balance,
      status
    ) VALUES (
      p_user_id,
      'savings',
      generate_account_number('savings'),
      FLOOR(RANDOM() * 25000 + 5000)::NUMERIC,
      'active'
    ) RETURNING id INTO v_savings_account_id;
    
    -- Create some sample transactions for checking account
    INSERT INTO public.transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      status,
      created_at
    ) VALUES 
    (
      v_checking_account_id,
      'deposit',
      2500.00,
      'Initial deposit',
      'DEP-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
      'completed',
      NOW() - INTERVAL '7 days'
    ),
    (
      v_checking_account_id,
      'withdrawal',
      50.00,
      'ATM withdrawal',
      'ATM-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
      'completed',
      NOW() - INTERVAL '3 days'
    ),
    (
      v_checking_account_id,
      'deposit',
      1200.00,
      'Payroll deposit',
      'PAY-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
      'completed',
      NOW() - INTERVAL '1 day'
    );
    
    -- Create some sample transactions for savings account
    INSERT INTO public.transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      status,
      created_at
    ) VALUES 
    (
      v_savings_account_id,
      'deposit',
      10000.00,
      'Initial savings deposit',
      'SAV-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
      'completed',
      NOW() - INTERVAL '14 days'
    ),
    (
      v_savings_account_id,
      'deposit',
      25.50,
      'Interest payment',
      'INT-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
      'completed',
      NOW() - INTERVAL '1 day'
    );
    
  END IF;
END;
$$;