-- Create next_of_kin table for user next-of-kin details
CREATE TABLE public.next_of_kin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_next_of_kin_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS on next_of_kin table
ALTER TABLE public.next_of_kin ENABLE ROW LEVEL SECURITY;

-- Create policies for next_of_kin
CREATE POLICY "Users can view their own next-of-kin" 
ON public.next_of_kin 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own next-of-kin" 
ON public.next_of_kin 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own next-of-kin" 
ON public.next_of_kin 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own next-of-kin" 
ON public.next_of_kin 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all next-of-kin" 
ON public.next_of_kin 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Create account_statements table
CREATE TABLE public.account_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0.00,
  closing_balance NUMERIC NOT NULL DEFAULT 0.00,
  total_deposits NUMERIC NOT NULL DEFAULT 0.00,
  total_withdrawals NUMERIC NOT NULL DEFAULT 0.00,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_statements_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_statements_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Enable RLS on account_statements table
ALTER TABLE public.account_statements ENABLE ROW LEVEL SECURITY;

-- Create policies for account_statements
CREATE POLICY "Users can view their own statements" 
ON public.account_statements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all statements" 
ON public.account_statements 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "System can insert statements" 
ON public.account_statements 
FOR INSERT 
WITH CHECK (true);

-- Create secure function for processing internal transfers
CREATE OR REPLACE FUNCTION public.process_internal_transfer(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Internal transfer'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_account accounts%ROWTYPE;
  v_to_account accounts%ROWTYPE;
  v_transfer_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;
  
  IF p_from_account_id = p_to_account_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot transfer to the same account');
  END IF;

  -- Get account details and verify ownership
  SELECT * INTO v_from_account FROM accounts WHERE id = p_from_account_id AND user_id = auth.uid();
  SELECT * INTO v_to_account FROM accounts WHERE id = p_to_account_id AND user_id = auth.uid();
  
  IF NOT FOUND OR v_from_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Source account not found or not owned by user');
  END IF;
  
  IF v_to_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Destination account not found or not owned by user');
  END IF;
  
  -- Check sufficient balance
  IF v_from_account.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Start transaction
  BEGIN
    -- Update account balances
    UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_account_id;
    UPDATE accounts SET balance = balance + p_amount WHERE id = p_to_account_id;
    
    -- Create transfer record
    INSERT INTO transfers (from_account_id, to_account_id, amount, description, status)
    VALUES (p_from_account_id, p_to_account_id, p_amount, p_description, 'completed')
    RETURNING id INTO v_transfer_id;
    
    -- Create transaction records
    INSERT INTO transactions (account_id, transaction_type, amount, description, status)
    VALUES 
      (p_from_account_id, 'transfer', p_amount, 'Transfer to ' || v_to_account.account_number, 'completed'),
      (p_to_account_id, 'deposit', p_amount, 'Transfer from ' || v_from_account.account_number, 'completed');
    
    v_result := json_build_object('success', true, 'transfer_id', v_transfer_id);
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Transfer failed: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$$;

-- Create secure function for processing bill payments
CREATE OR REPLACE FUNCTION public.process_bill_payment(
  p_from_account_id UUID,
  p_payee_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_payee payees%ROWTYPE;
  v_payment_id UUID;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  -- Get account and payee details
  SELECT * INTO v_account FROM accounts WHERE id = p_from_account_id AND user_id = auth.uid();
  SELECT * INTO v_payee FROM payees WHERE id = p_payee_id AND user_id = auth.uid();
  
  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found or not owned by user');
  END IF;
  
  IF v_payee.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Payee not found or not owned by user');
  END IF;
  
  -- Check sufficient balance
  IF v_account.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Start transaction
  BEGIN
    -- Update account balance
    UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_account_id;
    
    -- Create bill payment record
    INSERT INTO bill_payments (user_id, from_account_id, payee_id, amount, description, status)
    VALUES (auth.uid(), p_from_account_id, p_payee_id, p_amount, p_description, 'completed')
    RETURNING id INTO v_payment_id;
    
    -- Create transaction record
    INSERT INTO transactions (account_id, transaction_type, amount, description, status)
    VALUES (p_from_account_id, 'withdrawal', p_amount, 
            COALESCE(p_description, 'Bill payment to ' || v_payee.payee_name), 'completed');
    
    v_result := json_build_object('success', true, 'payment_id', v_payment_id);
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Payment failed: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$$;

-- Create secure function for processing external transfers
CREATE OR REPLACE FUNCTION public.process_external_transfer(
  p_from_account_id UUID,
  p_recipient_name TEXT,
  p_recipient_account TEXT,
  p_bank_name TEXT,
  p_routing_code TEXT,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  -- Get account details
  SELECT * INTO v_account FROM accounts WHERE id = p_from_account_id AND user_id = auth.uid();
  
  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found or not owned by user');
  END IF;
  
  -- Check sufficient balance
  IF v_account.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Start transaction
  BEGIN
    -- Update account balance
    UPDATE accounts SET balance = balance - p_amount WHERE id = p_from_account_id;
    
    -- Create transaction record
    INSERT INTO transactions (account_id, transaction_type, amount, description, recipient_name, recipient_account, status)
    VALUES (p_from_account_id, 'transfer', p_amount, 
            COALESCE(p_description, 'External transfer to ' || p_recipient_name), 
            p_recipient_name, p_recipient_account, 'completed');
    
    v_result := json_build_object('success', true, 'message', 'External transfer processed successfully');
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Transfer failed: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$$;

-- Create function to generate statements
CREATE OR REPLACE FUNCTION public.generate_monthly_statement(
  p_account_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_opening_balance NUMERIC := 0;
  v_closing_balance NUMERIC := 0;
  v_total_deposits NUMERIC := 0;
  v_total_withdrawals NUMERIC := 0;
  v_transaction_count INTEGER := 0;
  v_statement_id UUID;
BEGIN
  -- Get user_id and verify ownership
  SELECT user_id INTO v_user_id FROM accounts WHERE id = p_account_id AND user_id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;
  
  -- Calculate period dates
  v_period_start := DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01');
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Get opening balance (balance at start of period)
  SELECT COALESCE(balance, 0) INTO v_opening_balance 
  FROM accounts WHERE id = p_account_id;
  
  -- Calculate totals from transactions in the period
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'transfer') AND amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type IN ('withdrawal', 'transfer') AND amount < 0 THEN ABS(amount) ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_deposits, v_total_withdrawals, v_transaction_count
  FROM transactions 
  WHERE account_id = p_account_id 
    AND created_at::DATE BETWEEN v_period_start AND v_period_end;
  
  -- Calculate closing balance
  v_closing_balance := v_opening_balance + v_total_deposits - v_total_withdrawals;
  
  -- Insert or update statement
  INSERT INTO account_statements (
    user_id, account_id, statement_period_start, statement_period_end,
    opening_balance, closing_balance, total_deposits, total_withdrawals, transaction_count
  ) VALUES (
    v_user_id, p_account_id, v_period_start, v_period_end,
    v_opening_balance, v_closing_balance, v_total_deposits, v_total_withdrawals, v_transaction_count
  )
  ON CONFLICT (account_id, statement_period_start) DO UPDATE SET
    closing_balance = EXCLUDED.closing_balance,
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    transaction_count = EXCLUDED.transaction_count,
    updated_at = now()
  RETURNING id INTO v_statement_id;
  
  RETURN v_statement_id;
END;
$$;

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_next_of_kin_updated_at
  BEFORE UPDATE ON public.next_of_kin
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_account_statements_updated_at
  BEFORE UPDATE ON public.account_statements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();