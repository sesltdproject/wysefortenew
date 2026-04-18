-- Create function to delete an account and all related data
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_account_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_number text;
  v_user_id uuid;
  v_deleted_transactions int := 0;
  v_deleted_transfers int := 0;
  v_deleted_check_deposits int := 0;
  v_deleted_crypto_deposits int := 0;
  v_deleted_statements int := 0;
  v_deleted_remittances int := 0;
  v_deleted_bill_payments int := 0;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get account details
  SELECT account_number, user_id INTO v_account_number, v_user_id
  FROM accounts
  WHERE id = p_account_id;

  IF v_account_number IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found');
  END IF;

  -- Delete related transactions
  DELETE FROM transactions WHERE account_id = p_account_id;
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;

  -- Delete related transfers (both from and to)
  DELETE FROM transfers WHERE from_account_id = p_account_id OR to_account_id = p_account_id;
  GET DIAGNOSTICS v_deleted_transfers = ROW_COUNT;

  -- Delete related check deposits
  DELETE FROM check_deposits WHERE account_id = p_account_id;
  GET DIAGNOSTICS v_deleted_check_deposits = ROW_COUNT;

  -- Delete related crypto deposits
  DELETE FROM crypto_deposits WHERE account_id = p_account_id;
  GET DIAGNOSTICS v_deleted_crypto_deposits = ROW_COUNT;

  -- Delete related account statements
  DELETE FROM account_statements WHERE account_id = p_account_id;
  GET DIAGNOSTICS v_deleted_statements = ROW_COUNT;

  -- Delete related foreign remittances
  DELETE FROM foreign_remittances WHERE account_id = p_account_id OR from_account_id = p_account_id;
  GET DIAGNOSTICS v_deleted_remittances = ROW_COUNT;

  -- Delete related bill payments
  DELETE FROM bill_payments WHERE account_id = p_account_id;
  GET DIAGNOSTICS v_deleted_bill_payments = ROW_COUNT;

  -- Update loan applications to remove disbursement account reference
  UPDATE loan_applications SET disbursement_account_id = NULL WHERE disbursement_account_id = p_account_id;

  -- Update loans to remove repayment account reference
  UPDATE loans SET repayment_account_id = NULL WHERE repayment_account_id = p_account_id;

  -- Update profiles to remove loan repayment account reference
  UPDATE profiles SET loan_repayment_account_id = NULL WHERE loan_repayment_account_id = p_account_id;

  -- Finally delete the account
  DELETE FROM accounts WHERE id = p_account_id;

  -- Log admin activity
  INSERT INTO admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'delete_account',
    format('Deleted account %s (ID: %s) for user %s. Deleted: %s transactions, %s transfers, %s check deposits, %s crypto deposits, %s statements, %s remittances, %s bill payments',
      v_account_number, p_account_id, v_user_id,
      v_deleted_transactions, v_deleted_transfers, v_deleted_check_deposits,
      v_deleted_crypto_deposits, v_deleted_statements, v_deleted_remittances, v_deleted_bill_payments)
  );

  RETURN json_build_object(
    'success', true,
    'message', format('Account %s deleted successfully', v_account_number),
    'deleted', json_build_object(
      'transactions', v_deleted_transactions,
      'transfers', v_deleted_transfers,
      'check_deposits', v_deleted_check_deposits,
      'crypto_deposits', v_deleted_crypto_deposits,
      'statements', v_deleted_statements,
      'remittances', v_deleted_remittances,
      'bill_payments', v_deleted_bill_payments
    )
  );
END;
$$;