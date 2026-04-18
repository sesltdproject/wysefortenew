-- Update process_internal_transfer function to use shorter, direction-specific descriptions
CREATE OR REPLACE FUNCTION public.process_internal_transfer(p_from_account_id uuid, p_to_account_id uuid, p_amount numeric, p_description text DEFAULT 'Internal transfer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_from_account_user_id UUID;
  v_to_account_user_id UUID;
  v_from_balance NUMERIC;
  v_from_account_type TEXT;
  v_from_account_number TEXT;
  v_to_account_type TEXT;
  v_to_account_number TEXT;
  v_transfer_id UUID;
  v_reference_number TEXT;
  v_debit_ref TEXT;
  v_credit_ref TEXT;
  v_debit_description TEXT;
  v_credit_description TEXT;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify both accounts belong to the user and get account details
  SELECT user_id, balance, account_type, account_number 
  INTO v_from_account_user_id, v_from_balance, v_from_account_type, v_from_account_number
  FROM public.accounts
  WHERE id = p_from_account_id;
  
  IF v_from_account_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source account not found');
  END IF;
  
  IF v_from_account_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Source account does not belong to user');
  END IF;
  
  SELECT user_id, account_type, account_number 
  INTO v_to_account_user_id, v_to_account_type, v_to_account_number
  FROM public.accounts
  WHERE id = p_to_account_id;
  
  IF v_to_account_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination account not found');
  END IF;
  
  IF v_to_account_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Destination account does not belong to user');
  END IF;
  
  -- Check sufficient balance
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Generate three unique reference numbers
  v_reference_number := 'INT' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  v_debit_ref := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  v_credit_ref := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  
  -- Generate shorter, direction-specific descriptions
  v_debit_description := 'Internal Transfer (Debit) - From ' || INITCAP(v_from_account_type) || ' (' || v_from_account_number || ')';
  v_credit_description := 'Internal Transfer (Credit) - To ' || INITCAP(v_to_account_type) || ' (' || v_to_account_number || ')';
  
  -- Deduct from source account
  UPDATE public.accounts
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = p_from_account_id;
  
  -- Add to destination account
  UPDATE public.accounts
  SET balance = balance + p_amount,
      updated_at = NOW()
  WHERE id = p_to_account_id;
  
  -- Create transfer record
  INSERT INTO public.transfers (
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
    p_description,
    'completed',
    v_reference_number
  )
  RETURNING id INTO v_transfer_id;
  
  -- Create transaction record for source account (debit) with shorter description
  INSERT INTO public.transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    reference_number,
    completed_at
  ) VALUES (
    p_from_account_id,
    'transfer',
    -p_amount,
    v_debit_description,
    'completed',
    v_debit_ref,
    NOW()
  );
  
  -- Create transaction record for destination account (credit) with shorter description
  INSERT INTO public.transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    reference_number,
    completed_at
  ) VALUES (
    p_to_account_id,
    'transfer',
    p_amount,
    v_credit_description,
    'completed',
    v_credit_ref,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'reference_number', v_reference_number
  );
END;
$function$;