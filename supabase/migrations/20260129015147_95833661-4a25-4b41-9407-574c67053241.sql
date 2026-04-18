-- Function for internal transfer with currency conversion
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
  
  -- Debit source account (original amount)
  UPDATE accounts 
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = p_from_account_id;
  
  -- Credit destination account (converted amount)
  UPDATE accounts 
  SET balance = balance + p_converted_amount, updated_at = now()
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
  
  RETURN jsonb_build_object(
    'success', true, 
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number
  );
END;
$$;

-- Function for intra-bank transfer (between different users within the same bank)
CREATE OR REPLACE FUNCTION process_intrabank_transfer(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_converted_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_description TEXT DEFAULT 'Intra-bank transfer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_from_user_id UUID;
  v_to_user_id UUID;
  v_transfer_id UUID;
  v_reference_number TEXT;
BEGIN
  -- Get source account details
  SELECT user_id, balance INTO v_from_user_id, v_from_balance
  FROM accounts WHERE id = p_from_account_id FOR UPDATE;
  
  -- Get destination account user
  SELECT user_id INTO v_to_user_id
  FROM accounts WHERE id = p_to_account_id FOR UPDATE;
  
  IF v_from_user_id IS NULL OR v_to_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or both accounts not found');
  END IF;
  
  -- Check sufficient balance
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Generate reference number
  v_reference_number := 'CIB-' || EXTRACT(EPOCH FROM now())::BIGINT;
  
  -- Debit source account (original amount)
  UPDATE accounts 
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = p_from_account_id;
  
  -- Credit destination account (converted amount if different currencies)
  UPDATE accounts 
  SET balance = balance + p_converted_amount, updated_at = now()
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
  
  RETURN jsonb_build_object(
    'success', true, 
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_internal_transfer_with_conversion TO authenticated;
GRANT EXECUTE ON FUNCTION process_intrabank_transfer TO authenticated;