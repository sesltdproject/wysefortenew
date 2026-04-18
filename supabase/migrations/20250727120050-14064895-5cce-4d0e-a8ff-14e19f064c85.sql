-- Create function to process international transfers with immediate debiting
CREATE OR REPLACE FUNCTION public.process_international_transfer(
  p_from_account_id UUID,
  p_swift_code TEXT,
  p_bank_name TEXT,
  p_bank_address TEXT,
  p_recipient_name TEXT,
  p_recipient_address TEXT,
  p_recipient_account_number TEXT,
  p_amount NUMERIC,
  p_purpose_of_transfer TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_iban TEXT DEFAULT NULL,
  p_correspondent_bank TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account accounts%ROWTYPE;
  v_remittance_id UUID;
  v_reference_number TEXT;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
  END IF;

  -- Get account details and verify ownership
  SELECT * INTO v_account FROM accounts WHERE id = p_from_account_id AND user_id = auth.uid();
  
  IF v_account.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Account not found or not owned by user');
  END IF;
  
  -- Check account status
  IF v_account.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Account is not active. Only active accounts can process transactions.');
  END IF;
  
  -- Check sufficient balance
  IF v_account.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Generate reference number
  v_reference_number := 'FR-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
  
  -- Start transaction
  BEGIN
    -- Immediately debit the account
    UPDATE accounts 
    SET balance = balance - p_amount, updated_at = NOW() 
    WHERE id = p_from_account_id;
    
    -- Create foreign remittance record
    INSERT INTO foreign_remittances (
      user_id,
      from_account_id,
      amount,
      swift_code,
      iban,
      correspondent_bank,
      bank_name,
      bank_address,
      recipient_name,
      recipient_address,
      recipient_account_number,
      reference_number,
      purpose_of_transfer,
      priority,
      status
    ) VALUES (
      auth.uid(),
      p_from_account_id,
      p_amount,
      p_swift_code,
      p_iban,
      p_correspondent_bank,
      p_bank_name,
      p_bank_address,
      p_recipient_name,
      p_recipient_address,
      p_recipient_account_number,
      v_reference_number,
      p_purpose_of_transfer,
      p_priority,
      'pending'
    )
    RETURNING id INTO v_remittance_id;
    
    -- Create pending transaction record
    INSERT INTO transactions (
      account_id,
      transaction_type,
      amount,
      description,
      reference_number,
      status,
      recipient_name,
      recipient_account
    ) VALUES (
      p_from_account_id,
      'transfer',
      p_amount,
      'International Transfer to ' || p_recipient_name || ' - Pending Approval',
      v_reference_number,
      'pending',
      p_recipient_name,
      p_recipient_account_number
    );
    
    v_result := json_build_object(
      'success', true, 
      'remittance_id', v_remittance_id,
      'reference_number', v_reference_number,
      'message', 'International transfer submitted successfully and funds debited from account'
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Transfer failed: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$$;