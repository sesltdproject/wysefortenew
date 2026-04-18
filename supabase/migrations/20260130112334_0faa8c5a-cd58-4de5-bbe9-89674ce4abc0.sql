-- Update process_intrabank_transfer to also create transaction records
CREATE OR REPLACE FUNCTION process_intrabank_transfer(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_converted_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_from_currency TEXT;
  v_to_currency TEXT;
  v_reference_number TEXT;
  v_debit_reference TEXT;
  v_credit_reference TEXT;
  v_transfer_id UUID;
  v_from_user_id UUID;
  v_to_user_id UUID;
  v_from_account_number TEXT;
  v_to_account_number TEXT;
  v_recipient_name TEXT;
BEGIN
  -- Generate reference number
  v_reference_number := 'IBT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 8);
  v_debit_reference := v_reference_number || '-DEB';
  v_credit_reference := v_reference_number || '-CRE';
  
  -- Get source account details
  SELECT balance, currency, user_id, account_number
  INTO v_from_balance, v_from_currency, v_from_user_id, v_from_account_number
  FROM accounts
  WHERE id = p_from_account_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source account not found');
  END IF;
  
  -- Check sufficient balance
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Get destination account details
  SELECT balance, currency, user_id, account_number
  INTO v_to_balance, v_to_currency, v_to_user_id, v_to_account_number
  FROM accounts
  WHERE id = p_to_account_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination account not found');
  END IF;
  
  -- Get recipient name for transaction record
  SELECT full_name INTO v_recipient_name
  FROM profiles
  WHERE id = v_to_user_id;
  
  -- Update balances
  UPDATE accounts
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = p_from_account_id;
  
  UPDATE accounts
  SET balance = balance + p_converted_amount, updated_at = NOW()
  WHERE id = p_to_account_id;
  
  -- Create transfer record
  INSERT INTO transfers (
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
    COALESCE(p_description, 'Same Bank Transfer'),
    'completed',
    v_reference_number
  )
  RETURNING id INTO v_transfer_id;
  
  -- Create DEBIT transaction for source account
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    completed_at,
    reference_number,
    recipient_name,
    recipient_account
  ) VALUES (
    p_from_account_id,
    'withdrawal',
    -p_amount,
    (SELECT balance FROM accounts WHERE id = p_from_account_id),
    COALESCE(p_description, 'Same Bank Transfer to ' || COALESCE(v_recipient_name, 'Account')),
    'completed',
    NOW(),
    v_debit_reference,
    v_recipient_name,
    v_to_account_number
  );
  
  -- Create CREDIT transaction for destination account
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    completed_at,
    reference_number
  ) VALUES (
    p_to_account_id,
    'deposit',
    p_converted_amount,
    (SELECT balance FROM accounts WHERE id = p_to_account_id),
    COALESCE(p_description, 'Same Bank Transfer received'),
    'completed',
    NOW(),
    v_credit_reference
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number,
    'from_currency', v_from_currency,
    'to_currency', v_to_currency,
    'amount', p_amount,
    'converted_amount', p_converted_amount
  );
END;
$$;