-- Update process_international_transfer to immediately debit the account
CREATE OR REPLACE FUNCTION public.process_international_transfer(
  p_user_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_recipient_name TEXT,
  p_recipient_account TEXT,
  p_bank_name TEXT,
  p_recipient_country TEXT,
  p_currency TEXT,
  p_purpose TEXT DEFAULT NULL,
  p_swift_code TEXT DEFAULT NULL,
  p_iban TEXT DEFAULT NULL,
  p_correspondent_bank TEXT DEFAULT NULL,
  p_bank_address TEXT DEFAULT NULL,
  p_recipient_address TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference_number TEXT;
  v_remittance_id UUID;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Validate and lock account
  SELECT balance INTO v_balance
  FROM public.accounts
  WHERE id = p_account_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Generate reference number
  v_reference_number := 'INT' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  
  -- DEBIT THE ACCOUNT IMMEDIATELY
  v_new_balance := v_balance - p_amount;
  
  UPDATE public.accounts
  SET balance = v_new_balance,
      updated_at = now()
  WHERE id = p_account_id;
  
  -- Create pending transaction record (as debit)
  INSERT INTO public.transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    recipient_name,
    recipient_account,
    reference_number,
    created_by
  ) VALUES (
    p_account_id,
    'transfer',
    p_amount,
    v_new_balance,
    'International Transfer to ' || p_recipient_name || ' (Pending Approval)',
    'pending',
    p_recipient_name,
    p_recipient_account,
    v_reference_number,
    p_user_id
  )
  RETURNING id INTO v_transaction_id;
  
  -- Create remittance record
  INSERT INTO public.foreign_remittances (
    user_id,
    account_id,
    from_account_id,
    amount,
    recipient_name,
    recipient_account,
    bank_name,
    recipient_country,
    currency,
    purpose_of_transfer,
    reference_number,
    swift_code,
    iban,
    correspondent_bank,
    bank_address,
    recipient_address,
    priority,
    status
  ) VALUES (
    p_user_id,
    p_account_id,
    p_account_id,
    p_amount,
    p_recipient_name,
    p_recipient_account,
    p_bank_name,
    p_recipient_country,
    p_currency,
    p_purpose,
    v_reference_number,
    p_swift_code,
    p_iban,
    p_correspondent_bank,
    p_bank_address,
    p_recipient_address,
    p_priority,
    'pending'
  )
  RETURNING id INTO v_remittance_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'remittance_id', v_remittance_id,
    'transaction_id', v_transaction_id,
    'reference_number', v_reference_number,
    'message', 'International transfer submitted - amount debited pending approval'
  );
END;
$$;

-- Update approve_foreign_remittance to handle rejection reversal
CREATE OR REPLACE FUNCTION public.approve_foreign_remittance(
  remittance_id UUID,
  approve BOOLEAN,
  notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remittance RECORD;
  v_new_balance NUMERIC;
  v_reversal_ref TEXT;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get remittance with lock
  SELECT * INTO v_remittance
  FROM public.foreign_remittances
  WHERE id = remittance_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remittance not found');
  END IF;
  
  IF v_remittance.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remittance already processed');
  END IF;
  
  IF approve THEN
    -- APPROVAL: Update remittance and transaction to completed
    -- Balance already debited during submission
    
    UPDATE public.foreign_remittances
    SET status = 'approved',
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        completed_at = now()
    WHERE id = remittance_id;
    
    -- Update the pending transaction to completed
    UPDATE public.transactions
    SET status = 'completed',
        completed_at = now(),
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        description = 'International Transfer to ' || v_remittance.recipient_name || ' (Completed)'
    WHERE reference_number = v_remittance.reference_number
      AND status = 'pending';
    
    -- Log admin activity
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (auth.uid(), 'international_transfer_approved', 
      'Approved international transfer of ' || v_remittance.amount || ' ' || v_remittance.currency || ' to ' || v_remittance.recipient_name
    );
    
    RETURN jsonb_build_object('success', true, 'message', 'Transfer approved successfully');
    
  ELSE
    -- REJECTION: Reverse the debit
    
    -- Credit the amount back to the account
    UPDATE public.accounts
    SET balance = balance + v_remittance.amount,
        updated_at = now()
    WHERE id = v_remittance.account_id
    RETURNING balance INTO v_new_balance;
    
    -- Update remittance status to rejected
    UPDATE public.foreign_remittances
    SET status = 'rejected',
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = remittance_id;
    
    -- Update original pending transaction to 'failed'
    UPDATE public.transactions
    SET status = 'failed',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        description = 'International Transfer to ' || v_remittance.recipient_name || ' (Rejected: ' || COALESCE(notes, 'No reason provided') || ')'
    WHERE reference_number = v_remittance.reference_number
      AND status = 'pending';
    
    -- Generate reversal reference
    v_reversal_ref := 'REV-' || v_remittance.reference_number;
    
    -- Create REVERSAL transaction record (credit)
    INSERT INTO public.transactions (
      account_id,
      transaction_type,
      amount,
      balance_after,
      description,
      status,
      reference_number,
      completed_at,
      reviewed_by,
      reviewed_at
    ) VALUES (
      v_remittance.account_id,
      'credit',
      v_remittance.amount,
      v_new_balance,
      'Reversal: International Transfer to ' || v_remittance.recipient_name || ' rejected - ' || COALESCE(notes, 'Transfer rejected by admin'),
      'completed',
      v_reversal_ref,
      now(),
      auth.uid(),
      now()
    );
    
    -- Log admin activity
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (auth.uid(), 'international_transfer_rejected', 
      'Rejected international transfer of ' || v_remittance.amount || ' ' || v_remittance.currency || ' to ' || v_remittance.recipient_name || '. Funds returned to customer. Reason: ' || COALESCE(notes, 'No reason provided')
    );
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Transfer rejected and funds returned to customer account'
    );
  END IF;
END;
$$;