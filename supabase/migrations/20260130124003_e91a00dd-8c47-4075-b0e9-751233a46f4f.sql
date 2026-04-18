-- Update process_intrabank_transfer to return additional fields for email notifications
DROP FUNCTION IF EXISTS public.process_intrabank_transfer(uuid,uuid,numeric,numeric,text);

CREATE OR REPLACE FUNCTION public.process_intrabank_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_converted_amount numeric,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance numeric;
  v_to_balance numeric;
  v_from_user_id uuid;
  v_to_user_id uuid;
  v_from_currency text;
  v_to_currency text;
  v_transfer_id uuid;
  v_reference_number text;
  v_caller_id uuid;
  v_recipient_name text;
  v_recipient_account text;
  v_sender_name text;
  v_sender_account text;
BEGIN
  -- Authorization check: ensure caller is authenticated
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Lock both accounts for update (order by id to prevent deadlocks)
  IF p_from_account_id < p_to_account_id THEN
    SELECT balance, user_id, currency INTO v_from_balance, v_from_user_id, v_from_currency 
    FROM accounts WHERE id = p_from_account_id FOR UPDATE;
    
    SELECT balance, user_id, currency INTO v_to_balance, v_to_user_id, v_to_currency 
    FROM accounts WHERE id = p_to_account_id FOR UPDATE;
  ELSE
    SELECT balance, user_id, currency INTO v_to_balance, v_to_user_id, v_to_currency 
    FROM accounts WHERE id = p_to_account_id FOR UPDATE;
    
    SELECT balance, user_id, currency INTO v_from_balance, v_from_user_id, v_from_currency 
    FROM accounts WHERE id = p_from_account_id FOR UPDATE;
  END IF;

  -- Validate source account exists
  IF v_from_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source account not found');
  END IF;

  -- Authorization check: ensure caller owns the source account
  IF v_from_user_id != v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to transfer from this account');
  END IF;

  -- Validate destination account exists
  IF v_to_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination account not found');
  END IF;

  -- Check source has sufficient balance
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
  END IF;

  -- Generate reference number
  v_reference_number := 'IBT-' || EXTRACT(EPOCH FROM now())::bigint || '-' || substr(md5(random()::text), 1, 6);

  -- Debit source account
  UPDATE accounts 
  SET balance = balance - p_amount, updated_at = now() 
  WHERE id = p_from_account_id;

  -- Credit destination account (use converted amount for cross-currency)
  UPDATE accounts 
  SET balance = balance + p_converted_amount, updated_at = now() 
  WHERE id = p_to_account_id;

  -- Get updated balances
  SELECT balance INTO v_from_balance FROM accounts WHERE id = p_from_account_id;
  SELECT balance INTO v_to_balance FROM accounts WHERE id = p_to_account_id;

  -- Insert transfer record
  INSERT INTO transfers (
    from_account_id,
    to_account_id,
    amount,
    status,
    description,
    reference_number
  ) VALUES (
    p_from_account_id,
    p_to_account_id,
    p_amount,
    'completed',
    COALESCE(p_description, 'Intra-bank transfer'),
    v_reference_number
  ) RETURNING id INTO v_transfer_id;

  -- Get sender and recipient info for transaction records and email notifications
  SELECT p.full_name, a.account_number INTO v_recipient_name, v_recipient_account
  FROM profiles p
  JOIN accounts a ON a.user_id = p.id
  WHERE a.id = p_to_account_id;

  SELECT p.full_name, a.account_number INTO v_sender_name, v_sender_account
  FROM profiles p
  JOIN accounts a ON a.user_id = p.id
  WHERE a.id = p_from_account_id;

  -- Insert debit transaction for sender
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    status,
    description,
    reference_number,
    recipient_name,
    recipient_account,
    completed_at
  ) VALUES (
    p_from_account_id,
    'withdrawal',
    -p_amount,
    v_from_balance,
    'completed',
    COALESCE(p_description, 'Transfer to ' || COALESCE(v_recipient_name, 'recipient')),
    v_reference_number || '-DEB',
    v_recipient_name,
    v_recipient_account,
    now()
  );

  -- Insert credit transaction for recipient
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    status,
    description,
    reference_number,
    recipient_name,
    recipient_account,
    completed_at
  ) VALUES (
    p_to_account_id,
    'deposit',
    p_converted_amount,
    v_to_balance,
    'completed',
    'Transfer from ' || COALESCE(v_sender_name, 'sender'),
    v_reference_number || '-CRE',
    v_sender_name,
    v_sender_account,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number,
    'from_currency', v_from_currency,
    'to_currency', v_to_currency,
    'amount', p_amount,
    'converted_amount', p_converted_amount,
    -- Additional fields for email notifications
    'from_user_id', v_from_user_id,
    'to_user_id', v_to_user_id,
    'from_balance_after', v_from_balance,
    'to_balance_after', v_to_balance,
    'from_account_number', v_sender_account,
    'to_account_number', v_recipient_account,
    'from_name', v_sender_name,
    'to_name', v_recipient_name
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_intrabank_transfer(uuid,uuid,numeric,numeric,text) TO authenticated;