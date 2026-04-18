-- Create account_statements table
CREATE TABLE IF NOT EXISTS public.account_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  total_credits NUMERIC NOT NULL DEFAULT 0,
  total_debits NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for account_statements
ALTER TABLE public.account_statements ENABLE ROW LEVEL SECURITY;

-- Create policies for account_statements
CREATE POLICY "Users can view own account statements"
  ON public.account_statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all account statements"
  ON public.account_statements FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage account statements"
  ON public.account_statements FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create transfers table (for internal transfers)
CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_account_id UUID NOT NULL,
  to_account_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for transfers
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for transfers
CREATE POLICY "Users can view own transfers"
  ON public.transfers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accounts 
      WHERE (accounts.id = transfers.from_account_id OR accounts.id = transfers.to_account_id) 
        AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transfers"
  ON public.transfers FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage transfers"
  ON public.transfers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create check_transfer_limit function
CREATE OR REPLACE FUNCTION public.check_transfer_limit(
  p_account_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'allowed', true,
    'message', 'Transfer allowed',
    'limit', 10000
  );
END;
$$;

-- Create process_external_transfer function
CREATE OR REPLACE FUNCTION public.process_external_transfer(
  p_from_account_id UUID,
  p_amount NUMERIC,
  p_recipient_name TEXT,
  p_recipient_account TEXT,
  p_recipient_bank TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id UUID;
  ref_number TEXT;
BEGIN
  -- Generate reference number
  ref_number := generate_reference_number();
  
  -- Deduct from source account
  UPDATE accounts
  SET balance = balance - p_amount
  WHERE id = p_from_account_id;
  
  -- Create transaction record
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    recipient_name,
    recipient_account,
    reference_number,
    completed_at
  ) VALUES (
    p_from_account_id,
    'transfer',
    -p_amount,
    COALESCE(p_description, 'External Transfer to ' || p_recipient_name),
    'completed',
    p_recipient_name,
    p_recipient_account,
    ref_number,
    now()
  )
  RETURNING id INTO new_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', new_transaction_id,
    'reference_number', ref_number
  );
END;
$$;

-- Create process_international_transfer function
CREATE OR REPLACE FUNCTION public.process_international_transfer(
  p_user_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_recipient_name TEXT,
  p_recipient_account TEXT,
  p_recipient_bank TEXT,
  p_recipient_country TEXT,
  p_currency TEXT,
  p_purpose TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_remittance_id UUID;
  ref_number TEXT;
BEGIN
  -- Generate reference number
  ref_number := 'INT' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  
  -- Create foreign remittance record
  INSERT INTO foreign_remittances (
    user_id,
    account_id,
    amount,
    recipient_name,
    recipient_account,
    recipient_bank,
    recipient_country,
    currency,
    purpose,
    reference_number,
    status
  ) VALUES (
    p_user_id,
    p_account_id,
    p_amount,
    p_recipient_name,
    p_recipient_account,
    p_recipient_bank,
    p_recipient_country,
    p_currency,
    p_purpose,
    ref_number,
    'pending'
  )
  RETURNING id INTO new_remittance_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'remittance_id', new_remittance_id,
    'reference_number', ref_number
  );
END;
$$;

-- Create generate_monthly_statement function
CREATE OR REPLACE FUNCTION public.generate_monthly_statement(
  p_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  statement_id UUID;
  period_start DATE;
  period_end DATE;
  opening_bal NUMERIC;
  closing_bal NUMERIC;
  total_cred NUMERIC;
  total_deb NUMERIC;
  account_user_id UUID;
BEGIN
  -- Get account user_id
  SELECT user_id INTO account_user_id FROM accounts WHERE id = p_account_id;
  
  -- Calculate period (current month)
  period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Get opening balance (account balance at start of month)
  SELECT COALESCE(balance, 0) INTO opening_bal FROM accounts WHERE id = p_account_id;
  
  -- Calculate totals
  SELECT 
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO total_cred, total_deb
  FROM transactions
  WHERE account_id = p_account_id
    AND DATE(created_at) BETWEEN period_start AND period_end;
  
  closing_bal := opening_bal;
  
  -- Create statement
  INSERT INTO account_statements (
    account_id,
    user_id,
    statement_period_start,
    statement_period_end,
    opening_balance,
    closing_balance,
    total_credits,
    total_debits
  ) VALUES (
    p_account_id,
    account_user_id,
    period_start,
    period_end,
    opening_bal,
    closing_bal,
    total_cred,
    total_deb
  )
  RETURNING id INTO statement_id;
  
  RETURN jsonb_build_object('success', true, 'statement_id', statement_id);
END;
$$;

-- Create generate_custom_statement function
CREATE OR REPLACE FUNCTION public.generate_custom_statement(
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  statement_id UUID;
  opening_bal NUMERIC;
  closing_bal NUMERIC;
  total_cred NUMERIC;
  total_deb NUMERIC;
  account_user_id UUID;
BEGIN
  -- Get account user_id
  SELECT user_id INTO account_user_id FROM accounts WHERE id = p_account_id;
  
  -- Get current balance
  SELECT COALESCE(balance, 0) INTO opening_bal FROM accounts WHERE id = p_account_id;
  
  -- Calculate totals
  SELECT 
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  INTO total_cred, total_deb
  FROM transactions
  WHERE account_id = p_account_id
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
  
  closing_bal := opening_bal;
  
  -- Create statement
  INSERT INTO account_statements (
    account_id,
    user_id,
    statement_period_start,
    statement_period_end,
    opening_balance,
    closing_balance,
    total_credits,
    total_debits
  ) VALUES (
    p_account_id,
    account_user_id,
    p_start_date,
    p_end_date,
    opening_bal,
    closing_bal,
    total_cred,
    total_deb
  )
  RETURNING id INTO statement_id;
  
  RETURN jsonb_build_object('success', true, 'statement_id', statement_id);
END;
$$;