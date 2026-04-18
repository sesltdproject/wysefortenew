-- Create comprehensive loan deletion function
CREATE OR REPLACE FUNCTION public.admin_delete_loan(p_loan_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_loan loans%ROWTYPE;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get loan details
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
  
  IF v_loan.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Loan not found');
  END IF;
  
  BEGIN
    -- Delete loan payments first (foreign key constraint)
    DELETE FROM loan_payments WHERE loan_id = p_loan_id;
    
    -- Delete the loan
    DELETE FROM loans WHERE id = p_loan_id;
    
    v_result := json_build_object(
      'success', true, 
      'message', 'Loan and all associated records deleted successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Failed to delete loan: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$function$;

-- Create loan approval function with disbursement
CREATE OR REPLACE FUNCTION public.admin_approve_loan_with_disbursement(p_application_id UUID, p_admin_notes TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_application loan_applications%ROWTYPE;
  v_account accounts%ROWTYPE;
  v_loan_id UUID;
  v_interest_rate NUMERIC := 5.5; -- Default interest rate
  v_term_months INTEGER := 12; -- Default term
  v_monthly_payment NUMERIC;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get application details
  SELECT * INTO v_application FROM loan_applications WHERE id = p_application_id AND status = 'pending';
  
  IF v_application.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Loan application not found or already processed');
  END IF;
  
  -- Get disbursement account
  SELECT * INTO v_account FROM accounts WHERE id = v_application.disbursement_account_id;
  
  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Disbursement account not found');
  END IF;
  
  -- Check account status
  IF v_account.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Disbursement account is not active');
  END IF;
  
  -- Calculate monthly payment (simple calculation)
  v_monthly_payment := (v_application.requested_amount * (1 + (v_interest_rate / 100))) / v_term_months;
  
  BEGIN
    -- Update application status
    UPDATE loan_applications 
    SET status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = auth.uid(),
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_application_id;
    
    -- Create loan record
    INSERT INTO loans (
      user_id,
      application_id,
      principal_amount,
      interest_rate,
      term_months,
      monthly_payment,
      remaining_balance,
      loan_type,
      disbursement_date,
      maturity_date,
      status
    ) VALUES (
      v_application.user_id,
      p_application_id,
      v_application.requested_amount,
      v_interest_rate,
      v_term_months,
      v_monthly_payment,
      v_application.requested_amount,
      v_application.loan_type,
      NOW(),
      NOW() + (v_term_months || ' months')::INTERVAL,
      'active'
    ) RETURNING id INTO v_loan_id;
    
    -- Credit the disbursement account
    UPDATE accounts 
    SET balance = balance + v_application.requested_amount,
        updated_at = NOW()
    WHERE id = v_application.disbursement_account_id;
    
    -- Create transaction record
    INSERT INTO transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      status
    ) VALUES (
      v_application.disbursement_account_id,
      'deposit',
      v_application.requested_amount,
      'Loan disbursement - ' || v_application.loan_type,
      'LOAN-' || SUBSTRING(v_loan_id::text, 1, 8),
      'completed'
    );
    
    -- Generate payment schedule
    PERFORM generate_loan_payment_schedule(v_loan_id);
    
    v_result := json_build_object(
      'success', true,
      'loan_id', v_loan_id,
      'message', 'Loan approved and amount disbursed successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Failed to approve loan: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$function$;