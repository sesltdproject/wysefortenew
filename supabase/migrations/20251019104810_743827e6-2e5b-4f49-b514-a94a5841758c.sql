-- Add review columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Modify process_external_transfer to create pending transfers
CREATE OR REPLACE FUNCTION public.process_external_transfer(
  p_from_account_id uuid,
  p_amount numeric,
  p_recipient_name text,
  p_recipient_account text,
  p_recipient_bank text,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Create transaction record with PENDING status (admin approval required)
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    recipient_name,
    recipient_account,
    reference_number,
    created_by
  ) VALUES (
    p_from_account_id,
    'transfer',
    -p_amount,
    COALESCE(p_description, 'External Transfer to ' || p_recipient_name),
    'pending',
    p_recipient_name,
    p_recipient_account,
    ref_number,
    auth.uid()
  )
  RETURNING id INTO new_transaction_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', new_transaction_id,
    'reference_number', ref_number,
    'message', 'Transfer submitted for admin approval'
  );
END;
$function$;

-- Create function to approve/reject external transfers
CREATE OR REPLACE FUNCTION public.approve_external_transfer(
  p_transaction_id uuid,
  p_approve boolean,
  p_admin_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction RECORD;
  v_balance NUMERIC;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get transaction details with row lock
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  IF v_transaction.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction has already been processed');
  END IF;
  
  IF p_approve THEN
    -- Check balance again before approval
    SELECT balance INTO v_balance
    FROM accounts
    WHERE id = v_transaction.account_id
    FOR UPDATE;
    
    IF v_balance < ABS(v_transaction.amount) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for approval');
    END IF;
    
    -- Deduct from account balance
    UPDATE accounts
    SET balance = balance + v_transaction.amount, -- amount is already negative
        updated_at = now()
    WHERE id = v_transaction.account_id;
    
    -- Update transaction to completed
    UPDATE transactions
    SET 
      status = 'completed',
      completed_at = now(),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      description = CASE 
        WHEN p_admin_notes IS NOT NULL 
        THEN description || ' (Admin notes: ' || p_admin_notes || ')'
        ELSE description
      END
    WHERE id = p_transaction_id;
    
    -- Log admin activity
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (
      auth.uid(),
      'external_transfer_approved',
      jsonb_build_object(
        'transaction_id', p_transaction_id,
        'reference_number', v_transaction.reference_number,
        'amount', v_transaction.amount,
        'recipient', v_transaction.recipient_name
      )::text
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'External transfer approved and processed successfully'
    );
  ELSE
    -- Reject the transfer
    UPDATE transactions
    SET 
      status = 'failed',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      description = CASE 
        WHEN p_admin_notes IS NOT NULL 
        THEN description || ' (Rejected: ' || p_admin_notes || ')'
        ELSE description || ' (Rejected by admin)'
      END
    WHERE id = p_transaction_id;
    
    -- Log admin activity
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (
      auth.uid(),
      'external_transfer_rejected',
      jsonb_build_object(
        'transaction_id', p_transaction_id,
        'reference_number', v_transaction.reference_number,
        'amount', v_transaction.amount,
        'recipient', v_transaction.recipient_name,
        'reason', p_admin_notes
      )::text
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'External transfer rejected successfully'
    );
  END IF;
END;
$function$;