-- Update the admin_approve_loan_with_disbursement function to generate payment schedules
CREATE OR REPLACE FUNCTION public.admin_approve_loan_with_disbursement(
  p_application_id uuid, 
  p_approve boolean, 
  p_admin_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  application RECORD;
  new_loan_id UUID;
  payment_month INTEGER;
  payment_due_date DATE;
  monthly_amount NUMERIC;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT * INTO application 
  FROM loan_applications 
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan application not found';
  END IF;
  
  IF p_approve THEN
    -- Update loan application status
    UPDATE loan_applications
    SET status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = p_application_id;
    
    -- Calculate monthly payment amount
    monthly_amount := application.requested_amount / application.loan_term_months;
    
    -- Create loan record
    INSERT INTO loans (
      user_id,
      application_id,
      loan_amount,
      loan_type,
      loan_term_months,
      interest_rate,
      monthly_payment,
      remaining_balance,
      principal_amount,
      disbursement_date,
      maturity_date,
      status
    ) VALUES (
      application.user_id,
      application.id,
      application.requested_amount,
      application.loan_type,
      application.loan_term_months,
      5.0,
      monthly_amount,
      application.requested_amount,
      application.requested_amount,
      CURRENT_DATE,
      CURRENT_DATE + (application.loan_term_months || ' months')::INTERVAL,
      'active'
    )
    RETURNING id INTO new_loan_id;
    
    -- Generate monthly payment schedule
    FOR payment_month IN 1..application.loan_term_months LOOP
      payment_due_date := CURRENT_DATE + (payment_month || ' months')::INTERVAL;
      
      INSERT INTO loan_payments (
        loan_id,
        due_date,
        amount_due,
        status
      ) VALUES (
        new_loan_id,
        payment_due_date,
        monthly_amount,
        'pending'
      );
    END LOOP;
    
    -- Disburse funds to account if specified
    IF application.disbursement_account_id IS NOT NULL THEN
      UPDATE accounts
      SET balance = balance + application.requested_amount
      WHERE id = application.disbursement_account_id;
    END IF;
  ELSE
    -- Reject loan application
    UPDATE loan_applications
    SET status = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = p_application_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'loan_id', new_loan_id);
END;
$function$;

-- Backfill payment schedules for existing active loans without payment records
DO $$
DECLARE
  loan_record RECORD;
  payment_month INTEGER;
  payment_due_date DATE;
  monthly_amount NUMERIC;
  payment_count INTEGER;
BEGIN
  FOR loan_record IN 
    SELECT l.* 
    FROM loans l
    WHERE l.status = 'active'
  LOOP
    -- Check if this loan already has payment records
    SELECT COUNT(*) INTO payment_count
    FROM loan_payments
    WHERE loan_id = loan_record.id;
    
    -- Only generate payments if none exist
    IF payment_count = 0 THEN
      monthly_amount := loan_record.monthly_payment;
      
      FOR payment_month IN 1..loan_record.loan_term_months LOOP
        payment_due_date := loan_record.disbursement_date + (payment_month || ' months')::INTERVAL;
        
        INSERT INTO loan_payments (
          loan_id,
          due_date,
          amount_due,
          status
        ) VALUES (
          loan_record.id,
          payment_due_date,
          monthly_amount,
          'pending'
        );
      END LOOP;
      
      RAISE NOTICE 'Generated % payment schedules for loan %', loan_record.loan_term_months, loan_record.id;
    END IF;
  END LOOP;
END $$;