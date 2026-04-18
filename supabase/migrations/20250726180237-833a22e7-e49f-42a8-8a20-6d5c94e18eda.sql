-- Update the foreign remittance approval function to handle immediate debit and refunds
CREATE OR REPLACE FUNCTION public.approve_foreign_remittance(p_remittance_id uuid, p_action text, p_admin_notes text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remittance foreign_remittances%ROWTYPE;
  v_account accounts%ROWTYPE;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Validate action
  IF p_action NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid action. Must be approved or rejected');
  END IF;

  -- Get the remittance record
  SELECT * INTO v_remittance FROM foreign_remittances WHERE id = p_remittance_id;
  
  IF v_remittance.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Foreign remittance not found');
  END IF;
  
  -- Check if already processed
  IF v_remittance.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Transfer has already been processed');
  END IF;

  -- Start transaction
  BEGIN
    -- Update remittance status
    UPDATE foreign_remittances 
    SET status = p_action,
        approved_by = auth.uid(),
        approved_at = NOW(),
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_remittance_id;
    
    -- If approved, just update the transaction to completed (funds were already debited)
    IF p_action = 'approved' THEN
      -- Update the pending transaction to completed
      UPDATE transactions 
      SET status = 'completed',
          description = 'International Transfer to ' || v_remittance.recipient_name || ' - Approved',
          updated_at = NOW()
      WHERE reference_number = v_remittance.reference_number
        AND status = 'pending'
        AND account_id = v_remittance.from_account_id;
        
    -- If rejected, refund the amount back to the account and mark transaction as rejected
    ELSE
      -- Get account details
      SELECT * INTO v_account FROM accounts WHERE id = v_remittance.from_account_id;
      
      IF v_account.id IS NOT NULL THEN
        -- Credit the amount back to the account (refund)
        UPDATE accounts 
        SET balance = balance + v_remittance.amount,
            updated_at = NOW()
        WHERE id = v_remittance.from_account_id;
        
        -- Update the pending transaction to rejected
        UPDATE transactions 
        SET status = 'rejected',
            description = 'International Transfer to ' || v_remittance.recipient_name || ' - Rejected (Refunded)',
            updated_at = NOW()
        WHERE reference_number = v_remittance.reference_number
          AND status = 'pending'
          AND account_id = v_remittance.from_account_id;
          
        -- Create a separate refund transaction for clarity
        INSERT INTO transactions (
          account_id,
          transaction_type,
          amount,
          description,
          reference_number,
          status,
          created_at
        ) VALUES (
          v_remittance.from_account_id,
          'deposit',
          v_remittance.amount,
          'Refund for rejected international transfer to ' || v_remittance.recipient_name,
          'REF-' || SUBSTRING(v_remittance.reference_number, 4),
          'completed',
          NOW()
        );
      END IF;
    END IF;
    
    v_result := json_build_object(
      'success', true, 
      'message', 'Transfer ' || p_action || ' successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Failed to process approval: ' || SQLERRM);
  END;
  
  RETURN v_result;
END;
$function$;