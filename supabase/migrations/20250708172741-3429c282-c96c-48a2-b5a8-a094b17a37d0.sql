-- Create a function to generate custom date range statements
CREATE OR REPLACE FUNCTION public.generate_custom_statement(
  p_account_id uuid, 
  p_start_date date, 
  p_end_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_opening_balance NUMERIC := 0;
  v_closing_balance NUMERIC := 0;
  v_total_deposits NUMERIC := 0;
  v_total_withdrawals NUMERIC := 0;
  v_transaction_count INTEGER := 0;
  v_statement_id UUID;
BEGIN
  -- Get user_id and verify ownership
  SELECT user_id INTO v_user_id FROM accounts WHERE id = p_account_id AND user_id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Account not found or not owned by user';
  END IF;
  
  -- Get opening balance (current balance minus transactions in period)
  SELECT COALESCE(balance, 0) INTO v_opening_balance 
  FROM accounts WHERE id = p_account_id;
  
  -- Calculate totals from transactions in the period
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type IN ('deposit') OR (transaction_type = 'transfer' AND amount > 0) THEN ABS(amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type IN ('withdrawal') OR (transaction_type = 'transfer' AND amount < 0) THEN ABS(amount) ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_deposits, v_total_withdrawals, v_transaction_count
  FROM transactions 
  WHERE account_id = p_account_id 
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;
  
  -- Calculate opening balance by subtracting net change from current balance
  v_opening_balance := v_opening_balance - (v_total_deposits - v_total_withdrawals);
  v_closing_balance := v_opening_balance + v_total_deposits - v_total_withdrawals;
  
  -- Insert statement
  INSERT INTO account_statements (
    user_id, account_id, statement_period_start, statement_period_end,
    opening_balance, closing_balance, total_deposits, total_withdrawals, transaction_count
  ) VALUES (
    v_user_id, p_account_id, p_start_date, p_end_date,
    v_opening_balance, v_closing_balance, v_total_deposits, v_total_withdrawals, v_transaction_count
  )
  ON CONFLICT (account_id, statement_period_start) DO UPDATE SET
    statement_period_end = EXCLUDED.statement_period_end,
    closing_balance = EXCLUDED.closing_balance,
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    transaction_count = EXCLUDED.transaction_count,
    updated_at = now()
  RETURNING id INTO v_statement_id;
  
  RETURN v_statement_id;
END;
$function$;