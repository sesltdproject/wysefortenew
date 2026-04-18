-- =====================================================
-- SECURITY FIX: Replace SQLERRM with generic errors
-- Drop ALL affected functions first, then recreate
-- =====================================================

-- Drop all affected functions
DROP FUNCTION IF EXISTS admin_delete_loan(uuid);
DROP FUNCTION IF EXISTS admin_approve_loan_with_disbursement(uuid, boolean, text);
DROP FUNCTION IF EXISTS admin_approve_loan_with_disbursement(uuid, boolean, text, numeric);
DROP FUNCTION IF EXISTS update_website_settings(text, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean, boolean, text, integer, text, text, text, text, boolean, boolean, boolean, text, text, text, boolean, boolean, text, text, text, text);

-- Recreate admin_delete_loan with security fix
CREATE FUNCTION admin_delete_loan(p_loan_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Delete loan payments first
  DELETE FROM loan_payments WHERE loan_id = p_loan_id;

  -- Delete the loan
  DELETE FROM loans WHERE id = p_loan_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Loan not found');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Loan deleted successfully');

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'admin_delete_loan error: % %', SQLSTATE, SQLERRM;
  RETURN json_build_object('success', false, 'error', 'Failed to delete loan. Please try again.');
END;
$$;

-- Recreate admin_approve_loan_with_disbursement with security fix
CREATE FUNCTION admin_approve_loan_with_disbursement(
  p_application_id UUID,
  p_approve BOOLEAN,
  p_admin_notes TEXT DEFAULT NULL,
  p_interest_rate NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application RECORD;
  v_loan_id UUID;
  v_monthly_payment NUMERIC;
  v_interest_rate NUMERIC;
  v_disbursement_date DATE;
  v_maturity_date DATE;
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get application
  SELECT * INTO v_application
  FROM loan_applications
  WHERE id = p_application_id AND status = 'pending';

  IF v_application IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Application not found or already processed');
  END IF;

  IF p_approve THEN
    -- Use provided rate or get default
    v_interest_rate := COALESCE(p_interest_rate, 12.0);

    -- Calculate monthly payment
    v_monthly_payment := (v_application.requested_amount * (1 + (v_interest_rate / 100))) / COALESCE(v_application.loan_term_months, 12);

    v_disbursement_date := CURRENT_DATE;
    v_maturity_date := CURRENT_DATE + (COALESCE(v_application.loan_term_months, 12) || ' months')::INTERVAL;

    -- Create loan
    INSERT INTO loans (
      user_id, application_id, loan_amount, principal_amount, interest_rate,
      loan_term_months, monthly_payment, remaining_balance, loan_type,
      status, disbursement_date, maturity_date, repayment_account_id
    )
    VALUES (
      v_application.user_id, p_application_id, v_application.requested_amount,
      v_application.requested_amount, v_interest_rate,
      COALESCE(v_application.loan_term_months, 12), v_monthly_payment,
      v_application.requested_amount * (1 + (v_interest_rate / 100)),
      v_application.loan_type, 'active', v_disbursement_date, v_maturity_date,
      v_application.disbursement_account_id
    )
    RETURNING id INTO v_loan_id;

    -- Credit disbursement account if specified
    IF v_application.disbursement_account_id IS NOT NULL THEN
      UPDATE accounts 
      SET balance = balance + v_application.requested_amount, updated_at = now()
      WHERE id = v_application.disbursement_account_id;

      INSERT INTO transactions (
        account_id, transaction_type, amount, description, status, completed_at
      )
      VALUES (
        v_application.disbursement_account_id, 'deposit', v_application.requested_amount,
        'Loan disbursement - ' || v_application.loan_type, 'completed', now()
      );
    END IF;

    -- Update application
    UPDATE loan_applications
    SET status = 'approved', admin_notes = p_admin_notes, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_application_id;

    RETURN json_build_object('success', true, 'loan_id', v_loan_id, 'message', 'Loan approved and disbursed');
  ELSE
    -- Reject application
    UPDATE loan_applications
    SET status = 'rejected', admin_notes = p_admin_notes, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_application_id;

    RETURN json_build_object('success', true, 'message', 'Loan application rejected');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'admin_approve_loan_with_disbursement error: % %', SQLSTATE, SQLERRM;
  RETURN json_build_object('success', false, 'error', 'Failed to process loan application. Please try again.');
END;
$$;

-- Recreate update_website_settings with security fix
CREATE FUNCTION update_website_settings(
  p_bank_name TEXT DEFAULT NULL,
  p_bank_email TEXT DEFAULT NULL,
  p_bank_phone TEXT DEFAULT NULL,
  p_bank_address TEXT DEFAULT NULL,
  p_support_email TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_favicon_url TEXT DEFAULT NULL,
  p_footer_logo_url TEXT DEFAULT NULL,
  p_primary_color TEXT DEFAULT NULL,
  p_secondary_color TEXT DEFAULT NULL,
  p_email_alerts_enabled BOOLEAN DEFAULT NULL,
  p_show_navigation_menu BOOLEAN DEFAULT NULL,
  p_website_visibility BOOLEAN DEFAULT NULL,
  p_show_kyc_page BOOLEAN DEFAULT NULL,
  p_smtp_enabled BOOLEAN DEFAULT NULL,
  p_smtp_host TEXT DEFAULT NULL,
  p_smtp_port INTEGER DEFAULT NULL,
  p_smtp_username TEXT DEFAULT NULL,
  p_smtp_password TEXT DEFAULT NULL,
  p_smtp_from_email TEXT DEFAULT NULL,
  p_smtp_from_name TEXT DEFAULT NULL,
  p_smtp_use_ssl BOOLEAN DEFAULT NULL,
  p_resend_enabled BOOLEAN DEFAULT NULL,
  p_auth_emails_enabled BOOLEAN DEFAULT NULL,
  p_receipt_header_color TEXT DEFAULT NULL,
  p_receipt_accent_color TEXT DEFAULT NULL,
  p_receipt_title TEXT DEFAULT NULL,
  p_receipt_show_logo BOOLEAN DEFAULT NULL,
  p_receipt_show_watermark BOOLEAN DEFAULT NULL,
  p_receipt_watermark_text TEXT DEFAULT NULL,
  p_receipt_footer_disclaimer TEXT DEFAULT NULL,
  p_receipt_custom_message TEXT DEFAULT NULL,
  p_receipt_reference_prefix TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get or create settings record
  SELECT id INTO v_settings_id FROM website_settings LIMIT 1;

  IF v_settings_id IS NULL THEN
    INSERT INTO website_settings (id) VALUES (gen_random_uuid()) RETURNING id INTO v_settings_id;
  END IF;

  -- Update settings
  UPDATE website_settings SET
    bank_name = COALESCE(p_bank_name, bank_name),
    bank_email = COALESCE(p_bank_email, bank_email),
    bank_phone = COALESCE(p_bank_phone, bank_phone),
    bank_address = COALESCE(p_bank_address, bank_address),
    support_email = COALESCE(p_support_email, support_email),
    logo_url = COALESCE(p_logo_url, logo_url),
    favicon_url = COALESCE(p_favicon_url, favicon_url),
    footer_logo_url = COALESCE(p_footer_logo_url, footer_logo_url),
    primary_color = COALESCE(p_primary_color, primary_color),
    secondary_color = COALESCE(p_secondary_color, secondary_color),
    email_alerts_enabled = COALESCE(p_email_alerts_enabled, email_alerts_enabled),
    show_navigation_menu = COALESCE(p_show_navigation_menu, show_navigation_menu),
    website_visibility = COALESCE(p_website_visibility, website_visibility),
    show_kyc_page = COALESCE(p_show_kyc_page, show_kyc_page),
    smtp_enabled = COALESCE(p_smtp_enabled, smtp_enabled),
    smtp_host = COALESCE(p_smtp_host, smtp_host),
    smtp_port = COALESCE(p_smtp_port, smtp_port),
    smtp_username = COALESCE(p_smtp_username, smtp_username),
    smtp_password = COALESCE(p_smtp_password, smtp_password),
    smtp_from_email = COALESCE(p_smtp_from_email, smtp_from_email),
    smtp_from_name = COALESCE(p_smtp_from_name, smtp_from_name),
    smtp_use_ssl = COALESCE(p_smtp_use_ssl, smtp_use_ssl),
    resend_enabled = COALESCE(p_resend_enabled, resend_enabled),
    auth_emails_enabled = COALESCE(p_auth_emails_enabled, auth_emails_enabled),
    receipt_header_color = COALESCE(p_receipt_header_color, receipt_header_color),
    receipt_accent_color = COALESCE(p_receipt_accent_color, receipt_accent_color),
    receipt_title = COALESCE(p_receipt_title, receipt_title),
    receipt_show_logo = COALESCE(p_receipt_show_logo, receipt_show_logo),
    receipt_show_watermark = COALESCE(p_receipt_show_watermark, receipt_show_watermark),
    receipt_watermark_text = COALESCE(p_receipt_watermark_text, receipt_watermark_text),
    receipt_footer_disclaimer = COALESCE(p_receipt_footer_disclaimer, receipt_footer_disclaimer),
    receipt_custom_message = COALESCE(p_receipt_custom_message, receipt_custom_message),
    receipt_reference_prefix = COALESCE(p_receipt_reference_prefix, receipt_reference_prefix),
    updated_at = now()
  WHERE id = v_settings_id;

  RETURN json_build_object('success', true, 'message', 'Settings updated successfully');

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'update_website_settings error: % %', SQLSTATE, SQLERRM;
  RETURN json_build_object('success', false, 'error', 'Failed to update settings. Please try again.');
END;
$$;