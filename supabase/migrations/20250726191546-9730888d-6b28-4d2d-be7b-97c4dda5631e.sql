-- Critical Security Fix 1: Add search_path restrictions to all database functions
-- This prevents privilege escalation attacks through function execution

-- Fix all functions to include SET search_path TO 'public'
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_type text, p_deposit_id uuid, p_status text, p_notes text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deposit_record RECORD;
  v_rows_affected INTEGER;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Handle check deposits
  IF p_deposit_type = 'check' THEN
    -- Get the check deposit record
    SELECT cd.*, a.balance as account_balance 
    INTO v_deposit_record
    FROM check_deposits cd
    JOIN accounts a ON cd.account_id = a.id
    WHERE cd.id = p_deposit_id;
    
    IF v_deposit_record.id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Check deposit not found');
    END IF;
    
    -- Update check deposit status
    UPDATE check_deposits 
    SET status = p_status, 
        admin_notes = p_notes,
        processed_at = NOW(),
        processed_by = auth.uid()
    WHERE id = p_deposit_id;
    
    -- If approved, update account balance and transaction
    IF p_status = 'approved' THEN
      -- Update account balance
      UPDATE accounts 
      SET balance = balance + v_deposit_record.amount,
          updated_at = NOW()
      WHERE id = v_deposit_record.account_id;
      
      -- Update the pending transaction to completed
      UPDATE transactions 
      SET status = 'completed',
          description = 'Check Deposit - Approved',
          updated_at = NOW()
      WHERE account_id = v_deposit_record.account_id 
        AND description LIKE 'Check Deposit - Pending%'
        AND amount = v_deposit_record.amount
        AND status = 'pending'
        AND created_at::date = v_deposit_record.created_at::date;
    END IF;
    
  -- Handle crypto deposits
  ELSIF p_deposit_type = 'crypto' THEN
    -- Get the crypto deposit record
    SELECT cd.*, a.balance as account_balance 
    INTO v_deposit_record
    FROM crypto_deposits cd
    JOIN accounts a ON cd.account_id = a.id
    WHERE cd.id = p_deposit_id;
    
    IF v_deposit_record.id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Crypto deposit not found');
    END IF;
    
    -- Update crypto deposit status
    UPDATE crypto_deposits 
    SET status = p_status, 
        admin_notes = p_notes,
        processed_at = NOW(),
        processed_by = auth.uid()
    WHERE id = p_deposit_id;
    
    -- If approved, update account balance and transaction
    IF p_status = 'approved' THEN
      -- Update account balance
      UPDATE accounts 
      SET balance = balance + v_deposit_record.amount,
          updated_at = NOW()
      WHERE id = v_deposit_record.account_id;
      
      -- Update the pending transaction to completed - using the exact reference pattern
      UPDATE transactions 
      SET status = 'completed',
          description = v_deposit_record.crypto_type || ' Crypto Deposit - Approved',
          updated_at = NOW()
      WHERE reference_number = 'CRY-PEN-' || SUBSTRING(v_deposit_record.id::text, 1, 8)
        AND status = 'pending'
        AND account_id = v_deposit_record.account_id;
        
      -- Check if any rows were updated and create new transaction if needed
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected = 0 THEN
        INSERT INTO transactions (
          account_id, 
          transaction_type, 
          amount, 
          description, 
          reference_number, 
          status
        ) VALUES (
          v_deposit_record.account_id,
          'deposit',
          v_deposit_record.amount,
          v_deposit_record.crypto_type || ' Crypto Deposit - Approved',
          'CRY-APP-' || SUBSTRING(v_deposit_record.id::text, 1, 8),
          'completed'
        );
      END IF;
    END IF;
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid deposit type');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Deposit status updated successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Failed to update deposit: ' || SQLERRM);
END;
$function$;

-- Fix admin_create_transaction function
CREATE OR REPLACE FUNCTION public.admin_create_transaction(p_account_id uuid, p_transaction_type text, p_amount numeric, p_description text, p_transaction_date timestamp with time zone DEFAULT now())
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_account accounts%ROWTYPE;
  v_transaction_id UUID;
  v_result JSON;
  v_reference_prefix TEXT;
  v_random_number TEXT;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  IF p_transaction_type NOT IN ('debit', 'credit') THEN
    RETURN json_build_object('success', false, 'error', 'Transaction type must be debit or credit');
  END IF;

  -- Get account details
  SELECT * INTO v_account FROM accounts WHERE id = p_account_id;
  
  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;
  
  -- Check account status
  IF v_account.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot process transactions on inactive accounts');
  END IF;
  
  -- For debit transactions, check sufficient balance
  IF p_transaction_type = 'debit' AND v_account.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance for debit transaction');
  END IF;
  
  -- Generate reference number with correct prefix based on transaction type
  IF p_transaction_type = 'credit' THEN
    v_reference_prefix := 'CRE';
  ELSE
    v_reference_prefix := 'DBT';
  END IF;
  
  v_random_number := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  
  -- Start transaction
  BEGIN
    -- Update account balance
    IF p_transaction_type = 'credit' THEN
      UPDATE accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_account_id;
    ELSE -- debit
      UPDATE accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_account_id;
    END IF;
    
    -- Create transaction record
    INSERT INTO transactions (
      account_id, 
      transaction_type, 
      amount, 
      description, 
      reference_number, 
      status,
      created_at
    )
    VALUES (
      p_account_id, 
      CASE 
        WHEN p_transaction_type = 'credit' THEN 'deposit'
        ELSE 'withdrawal'
      END,
      p_amount, 
      p_description,
      v_reference_prefix || '-' || v_random_number,
      'completed',
      p_transaction_date
    )
    RETURNING id INTO v_transaction_id;
    
    v_result := json_build_object(
      'success', true, 
      'transaction_id', v_transaction_id,
      'message', 'Transaction processed successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Transaction failed: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$function$;

-- Critical Security Fix 2: Prevent users from self-escalating roles
-- Add RLS policy to prevent users from updating their own role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (excluding role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from updating their own role
  (OLD.role = NEW.role OR get_current_user_role() = 'admin')
);

-- Critical Security Fix 3: Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.audit_log 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (true);