-- =====================================================================
-- SECURITY FIX MIGRATION: Address all warn-level security issues
-- =====================================================================

-- Drop functions with return type issues
DROP FUNCTION IF EXISTS public.delete_user_completely(uuid);

-- =====================================================================
-- 1. FIX: SQLERRM exposure - delete_user_completely with generic errors
-- =====================================================================

CREATE FUNCTION public.delete_user_completely(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role text;
BEGIN
  v_admin_role := get_current_user_role();
  IF v_admin_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_delete) THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  DELETE FROM notifications WHERE user_id = user_id_to_delete;
  DELETE FROM support_ticket_messages WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = user_id_to_delete);
  DELETE FROM support_tickets WHERE user_id = user_id_to_delete;
  DELETE FROM loan_payments WHERE loan_id IN (SELECT id FROM loans WHERE user_id = user_id_to_delete);
  DELETE FROM loans WHERE user_id = user_id_to_delete;
  DELETE FROM loan_applications WHERE user_id = user_id_to_delete;
  DELETE FROM foreign_remittances WHERE user_id = user_id_to_delete;
  DELETE FROM kyc_documents WHERE user_id = user_id_to_delete;
  DELETE FROM check_deposits WHERE user_id = user_id_to_delete;
  DELETE FROM crypto_deposits WHERE user_id = user_id_to_delete;
  DELETE FROM bill_payments WHERE user_id = user_id_to_delete;
  DELETE FROM payees WHERE user_id = user_id_to_delete;
  DELETE FROM transfers WHERE from_account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete) OR to_account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete);
  DELETE FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = user_id_to_delete);
  DELETE FROM account_statements WHERE user_id = user_id_to_delete;
  DELETE FROM accounts WHERE user_id = user_id_to_delete;
  DELETE FROM next_of_kin WHERE user_id = user_id_to_delete;
  DELETE FROM user_security WHERE user_id = user_id_to_delete;
  DELETE FROM security_code_verification_attempts WHERE user_id = user_id_to_delete;
  DELETE FROM user_roles WHERE user_id = user_id_to_delete;
  DELETE FROM profiles WHERE id = user_id_to_delete;

  INSERT INTO admin_activities (admin_id, action, details)
  VALUES (auth.uid(), 'user_deleted', json_build_object('deleted_user_id', user_id_to_delete)::text);

  RETURN json_build_object('success', true, 'message', 'User deleted successfully');

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'delete_user_completely error for user %: % %', user_id_to_delete, SQLSTATE, SQLERRM;
  RETURN json_build_object('success', false, 'error', 'Unable to delete user. Please try again.');
END;
$$;

-- =====================================================================
-- 2. FIX: Overly permissive INSERT policies (PUBLIC_DATA_EXPOSURE)
-- =====================================================================

DROP POLICY IF EXISTS "System can insert loan payments" ON loan_payments;
DROP POLICY IF EXISTS "System can insert statements" ON account_statements;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert security code attempts" ON security_code_verification_attempts;

CREATE POLICY "Admins can insert loan payments"
ON loan_payments FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert account statements"
ON account_statements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage notifications" ON notifications;
CREATE POLICY "Admins can manage notifications"
ON notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert user notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- 3. FIX: email_verification_codes unrestricted INSERT
-- =====================================================================

DROP POLICY IF EXISTS "Anyone can insert verification codes" ON email_verification_codes;
DROP POLICY IF EXISTS "Public can insert verification codes" ON email_verification_codes;
DROP POLICY IF EXISTS "Allow public insert" ON email_verification_codes;
DROP POLICY IF EXISTS "Anyone can read verification codes" ON email_verification_codes;
DROP POLICY IF EXISTS "Public can read verification codes" ON email_verification_codes;

DROP POLICY IF EXISTS "Admins can view verification codes" ON email_verification_codes;
CREATE POLICY "Admins can view verification codes"
ON email_verification_codes FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- =====================================================================
-- 4. Update password clearing trigger for rejected applications too
-- =====================================================================

CREATE OR REPLACE FUNCTION public.clear_application_password()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    NEW.password_hash := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 5. FIX: crypto_deposit_config - Make wallet visibility explicit
-- (This is intentional for deposit purposes, so we'll add an admin note)
-- =====================================================================

COMMENT ON TABLE public.crypto_deposit_config IS 'Contains cryptocurrency wallet addresses for deposit purposes. These are intentionally public so users can send deposits. Wallet monitoring is an accepted risk for the business model.';