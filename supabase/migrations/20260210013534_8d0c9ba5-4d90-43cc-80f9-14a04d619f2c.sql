
-- 1. Remove admin check from delete_user_completely function
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_exists boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_to_delete) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Delete all user data from public schema tables
  DELETE FROM support_ticket_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = user_id_to_delete);
  DELETE FROM support_tickets WHERE user_id = user_id_to_delete;
  DELETE FROM notifications WHERE user_id = user_id_to_delete;
  DELETE FROM loan_payments WHERE loan_id IN (SELECT id FROM loans WHERE user_id = user_id_to_delete);
  DELETE FROM loans WHERE user_id = user_id_to_delete;
  DELETE FROM loan_applications WHERE user_id = user_id_to_delete;
  DELETE FROM kyc_documents WHERE user_id = user_id_to_delete;
  DELETE FROM bill_payments WHERE user_id = user_id_to_delete;
  DELETE FROM payees WHERE user_id = user_id_to_delete;
  DELETE FROM check_deposits WHERE user_id = user_id_to_delete;
  DELETE FROM crypto_deposits WHERE user_id = user_id_to_delete;
  DELETE FROM foreign_remittances WHERE user_id = user_id_to_delete;
  DELETE FROM transfers WHERE from_account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete);
  DELETE FROM transfers WHERE to_account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete);
  DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete);
  DELETE FROM account_statements WHERE user_id = user_id_to_delete;
  DELETE FROM accounts WHERE user_id = user_id_to_delete;
  DELETE FROM next_of_kin WHERE user_id = user_id_to_delete;
  DELETE FROM security_code_verification_attempts WHERE user_id = user_id_to_delete;
  DELETE FROM user_security WHERE user_id = user_id_to_delete;
  DELETE FROM user_roles WHERE user_id = user_id_to_delete;
  DELETE FROM profiles WHERE id = user_id_to_delete;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. Drop the old 9-parameter overload of process_international_transfer
DROP FUNCTION IF EXISTS process_international_transfer(uuid, uuid, numeric, text, text, text, text, text, text);
