-- Create admin transaction function
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_account_id UUID,
  p_transaction_type TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_transaction_id UUID;
  v_result JSON;
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
      'ADM-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
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
$$;