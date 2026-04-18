-- Drop ALL overloads of delete_user_completely to avoid ambiguity
DROP FUNCTION IF EXISTS public.delete_user_completely(uuid);
DROP FUNCTION IF EXISTS public.delete_user_completely(uuid, uuid);

-- Recreate as a single function with optional parameter
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete uuid, performing_admin_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_exists boolean;
  v_is_admin boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_to_delete) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE LOG 'delete_user_completely: User % not found', user_id_to_delete;
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check if trying to delete an admin
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = user_id_to_delete AND role = 'admin') INTO v_is_admin;
  
  IF v_is_admin THEN
    RAISE LOG 'delete_user_completely: Cannot delete admin user %', user_id_to_delete;
    RETURN jsonb_build_object('success', false, 'error', 'Cannot delete admin users');
  END IF;
  
  -- Delete in order of dependencies (child tables first)
  
  -- Security and verification tables
  DELETE FROM security_code_verification_attempts WHERE user_id = user_id_to_delete;
  DELETE FROM user_security WHERE user_id = user_id_to_delete;
  
  -- Notifications
  DELETE FROM notifications WHERE user_id = user_id_to_delete;
  
  -- Support tickets and messages
  DELETE FROM support_ticket_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = user_id_to_delete);
  DELETE FROM support_tickets WHERE user_id = user_id_to_delete;
  
  -- Next of kin
  DELETE FROM next_of_kin WHERE user_id = user_id_to_delete;
  
  -- KYC documents
  DELETE FROM kyc_documents WHERE user_id = user_id_to_delete;
  
  -- Bill payments
  DELETE FROM bill_payments WHERE user_id = user_id_to_delete;
  
  -- Payees
  DELETE FROM payees WHERE user_id = user_id_to_delete;
  
  -- Account statements
  DELETE FROM account_statements WHERE user_id = user_id_to_delete;
  
  -- Loan payments (via loans)
  DELETE FROM loan_payments WHERE loan_id IN (SELECT id FROM loans WHERE user_id = user_id_to_delete);
  
  -- Loans
  DELETE FROM loans WHERE user_id = user_id_to_delete;
  
  -- Loan applications
  DELETE FROM loan_applications WHERE user_id = user_id_to_delete;
  
  -- Foreign remittances
  DELETE FROM foreign_remittances WHERE user_id = user_id_to_delete;
  
  -- Crypto deposits
  DELETE FROM crypto_deposits WHERE user_id = user_id_to_delete;
  
  -- Check deposits
  DELETE FROM check_deposits WHERE user_id = user_id_to_delete;
  
  -- Transactions (via accounts)
  DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete);
  
  -- Transfers (via accounts) 
  DELETE FROM transfers WHERE from_account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete)
     OR to_account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete);
  
  -- Clear loan repayment account reference before deleting accounts
  UPDATE profiles SET loan_repayment_account_id = NULL WHERE id = user_id_to_delete;
  
  -- Accounts
  DELETE FROM accounts WHERE user_id = user_id_to_delete;
  
  -- User roles
  DELETE FROM user_roles WHERE user_id = user_id_to_delete;
  
  -- Profile (last public table)
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  RAISE LOG 'delete_user_completely: Successfully deleted all public data for user %', user_id_to_delete;
  
  RETURN jsonb_build_object('success', true, 'message', 'User data deleted from public schema');
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'delete_user_completely error for user %: % %', user_id_to_delete, SQLSTATE, SQLERRM;
  RETURN jsonb_build_object('success', false, 'error', 'An error occurred while deleting user data');
END;
$$;