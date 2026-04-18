-- Update admin_approve_loan_with_disbursement function to accept interest rate parameter
CREATE OR REPLACE FUNCTION admin_approve_loan_with_disbursement(
  p_application_id UUID,
  p_approve BOOLEAN,
  p_admin_notes TEXT DEFAULT NULL,
  p_interest_rate NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application RECORD;
  v_loan_id UUID;
  v_monthly_payment NUMERIC;
  v_interest_rate NUMERIC;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Get application details
  SELECT * INTO v_application
  FROM loan_applications
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loan application not found');
  END IF;
  
  IF v_application.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loan application has already been processed');
  END IF;
  
  IF NOT p_approve THEN
    -- Reject the application
    UPDATE loan_applications
    SET 
      status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      admin_notes = p_admin_notes
    WHERE id = p_application_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Loan application rejected');
  END IF;
  
  -- Use provided interest rate or fetch from config
  IF p_interest_rate IS NOT NULL THEN
    v_interest_rate := p_interest_rate;
  ELSE
    -- Fallback to default rate from config table
    SELECT interest_rate INTO v_interest_rate
    FROM loan_interest_rates
    WHERE loan_type = v_application.loan_type;
    
    IF v_interest_rate IS NULL THEN
      v_interest_rate := 8.5; -- Fallback default
    END IF;
  END IF;
  
  -- Calculate monthly payment using standard amortization formula
  -- M = P * [r(1+r)^n] / [(1+r)^n - 1]
  -- where: M = monthly payment, P = principal, r = monthly interest rate, n = number of months
  DECLARE
    v_principal NUMERIC := v_application.requested_amount;
    v_months INTEGER := COALESCE(v_application.loan_term_months, 12);
    v_monthly_rate NUMERIC := (v_interest_rate / 100) / 12;
  BEGIN
    IF v_monthly_rate = 0 THEN
      v_monthly_payment := v_principal / v_months;
    ELSE
      v_monthly_payment := v_principal * (v_monthly_rate * POWER(1 + v_monthly_rate, v_months)) / 
                          (POWER(1 + v_monthly_rate, v_months) - 1);
    END IF;
  END;
  
  -- Round to 2 decimal places
  v_monthly_payment := ROUND(v_monthly_payment, 2);
  
  -- Update application status
  UPDATE loan_applications
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    admin_notes = p_admin_notes
  WHERE id = p_application_id;
  
  -- Create loan record
  INSERT INTO loans (
    user_id,
    application_id,
    loan_type,
    loan_amount,
    principal_amount,
    interest_rate,
    loan_term_months,
    monthly_payment,
    remaining_balance,
    status,
    disbursement_date,
    maturity_date
  ) VALUES (
    v_application.user_id,
    p_application_id,
    v_application.loan_type,
    v_application.requested_amount,
    v_application.requested_amount,
    v_interest_rate,
    COALESCE(v_application.loan_term_months, 12),
    v_monthly_payment,
    v_application.requested_amount,
    'active',
    CURRENT_DATE,
    CURRENT_DATE + (COALESCE(v_application.loan_term_months, 12) || ' months')::INTERVAL
  )
  RETURNING id INTO v_loan_id;
  
  -- Disburse funds to account
  UPDATE accounts
  SET balance = balance + v_application.requested_amount
  WHERE id = v_application.disbursement_account_id;
  
  -- Create transaction record
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    completed_at
  ) VALUES (
    v_application.disbursement_account_id,
    'deposit',
    v_application.requested_amount,
    'Loan disbursement - ' || INITCAP(v_application.loan_type) || ' Loan',
    'completed',
    NOW()
  );
  
  -- Log admin activity
  INSERT INTO admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'loan_approved',
    jsonb_build_object(
      'application_id', p_application_id,
      'loan_id', v_loan_id,
      'loan_type', v_application.loan_type,
      'amount', v_application.requested_amount,
      'interest_rate', v_interest_rate
    )::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'loan_id', v_loan_id,
    'interest_rate', v_interest_rate,
    'monthly_payment', v_monthly_payment
  );
END;
$$;