-- Create admin function to approve deposits with proper security definer privileges
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  p_deposit_type TEXT, -- 'check' or 'crypto'
  p_deposit_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_deposit_record RECORD;
  v_transaction_id UUID;
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
      
      -- Update the pending transaction to completed
      UPDATE transactions 
      SET status = 'completed',
          description = 'Crypto Deposit - Approved (' || v_deposit_record.crypto_type || ')',
          updated_at = NOW()
      WHERE account_id = v_deposit_record.account_id 
        AND description LIKE 'Crypto Deposit - Pending%'
        AND amount = v_deposit_record.amount
        AND status = 'pending'
        AND created_at::date = v_deposit_record.created_at::date;
    END IF;
    
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid deposit type');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Deposit status updated successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Failed to update deposit: ' || SQLERRM);
END;
$function$;

-- Update the get_admin_notification_counts function to include deposits
CREATE OR REPLACE FUNCTION public.get_admin_notification_counts()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT json_build_object(
    'supportTickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'pendingTransfers', (SELECT COUNT(*) FROM foreign_remittances WHERE status = 'pending'),
    'pendingLoans', (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending'),
    'pendingKYC', (SELECT COUNT(*) FROM kyc_documents WHERE verification_status = 'pending'),
    'pendingCheckDeposits', (SELECT COUNT(*) FROM check_deposits WHERE status = 'pending'),
    'pendingCryptoDeposits', (SELECT COUNT(*) FROM crypto_deposits WHERE status = 'pending')
  );
$function$;