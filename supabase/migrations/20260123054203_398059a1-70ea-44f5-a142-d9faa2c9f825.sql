-- Fix approve_foreign_remittance to use valid transaction_type enum value ('deposit' instead of 'credit')
CREATE OR REPLACE FUNCTION public.approve_foreign_remittance(
  remittance_id UUID,
  approve BOOLEAN,
  notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remittance RECORD;
  v_new_balance NUMERIC;
  v_reversal_ref TEXT;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get remittance with lock
  SELECT * INTO v_remittance
  FROM public.foreign_remittances
  WHERE id = remittance_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remittance not found');
  END IF;
  
  IF v_remittance.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Remittance already processed');
  END IF;
  
  IF approve THEN
    -- APPROVAL: Update remittance and transaction to completed
    UPDATE public.foreign_remittances
    SET status = 'approved',
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        completed_at = now()
    WHERE id = remittance_id;
    
    UPDATE public.transactions
    SET status = 'completed',
        completed_at = now(),
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        description = 'International Transfer to ' || v_remittance.recipient_name || ' (Completed)'
    WHERE reference_number = v_remittance.reference_number
      AND status = 'pending';
    
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (auth.uid(), 'international_transfer_approved', 
      'Approved international transfer of ' || v_remittance.amount || ' ' || v_remittance.currency || ' to ' || v_remittance.recipient_name
    );
    
    RETURN jsonb_build_object('success', true, 'message', 'Transfer approved successfully');
    
  ELSE
    -- REJECTION: Reverse the debit
    UPDATE public.accounts
    SET balance = balance + v_remittance.amount,
        updated_at = now()
    WHERE id = v_remittance.account_id
    RETURNING balance INTO v_new_balance;
    
    UPDATE public.foreign_remittances
    SET status = 'rejected',
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = remittance_id;
    
    UPDATE public.transactions
    SET status = 'failed',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        description = 'International Transfer to ' || v_remittance.recipient_name || ' (Rejected: ' || COALESCE(notes, 'No reason provided') || ')'
    WHERE reference_number = v_remittance.reference_number
      AND status = 'pending';
    
    v_reversal_ref := 'REV-' || v_remittance.reference_number;
    
    -- FIX: Use 'deposit' instead of 'credit' (valid enum value)
    INSERT INTO public.transactions (
      account_id,
      transaction_type,
      amount,
      balance_after,
      description,
      status,
      reference_number,
      completed_at,
      reviewed_by,
      reviewed_at
    ) VALUES (
      v_remittance.account_id,
      'deposit',
      v_remittance.amount,
      v_new_balance,
      'Reversal: International Transfer to ' || v_remittance.recipient_name || ' rejected - ' || COALESCE(notes, 'Transfer rejected by admin'),
      'completed',
      v_reversal_ref,
      now(),
      auth.uid(),
      now()
    );
    
    INSERT INTO admin_activities (admin_id, action, details)
    VALUES (auth.uid(), 'international_transfer_rejected', 
      'Rejected international transfer of ' || v_remittance.amount || ' ' || v_remittance.currency || ' to ' || v_remittance.recipient_name || '. Funds returned to customer. Reason: ' || COALESCE(notes, 'No reason provided')
    );
    
    RETURN jsonb_build_object(
      'success', true, 
      'message', 'Transfer rejected and funds returned to customer account'
    );
  END IF;
END;
$$;