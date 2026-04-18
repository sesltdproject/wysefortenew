-- Fix delete_user_completely function to work with service role calls
-- The authorization is already handled in the edge function
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Note: Authorization checks (admin role, prevent self-deletion) are handled
  -- in the edge function before calling this function. Since this is called
  -- with service role key, auth.uid() will be NULL, so we don't check it here.
  
  -- Delete in order to respect foreign key constraints
  
  -- Delete security-related records
  DELETE FROM public.security_code_verification_attempts WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_security WHERE user_id = user_id_to_delete;
  
  -- Delete notification records
  DELETE FROM public.notifications WHERE user_id = user_id_to_delete;
  
  -- Delete support-related records
  DELETE FROM public.support_ticket_messages WHERE ticket_id IN (
    SELECT id FROM public.support_tickets WHERE user_id = user_id_to_delete
  );
  DELETE FROM public.support_tickets WHERE user_id = user_id_to_delete;
  
  -- Delete financial records (order matters due to FKs)
  DELETE FROM public.bill_payments WHERE user_id = user_id_to_delete;
  DELETE FROM public.payees WHERE user_id = user_id_to_delete;
  
  -- Delete loan records
  DELETE FROM public.loan_payments WHERE loan_id IN (
    SELECT id FROM public.loans WHERE user_id = user_id_to_delete
  );
  DELETE FROM public.loans WHERE user_id = user_id_to_delete;
  DELETE FROM public.loan_applications WHERE user_id = user_id_to_delete;
  
  -- Delete transfer/remittance records
  DELETE FROM public.foreign_remittances WHERE user_id = user_id_to_delete;
  DELETE FROM public.transfers WHERE from_account_id IN (
    SELECT id FROM public.accounts WHERE user_id = user_id_to_delete
  ) OR to_account_id IN (
    SELECT id FROM public.accounts WHERE user_id = user_id_to_delete
  );
  
  -- Delete deposit records
  DELETE FROM public.check_deposits WHERE user_id = user_id_to_delete;
  DELETE FROM public.crypto_deposits WHERE user_id = user_id_to_delete;
  
  -- Delete transactions (linked to accounts)
  DELETE FROM public.transactions WHERE account_id IN (
    SELECT id FROM public.accounts WHERE user_id = user_id_to_delete
  );
  
  -- Delete account statements
  DELETE FROM public.account_statements WHERE user_id = user_id_to_delete;
  
  -- Delete accounts
  DELETE FROM public.accounts WHERE user_id = user_id_to_delete;
  
  -- Delete KYC documents
  DELETE FROM public.kyc_documents WHERE user_id = user_id_to_delete;
  
  -- Delete next of kin
  DELETE FROM public.next_of_kin WHERE user_id = user_id_to_delete;
  
  -- Delete user roles
  DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
  
  -- Delete profile (should be last in public schema)
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  
  -- Note: We cannot log to admin_activities here because we don't have auth.uid()
  -- The edge function will handle logging
  
  RETURN jsonb_build_object('success', true, 'message', 'User data deleted from public schema');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;