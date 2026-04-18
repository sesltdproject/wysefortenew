
-- Drop and recreate the function to also create transaction records
CREATE OR REPLACE FUNCTION process_internal_transfer_with_conversion(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_converted_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_description TEXT DEFAULT 'Internal transfer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_from_user_id UUID;
  v_to_user_id UUID;
  v_transfer_id UUID;
  v_reference_number TEXT;
  v_new_from_balance NUMERIC;
  v_new_to_balance NUMERIC;
BEGIN
  -- Verify both accounts belong to the same user
  SELECT user_id, balance INTO v_from_user_id, v_from_balance
  FROM accounts WHERE id = p_from_account_id FOR UPDATE;
  
  SELECT user_id, balance INTO v_to_user_id, v_to_balance
  FROM accounts WHERE id = p_to_account_id FOR UPDATE;
  
  IF v_from_user_id IS NULL OR v_to_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or both accounts not found');
  END IF;
  
  IF v_from_user_id != v_to_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accounts must belong to the same user');
  END IF;
  
  -- Check sufficient balance
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Generate reference number
  v_reference_number := 'INT-' || EXTRACT(EPOCH FROM now())::BIGINT;
  
  -- Calculate new balances
  v_new_from_balance := v_from_balance - p_amount;
  v_new_to_balance := v_to_balance + p_converted_amount;
  
  -- Debit source account (original amount)
  UPDATE accounts 
  SET balance = v_new_from_balance, updated_at = now()
  WHERE id = p_from_account_id;
  
  -- Credit destination account (converted amount)
  UPDATE accounts 
  SET balance = v_new_to_balance, updated_at = now()
  WHERE id = p_to_account_id;
  
  -- Create transfer record
  INSERT INTO transfers (from_account_id, to_account_id, amount, description, status, reference_number)
  VALUES (p_from_account_id, p_to_account_id, p_amount, 
          CASE WHEN p_from_currency != p_to_currency 
               THEN p_description || ' (' || p_from_currency || ' ' || p_amount || ' → ' || p_to_currency || ' ' || p_converted_amount || ')'
               ELSE p_description
          END,
          'completed', v_reference_number)
  RETURNING id INTO v_transfer_id;
  
  -- Create DEBIT transaction for the source account (negative amount)
  INSERT INTO transactions (
    account_id, 
    transaction_type, 
    amount, 
    balance_after, 
    status, 
    description, 
    reference_number,
    completed_at
  )
  VALUES (
    p_from_account_id,
    'withdrawal',
    -p_amount,
    v_new_from_balance,
    'completed',
    CASE WHEN p_from_currency != p_to_currency 
         THEN 'Internal Transfer - ' || p_description || ' (' || p_from_currency || ' → ' || p_to_currency || ')'
         ELSE 'Internal Transfer - ' || p_description
    END,
    v_reference_number,
    now()
  );
  
  -- Create CREDIT transaction for the destination account (positive amount)
  INSERT INTO transactions (
    account_id, 
    transaction_type, 
    amount, 
    balance_after, 
    status, 
    description, 
    reference_number,
    completed_at
  )
  VALUES (
    p_to_account_id,
    'deposit',
    p_converted_amount,
    v_new_to_balance,
    'completed',
    CASE WHEN p_from_currency != p_to_currency 
         THEN 'Internal Transfer - ' || p_description || ' (' || p_from_currency || ' → ' || p_to_currency || ')'
         ELSE 'Internal Transfer - ' || p_description
    END,
    v_reference_number,
    now()
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number
  );
END;
$$;
