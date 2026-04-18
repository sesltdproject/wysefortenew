-- Fix the crypto deposit approval function - UUID variable issue
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_type text, p_deposit_id uuid, p_status text, p_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deposit_record RECORD;
  v_rows_affected INTEGER;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Handle check deposits
  IF p_deposit_type = 'check' THEN
    -- Get the check deposit record
    SELECT cd.*, a.balance as account_balance 
    INTO v_deposit_record
    FROM check_deposits cd
    JOIN accounts a ON cd.account_id = a.id
    WHERE cd.id = p_deposit_id;
    
    IF v_deposit_record.id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Check deposit not found');
    END IF;
    
    -- Update check deposit status
    UPDATE check_deposits 
    SET status = p_status, 
        admin_notes = p_notes,
        processed_at = NOW(),
        processed_by = auth.uid()
    WHERE id = p_deposit_id;
    
    -- If approved, update account balance and transaction
    IF p_status = 'approved' THEN
      -- Update account balance
      UPDATE accounts 
      SET balance = balance + v_deposit_record.amount,
          updated_at = NOW()
      WHERE id = v_deposit_record.account_id;
      
      -- Update the pending transaction to completed
      UPDATE transactions 
      SET status = 'completed',
          description = 'Check Deposit - Approved',
          updated_at = NOW()
      WHERE account_id = v_deposit_record.account_id 
        AND description LIKE 'Check Deposit - Pending%'
        AND amount = v_deposit_record.amount
        AND status = 'pending'
        AND created_at::date = v_deposit_record.created_at::date;
    END IF;
    
  -- Handle crypto deposits
  ELSIF p_deposit_type = 'crypto' THEN
    -- Get the crypto deposit record
    SELECT cd.*, a.balance as account_balance 
    INTO v_deposit_record
    FROM crypto_deposits cd
    JOIN accounts a ON cd.account_id = a.id
    WHERE cd.id = p_deposit_id;
    
    IF v_deposit_record.id IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Crypto deposit not found');
    END IF;
    
    -- Update crypto deposit status
    UPDATE crypto_deposits 
    SET status = p_status, 
        admin_notes = p_notes,
        processed_at = NOW(),
        processed_by = auth.uid()
    WHERE id = p_deposit_id;
    
    -- If approved, update account balance and transaction
    IF p_status = 'approved' THEN
      -- Update account balance
      UPDATE accounts 
      SET balance = balance + v_deposit_record.amount,
          updated_at = NOW()
      WHERE id = v_deposit_record.account_id;
      
      -- Update the pending transaction to completed - using the exact reference pattern
      UPDATE transactions 
      SET status = 'completed',
          description = v_deposit_record.crypto_type || ' Crypto Deposit - Approved',
          updated_at = NOW()
      WHERE reference_number = 'CRY-PEN-' || SUBSTRING(v_deposit_record.id::text, 1, 8)
        AND status = 'pending'
        AND account_id = v_deposit_record.account_id;
        
      -- Check if any rows were updated and create new transaction if needed
      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
      IF v_rows_affected = 0 THEN
        INSERT INTO transactions (
          account_id, 
          transaction_type, 
          amount, 
          description, 
          reference_number, 
          status
        ) VALUES (
          v_deposit_record.account_id,
          'deposit',
          v_deposit_record.amount,
          v_deposit_record.crypto_type || ' Crypto Deposit - Approved',
          'CRY-APP-' || SUBSTRING(v_deposit_record.id::text, 1, 8),
          'completed'
        );
      END IF;
    END IF;
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid deposit type');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Deposit status updated successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Failed to update deposit: ' || SQLERRM);
END;
$function$;