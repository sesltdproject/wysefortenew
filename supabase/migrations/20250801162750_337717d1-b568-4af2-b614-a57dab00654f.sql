-- Function to update admin-created transactions
CREATE OR REPLACE FUNCTION public.admin_update_transaction(
  p_transaction_id UUID,
  p_new_amount NUMERIC,
  p_new_description TEXT,
  p_new_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_account accounts%ROWTYPE;
  v_old_amount NUMERIC;
  v_amount_difference NUMERIC;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Validate inputs
  IF p_new_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  -- Get transaction details and verify it's admin-created
  SELECT * INTO v_transaction 
  FROM transactions 
  WHERE id = p_transaction_id 
    AND (reference_number LIKE 'CRE-%' OR reference_number LIKE 'DBT-%');
  
  IF v_transaction.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin transaction not found');
  END IF;
  
  -- Get account details
  SELECT * INTO v_account FROM accounts WHERE id = v_transaction.account_id;
  
  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;
  
  -- Check account status
  IF v_account.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Account is not active');
  END IF;
  
  -- Store old amount for balance calculation
  v_old_amount := v_transaction.amount;
  v_amount_difference := p_new_amount - v_old_amount;
  
  -- Start transaction
  BEGIN
    -- Update account balance based on transaction type and amount difference
    IF v_transaction.transaction_type = 'deposit' THEN
      -- For deposits: add the difference to balance
      UPDATE accounts SET balance = balance + v_amount_difference, updated_at = NOW() 
      WHERE id = v_transaction.account_id;
    ELSE -- withdrawal
      -- For withdrawals: subtract the difference from balance
      UPDATE accounts SET balance = balance - v_amount_difference, updated_at = NOW() 
      WHERE id = v_transaction.account_id;
    END IF;
    
    -- Update transaction record
    UPDATE transactions 
    SET amount = p_new_amount,
        description = p_new_description,
        created_at = p_new_date,
        updated_at = NOW()
    WHERE id = p_transaction_id;
    
    -- Create audit log entry
    INSERT INTO audit_log (
      table_name, action, user_id, performed_by,
      old_values, new_values
    ) VALUES (
      'transactions', 'update', v_account.user_id, auth.uid(),
      jsonb_build_object(
        'amount', v_old_amount,
        'description', v_transaction.description,
        'created_at', v_transaction.created_at
      ),
      jsonb_build_object(
        'amount', p_new_amount,
        'description', p_new_description,
        'created_at', p_new_date
      )
    );
    
    v_result := json_build_object(
      'success', true, 
      'message', 'Transaction updated successfully',
      'old_amount', v_old_amount,
      'new_amount', p_new_amount,
      'amount_difference', v_amount_difference
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Failed to update transaction: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$function$;

-- Function to delete admin-created transactions
CREATE OR REPLACE FUNCTION public.admin_delete_transaction(
  p_transaction_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_account accounts%ROWTYPE;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get transaction details and verify it's admin-created
  SELECT * INTO v_transaction 
  FROM transactions 
  WHERE id = p_transaction_id 
    AND (reference_number LIKE 'CRE-%' OR reference_number LIKE 'DBT-%');
  
  IF v_transaction.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin transaction not found');
  END IF;
  
  -- Get account details
  SELECT * INTO v_account FROM accounts WHERE id = v_transaction.account_id;
  
  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;
  
  -- Start transaction
  BEGIN
    -- Reverse the transaction effect on account balance
    IF v_transaction.transaction_type = 'deposit' THEN
      -- For deposits: subtract the amount from balance (reverse the credit)
      UPDATE accounts SET balance = balance - v_transaction.amount, updated_at = NOW() 
      WHERE id = v_transaction.account_id;
    ELSE -- withdrawal
      -- For withdrawals: add the amount back to balance (reverse the debit)
      UPDATE accounts SET balance = balance + v_transaction.amount, updated_at = NOW() 
      WHERE id = v_transaction.account_id;
    END IF;
    
    -- Create audit log entry before deletion
    INSERT INTO audit_log (
      table_name, action, user_id, performed_by,
      old_values
    ) VALUES (
      'transactions', 'delete', v_account.user_id, auth.uid(),
      jsonb_build_object(
        'id', v_transaction.id,
        'amount', v_transaction.amount,
        'transaction_type', v_transaction.transaction_type,
        'description', v_transaction.description,
        'reference_number', v_transaction.reference_number,
        'created_at', v_transaction.created_at
      )
    );
    
    -- Delete the transaction
    DELETE FROM transactions WHERE id = p_transaction_id;
    
    v_result := json_build_object(
      'success', true, 
      'message', 'Transaction deleted successfully',
      'deleted_amount', v_transaction.amount,
      'transaction_type', v_transaction.transaction_type
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Failed to delete transaction: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$function$;