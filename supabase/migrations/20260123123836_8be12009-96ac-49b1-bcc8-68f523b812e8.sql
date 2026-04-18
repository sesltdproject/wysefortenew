-- Add missing columns to transactions table for bank details
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS routing_code TEXT;

-- Update process_external_transfer to immediately debit and store bank details
CREATE OR REPLACE FUNCTION public.process_external_transfer(
  p_from_account_id uuid,
  p_amount numeric,
  p_recipient_name text,
  p_recipient_account text,
  p_recipient_bank text,
  p_routing_code text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id UUID;
  ref_number TEXT;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Input validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;
  
  IF p_amount > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount exceeds maximum transfer limit');
  END IF;
  
  IF p_amount::TEXT ~ '\.\d{3,}' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must have at most 2 decimal places');
  END IF;
  
  -- Generate reference number
  ref_number := generate_reference_number();
  
  -- Check balance and lock row
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
  
  -- Calculate new balance
  v_new_balance := v_balance - p_amount;
  
  -- IMMEDIATELY DEBIT the account (pending admin approval)
  UPDATE accounts
  SET balance = v_new_balance,
      updated_at = now()
  WHERE id = p_from_account_id;
  
  -- Create transaction record with PENDING status including bank details
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    recipient_name,
    recipient_account,
    bank_name,
    routing_code,
    reference_number,
    created_by
  ) VALUES (
    p_from_account_id,
    'transfer',
    -p_amount,
    v_new_balance,
    COALESCE(p_description, 'External Transfer to ' || p_recipient_name),
    'pending',
    p_recipient_name,
    p_recipient_account,
    p_recipient_bank,
    p_routing_code,
    ref_number,
    auth.uid()
  )
  RETURNING id INTO new_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', new_transaction_id,
    'reference_number', ref_number,
    'message', 'Transfer submitted for admin approval. Funds have been debited pending approval.'
  );
END;
$$;

-- Update approve_external_transfer to reverse debit on rejection
CREATE OR REPLACE FUNCTION public.approve_external_transfer(
  p_transaction_id uuid,
  p_approve boolean,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
  v_new_balance NUMERIC;
BEGIN
  -- Get the transaction
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  
  IF v_transaction IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_transaction.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction is not pending');
  END IF;
  
  IF p_approve THEN
    -- Approve the transfer - just update status (funds already debited)
    UPDATE transactions
    SET 
      status = 'completed',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      completed_at = now(),
      description = CASE 
        WHEN p_admin_notes IS NOT NULL THEN description || ' (Approved: ' || p_admin_notes || ')'
        ELSE description
      END
    WHERE id = p_transaction_id;
    
    -- Log admin activity
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (auth.uid(), 'approved_external_transfer', 
      'Approved external transfer ' || v_transaction.reference_number || ' for amount ' || ABS(v_transaction.amount));
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Transfer approved successfully'
    );
  ELSE
    -- Reject the transfer - REVERSE THE DEBIT
    
    -- Credit the amount back to the account
    UPDATE accounts
    SET balance = balance + ABS(v_transaction.amount),
        updated_at = now()
    WHERE id = v_transaction.account_id
    RETURNING balance INTO v_new_balance;
    
    -- Update original transaction to failed
    UPDATE transactions
    SET 
      status = 'failed',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      description = description || ' (Rejected: ' || COALESCE(p_admin_notes, 'by admin') || ')'
    WHERE id = p_transaction_id;
    
    -- Create reversal deposit transaction for audit trail
    INSERT INTO transactions (
      account_id,
      transaction_type,
      amount,
      balance_after,
      description,
      status,
      reference_number,
      created_by
    ) VALUES (
      v_transaction.account_id,
      'deposit',
      ABS(v_transaction.amount),
      v_new_balance,
      'Reversal: External transfer rejected - ' || COALESCE(p_admin_notes, 'by admin'),
      'completed',
      'REV-' || v_transaction.reference_number,
      auth.uid()
    );
    
    -- Log admin activity
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (auth.uid(), 'rejected_external_transfer', 
      'Rejected external transfer ' || v_transaction.reference_number || ' for amount ' || ABS(v_transaction.amount) || '. Funds reversed.');
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Transfer rejected and funds reversed to account'
    );
  END IF;
END;
$$;