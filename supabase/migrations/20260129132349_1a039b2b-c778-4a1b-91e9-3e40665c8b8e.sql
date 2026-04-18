-- Fix: Internal Transfer Reference Number Unique Constraint Violation
-- Drop and recreate the function with unique reference numbers for debit and credit transactions

DROP FUNCTION IF EXISTS public.process_internal_transfer_with_conversion(UUID, UUID, NUMERIC, NUMERIC, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.process_internal_transfer_with_conversion(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_converted_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_account RECORD;
  v_to_account RECORD;
  v_new_from_balance NUMERIC;
  v_new_to_balance NUMERIC;
  v_reference_number TEXT;
  v_debit_reference TEXT;
  v_credit_reference TEXT;
  v_transfer_id UUID;
  v_description TEXT;
BEGIN
  -- Lock and get source account
  SELECT * INTO v_from_account
  FROM accounts
  WHERE id = p_from_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Source account not found');
  END IF;

  -- Check sufficient balance
  IF v_from_account.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Check if transfers are blocked
  IF v_from_account.transfers_blocked = true THEN
    RETURN json_build_object('success', false, 'error', 'Transfers are blocked on this account');
  END IF;

  -- Lock and get destination account
  SELECT * INTO v_to_account
  FROM accounts
  WHERE id = p_to_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Destination account not found');
  END IF;

  -- Generate base reference number and unique references for each transaction
  v_reference_number := 'INT-' || EXTRACT(EPOCH FROM now())::BIGINT;
  v_debit_reference := v_reference_number || '-DEB';
  v_credit_reference := v_reference_number || '-CRE';

  -- Calculate new balances
  v_new_from_balance := v_from_account.balance - p_amount;
  v_new_to_balance := v_to_account.balance + p_converted_amount;

  -- Build description with conversion details
  IF p_from_currency != p_to_currency THEN
    v_description := COALESCE(p_description, 'Internal Transfer') || ' (' || p_from_currency || ' ' || p_amount || ' → ' || p_to_currency || ' ' || p_converted_amount || ')';
  ELSE
    v_description := COALESCE(p_description, 'Internal Transfer');
  END IF;

  -- Update source account balance
  UPDATE accounts
  SET balance = v_new_from_balance,
      updated_at = now()
  WHERE id = p_from_account_id;

  -- Update destination account balance
  UPDATE accounts
  SET balance = v_new_to_balance,
      updated_at = now()
  WHERE id = p_to_account_id;

  -- Create transfer record (uses base reference)
  INSERT INTO transfers (
    from_account_id,
    to_account_id,
    amount,
    description,
    status,
    reference_number
  ) VALUES (
    p_from_account_id,
    p_to_account_id,
    p_amount,
    v_description,
    'completed',
    v_reference_number
  ) RETURNING id INTO v_transfer_id;

  -- Create DEBIT transaction for source account (with unique -DEB reference)
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    completed_at,
    reference_number
  ) VALUES (
    p_from_account_id,
    'withdrawal',
    -p_amount,
    v_new_from_balance,
    v_description,
    'completed',
    now(),
    v_debit_reference
  );

  -- Create CREDIT transaction for destination account (with unique -CRE reference)
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    completed_at,
    reference_number
  ) VALUES (
    p_to_account_id,
    'deposit',
    p_converted_amount,
    v_new_to_balance,
    v_description,
    'completed',
    now(),
    v_credit_reference
  );

  -- Try to send email notification (non-blocking)
  BEGIN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-transaction-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', v_from_account.user_id,
        'transaction_type', 'transfer',
        'amount', p_amount,
        'description', v_description,
        'reference_number', v_reference_number
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send transaction email alert: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number,
    'from_new_balance', v_new_from_balance,
    'to_new_balance', v_new_to_balance
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;