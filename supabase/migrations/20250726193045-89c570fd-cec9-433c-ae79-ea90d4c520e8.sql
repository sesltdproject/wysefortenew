-- Fix remaining database functions that still need search_path restriction
-- Based on security linter warnings

CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result_data json;
    affected_rows INTEGER := 0;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id_to_delete) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Start transaction and delete in proper order to respect foreign key constraints
    BEGIN
        -- Delete support ticket messages first
        DELETE FROM public.support_ticket_messages WHERE ticket_id IN (
            SELECT id FROM public.support_tickets WHERE user_id = user_id_to_delete
        );
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        -- Delete support tickets
        DELETE FROM public.support_tickets WHERE user_id = user_id_to_delete;
        
        -- Delete loan payments (through loan relationship)
        DELETE FROM public.loan_payments WHERE loan_id IN (
            SELECT id FROM public.loans WHERE user_id = user_id_to_delete
        );
        
        -- Delete loans
        DELETE FROM public.loans WHERE user_id = user_id_to_delete;
        
        -- Delete loan applications
        DELETE FROM public.loan_applications WHERE user_id = user_id_to_delete;
        
        -- Delete bill payments
        DELETE FROM public.bill_payments WHERE user_id = user_id_to_delete;
        
        -- Delete payees
        DELETE FROM public.payees WHERE user_id = user_id_to_delete;
        
        -- Delete foreign remittances
        DELETE FROM public.foreign_remittances WHERE user_id = user_id_to_delete;
        
        -- Delete check deposits
        DELETE FROM public.check_deposits WHERE user_id = user_id_to_delete;
        
        -- Delete crypto deposits
        DELETE FROM public.crypto_deposits WHERE user_id = user_id_to_delete;
        
        -- Delete transactions (through account relationship)
        DELETE FROM public.transactions WHERE account_id IN (
            SELECT id FROM public.accounts WHERE user_id = user_id_to_delete
        );
        
        -- Delete transfers (both from and to this user's accounts)
        DELETE FROM public.transfers WHERE 
            from_account_id IN (SELECT id FROM public.accounts WHERE user_id = user_id_to_delete)
            OR to_account_id IN (SELECT id FROM public.accounts WHERE user_id = user_id_to_delete);
        
        -- Delete account statements
        DELETE FROM public.account_statements WHERE user_id = user_id_to_delete;
        
        -- Delete accounts
        DELETE FROM public.accounts WHERE user_id = user_id_to_delete;
        
        -- Delete notifications
        DELETE FROM public.notifications WHERE user_id = user_id_to_delete;
        
        -- Delete next of kin
        DELETE FROM public.next_of_kin WHERE user_id = user_id_to_delete;
        
        -- Delete user security records
        DELETE FROM public.user_security WHERE user_id = user_id_to_delete;
        
        -- Delete KYC documents
        DELETE FROM public.kyc_documents WHERE user_id = user_id_to_delete;
        
        -- Finally, delete the profile
        DELETE FROM public.profiles WHERE id = user_id_to_delete;
        
        result_data := json_build_object(
            'success', true,
            'message', 'User and all related data deleted successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        result_data := json_build_object(
            'success', false,
            'error', 'Failed to delete user: ' || SQLERRM
        );
    END;
    
    RETURN result_data;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_custom_statement(p_account_id uuid, p_start_date date, p_end_date date)
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

CREATE OR REPLACE FUNCTION public.generate_monthly_statement(p_account_id uuid, p_year integer, p_month integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_period_start DATE;
  v_period_end DATE;
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
  
  -- Calculate period dates
  v_period_start := DATE(p_year || '-' || LPAD(p_month::TEXT, 2, '0') || '-01');
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Get opening balance (balance at start of period)
  SELECT COALESCE(balance, 0) INTO v_opening_balance 
  FROM accounts WHERE id = p_account_id;
  
  -- Calculate totals from transactions in the period
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type IN ('deposit', 'transfer') AND amount > 0 THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type IN ('withdrawal', 'transfer') AND amount < 0 THEN ABS(amount) ELSE 0 END), 0),
    COUNT(*)
  INTO v_total_deposits, v_total_withdrawals, v_transaction_count
  FROM transactions 
  WHERE account_id = p_account_id 
    AND created_at::DATE BETWEEN v_period_start AND v_period_end;
  
  -- Calculate closing balance
  v_closing_balance := v_opening_balance + v_total_deposits - v_total_withdrawals;
  
  -- Insert or update statement
  INSERT INTO account_statements (
    user_id, account_id, statement_period_start, statement_period_end,
    opening_balance, closing_balance, total_deposits, total_withdrawals, transaction_count
  ) VALUES (
    v_user_id, p_account_id, v_period_start, v_period_end,
    v_opening_balance, v_closing_balance, v_total_deposits, v_total_withdrawals, v_transaction_count
  )
  ON CONFLICT (account_id, statement_period_start) DO UPDATE SET
    closing_balance = EXCLUDED.closing_balance,
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    transaction_count = EXCLUDED.transaction_count,
    updated_at = now()
  RETURNING id INTO v_statement_id;
  
  RETURN v_statement_id;
END;
$function$;