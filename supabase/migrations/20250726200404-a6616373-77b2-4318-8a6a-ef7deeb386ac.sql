-- Create function to generate loan payment schedule for existing loans
CREATE OR REPLACE FUNCTION generate_loan_payment_schedule(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_loan loans%ROWTYPE;
  v_payment_date DATE;
  v_remaining_balance NUMERIC;
  v_interest_amount NUMERIC;
  v_principal_amount NUMERIC;
  v_payment_number INTEGER;
BEGIN
  -- Get loan details
  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id;
  
  IF v_loan.id IS NULL THEN
    RAISE EXCEPTION 'Loan not found with ID: %', p_loan_id;
  END IF;
  
  -- Only generate payments for active loans that don't already have payments
  IF v_loan.status != 'active' THEN
    RETURN;
  END IF;
  
  -- Check if payments already exist
  IF EXISTS (SELECT 1 FROM loan_payments WHERE loan_id = p_loan_id) THEN
    RETURN;
  END IF;
  
  -- Initialize variables
  v_remaining_balance := v_loan.remaining_balance;
  v_payment_date := COALESCE(v_loan.disbursement_date::DATE, CURRENT_DATE) + INTERVAL '1 month';
  v_payment_number := 1;
  
  -- Generate payment schedule
  WHILE v_payment_number <= v_loan.term_months AND v_remaining_balance > 0.01 LOOP
    -- Calculate interest and principal for this payment
    v_interest_amount := v_remaining_balance * (v_loan.interest_rate / 100 / 12);
    v_principal_amount := v_loan.monthly_payment - v_interest_amount;
    
    -- Ensure we don't overpay on the last payment
    IF v_principal_amount > v_remaining_balance THEN
      v_principal_amount := v_remaining_balance;
    END IF;
    
    -- Insert payment record
    INSERT INTO loan_payments (
      loan_id,
      payment_amount,
      principal_amount,
      interest_amount,
      remaining_balance,
      due_date,
      status
    ) VALUES (
      p_loan_id,
      v_principal_amount + v_interest_amount,
      v_principal_amount,
      v_interest_amount,
      v_remaining_balance - v_principal_amount,
      v_payment_date,
      'pending'
    );
    
    -- Update remaining balance
    v_remaining_balance := v_remaining_balance - v_principal_amount;
    
    -- Move to next month
    v_payment_date := v_payment_date + INTERVAL '1 month';
    v_payment_number := v_payment_number + 1;
  END LOOP;
  
END;
$$;

-- Generate payment schedules for all active loans that don't have payments
DO $$
DECLARE
  loan_record RECORD;
BEGIN
  FOR loan_record IN 
    SELECT id FROM loans 
    WHERE status = 'active' 
    AND id NOT IN (SELECT DISTINCT loan_id FROM loan_payments)
  LOOP
    PERFORM generate_loan_payment_schedule(loan_record.id);
  END LOOP;
END;
$$;