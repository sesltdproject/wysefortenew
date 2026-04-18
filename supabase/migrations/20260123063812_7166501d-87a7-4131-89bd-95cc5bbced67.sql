-- Fix 1: Store transaction amount as negative (debit) in process_international_transfer
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
  
  -- Create pending transaction record (as debit - NEGATIVE AMOUNT)
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
    -p_amount,  -- FIX: Store as negative to indicate debit
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