-- Fix admin_update_transaction to support date updates
CREATE OR REPLACE FUNCTION public.admin_update_transaction(
  transaction_id UUID,
  new_amount NUMERIC DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_account accounts%ROWTYPE;
  v_old_amount NUMERIC;
  v_amount_difference NUMERIC;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get transaction details
  SELECT * INTO v_transaction 
  FROM transactions 
  WHERE id = transaction_id;
  
  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Get account details
  SELECT * INTO v_account FROM accounts WHERE id = v_transaction.account_id;
  
  IF v_account.id IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
  
  -- Calculate amount difference if amount is being changed
  IF new_amount IS NOT NULL THEN
    v_old_amount := v_transaction.amount;
    v_amount_difference := new_amount - v_old_amount;
    
    -- Update account balance based on transaction type
    IF v_transaction.transaction_type = 'deposit' THEN
      UPDATE accounts SET balance = balance + v_amount_difference, updated_at = NOW() 
      WHERE id = v_transaction.account_id;
    ELSIF v_transaction.transaction_type = 'withdrawal' THEN
      UPDATE accounts SET balance = balance - v_amount_difference, updated_at = NOW() 
      WHERE id = v_transaction.account_id;
    END IF;
  END IF;
  
  -- Update transaction record
  UPDATE transactions 
  SET 
    amount = COALESCE(new_amount, amount),
    description = COALESCE(new_description, description),
    created_at = COALESCE(new_date, created_at)
  WHERE id = transaction_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Transaction updated successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;