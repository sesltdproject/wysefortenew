-- Fix Critical Security Issues: Role Storage & Transfer Validation

-- ========================================
-- 1. FIX ROLE STORAGE VULNERABILITY
-- ========================================

-- Update get_current_user_role to read from user_roles table instead of profiles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT 
LANGUAGE SQL 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Remove the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- ========================================
-- 2. FIX TRANSFER AMOUNT VALIDATION
-- ========================================

-- Update process_internal_transfer with comprehensive validation
CREATE OR REPLACE FUNCTION public.process_internal_transfer(
  p_from_account_id uuid, 
  p_to_account_id uuid, 
  p_amount numeric, 
  p_description text DEFAULT 'Internal transfer'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_from_account_user_id UUID;
  v_to_account_user_id UUID;
  v_from_balance NUMERIC;
  v_from_account_type TEXT;
  v_from_account_number TEXT;
  v_to_account_type TEXT;
  v_to_account_number TEXT;
  v_transfer_id UUID;
  v_reference_number TEXT;
  v_debit_ref TEXT;
  v_credit_ref TEXT;
  v_debit_description TEXT;
  v_credit_description TEXT;
BEGIN
  -- Input validation: positive amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;
  
  -- Input validation: maximum amount (1 million)
  IF p_amount > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds maximum transfer limit of $1,000,000');
  END IF;
  
  -- Input validation: decimal precision (max 2 decimal places)
  IF p_amount::TEXT ~ '\.\d{3,}' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must have at most 2 decimal places');
  END IF;
  
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify both accounts belong to the user and get account details with row lock
  SELECT user_id, balance, account_type, account_number 
  INTO v_from_account_user_id, v_from_balance, v_from_account_type, v_from_account_number
  FROM public.accounts
  WHERE id = p_from_account_id
  FOR UPDATE; -- Lock row to prevent race conditions
  
  IF v_from_account_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source account not found');
  END IF;
  
  IF v_from_account_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Source account does not belong to user');
  END IF;
  
  SELECT user_id, account_type, account_number 
  INTO v_to_account_user_id, v_to_account_type, v_to_account_number
  FROM public.accounts
  WHERE id = p_to_account_id
  FOR UPDATE; -- Lock row to prevent race conditions
  
  IF v_to_account_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination account not found');
  END IF;
  
  IF v_to_account_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Destination account does not belong to user');
  END IF;
  
  -- Check sufficient balance after locking
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Generate three unique reference numbers
  v_reference_number := 'INT' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  v_debit_ref := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  v_credit_ref := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  
  -- Generate shorter, direction-specific descriptions
  v_debit_description := 'Internal Transfer (Debit) - From ' || INITCAP(v_from_account_type) || ' (' || v_from_account_number || ')';
  v_credit_description := 'Internal Transfer (Credit) - To ' || INITCAP(v_to_account_type) || ' (' || v_to_account_number || ')';
  
  -- Deduct from source account
  UPDATE public.accounts
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_from_account_id;
  
  -- Add to destination account
  UPDATE public.accounts
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = p_to_account_id;
  
  -- Create transfer record
  INSERT INTO public.transfers (
    from_account_id,
    to_account_id,
    amount,
    description,
    status,
    reference_number
  ) VALUES (
    p_from_account_id,
    p_to_account_id,
    p_amount,
    p_description,
    'completed',
    v_reference_number
  )
  RETURNING id INTO v_transfer_id;
  
  -- Create transaction record for source account (debit)
  INSERT INTO public.transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    reference_number,
    completed_at
  ) VALUES (
    p_from_account_id,
    'transfer',
    -p_amount,
    v_debit_description,
    'completed',
    v_debit_ref,
    NOW()
  );
  
  -- Create transaction record for destination account (credit)
  INSERT INTO public.transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    reference_number,
    completed_at
  ) VALUES (
    p_to_account_id,
    'transfer',
    p_amount,
    v_credit_description,
    'completed',
    v_credit_ref,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number
  );
END;
$function$;

-- Update process_external_transfer with comprehensive validation
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
  v_balance NUMERIC;
BEGIN
  -- Input validation: positive amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;
  
  -- Input validation: maximum amount (1 million)
  IF p_amount > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds maximum transfer limit of $1,000,000');
  END IF;
  
  -- Input validation: decimal precision (max 2 decimal places)
  IF p_amount::TEXT ~ '\.\d{3,}' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must have at most 2 decimal places');
  END IF;
  
  -- Generate reference number
  ref_number := generate_reference_number();
  
  -- Check balance and lock row to prevent race conditions
  SELECT balance INTO v_balance
  FROM accounts
  WHERE id = p_from_account_id
  FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
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

-- Update process_international_transfer with comprehensive validation
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
  -- Input validation: positive amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;
  
  -- Input validation: maximum amount (1 million)
  IF p_amount > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds maximum transfer limit of $1,000,000');
  END IF;
  
  -- Input validation: decimal precision (max 2 decimal places)
  IF p_amount::TEXT ~ '\.\d{3,}' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must have at most 2 decimal places');
  END IF;
  
  -- Generate reference number
  ref_number := 'INT' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  
  -- Create foreign remittance record (pending admin approval)
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

-- Update admin_create_transaction with validation
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_account_id uuid, 
  p_transaction_type transaction_type, 
  p_amount numeric, 
  p_description text DEFAULT NULL::text, 
  p_status transaction_status DEFAULT 'completed'::transaction_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_transaction_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Input validation: amount cannot be zero
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be zero');
  END IF;
  
  -- Input validation: decimal precision (max 2 decimal places)
  IF p_amount::TEXT ~ '\.\d{3,}' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must have at most 2 decimal places');
  END IF;
  
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    completed_at,
    created_by
  ) VALUES (
    p_account_id,
    p_transaction_type,
    p_amount,
    p_description,
    p_status,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
    auth.uid()
  )
  RETURNING id INTO new_transaction_id;
  
  IF p_status = 'completed' THEN
    UPDATE accounts 
    SET balance = balance + p_amount 
    WHERE id = p_account_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', new_transaction_id);
END;
$function$;

-- ========================================
-- 3. FIX ADMIN ACTIVITIES AUDIT LOG
-- ========================================

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can log activities" ON public.admin_activities;

-- Create new policy with proper admin_id check
CREATE POLICY "Admins can log own activities"
ON public.admin_activities 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND admin_id = auth.uid()
);

-- Add set search_path to security definer functions missing it
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      SELECT 1 FROM public.accounts WHERE accounts.account_number = generate_account_number.account_number
    ) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN account_number;
END;
$$;