-- Update admin_approve_deposit function to create transaction records
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(deposit_id uuid, deposit_type text, approve boolean, notes text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deposit_record RECORD;
  new_status deposit_status;
  transaction_ref TEXT;
  existing_transaction_id UUID;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  new_status := CASE WHEN approve THEN 'approved' ELSE 'rejected' END;
  
  IF deposit_type = 'check' THEN
    -- Get deposit record
    UPDATE public.check_deposits
    SET status = new_status,
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = deposit_id
    RETURNING * INTO deposit_record;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Check deposit not found';
    END IF;
    
    -- Generate reference number
    transaction_ref := 'CHK-DEP-' || SUBSTRING(deposit_id::TEXT FROM 1 FOR 8);
    
    -- Check if transaction already exists
    SELECT id INTO existing_transaction_id
    FROM public.transactions
    WHERE reference_number = transaction_ref;
    
    IF existing_transaction_id IS NULL THEN
      -- Create new transaction
      INSERT INTO public.transactions (
        account_id,
        transaction_type,
        amount,
        description,
        status,
        reference_number,
        completed_at
      ) VALUES (
        deposit_record.account_id,
        'deposit',
        deposit_record.amount,
        'Check Deposit #' || deposit_record.check_number,
        CASE WHEN approve THEN 'completed'::transaction_status ELSE 'failed'::transaction_status END,
        transaction_ref,
        CASE WHEN approve THEN now() ELSE NULL END
      );
    ELSE
      -- Update existing transaction
      UPDATE public.transactions
      SET status = CASE WHEN approve THEN 'completed'::transaction_status ELSE 'failed'::transaction_status END,
          completed_at = CASE WHEN approve THEN now() ELSE NULL END
      WHERE id = existing_transaction_id;
    END IF;
    
    -- Update account balance if approved
    IF approve THEN
      UPDATE public.accounts
      SET balance = balance + deposit_record.amount
      WHERE id = deposit_record.account_id;
    END IF;
    
  ELSIF deposit_type = 'crypto' THEN
    -- Get deposit record
    UPDATE public.crypto_deposits
    SET status = new_status,
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = deposit_id
    RETURNING * INTO deposit_record;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Crypto deposit not found';
    END IF;
    
    -- Generate reference number
    transaction_ref := 'CRY-DEP-' || SUBSTRING(deposit_id::TEXT FROM 1 FOR 8);
    
    -- Check if transaction already exists
    SELECT id INTO existing_transaction_id
    FROM public.transactions
    WHERE reference_number = transaction_ref;
    
    IF existing_transaction_id IS NULL THEN
      -- Create new transaction
      INSERT INTO public.transactions (
        account_id,
        transaction_type,
        amount,
        description,
        status,
        reference_number,
        completed_at
      ) VALUES (
        deposit_record.account_id,
        'deposit',
        deposit_record.amount,
        deposit_record.crypto_type || ' Crypto Deposit',
        CASE WHEN approve THEN 'completed'::transaction_status ELSE 'failed'::transaction_status END,
        transaction_ref,
        CASE WHEN approve THEN now() ELSE NULL END
      );
    ELSE
      -- Update existing transaction
      UPDATE public.transactions
      SET status = CASE WHEN approve THEN 'completed'::transaction_status ELSE 'failed'::transaction_status END,
          completed_at = CASE WHEN approve THEN now() ELSE NULL END
      WHERE id = existing_transaction_id;
    END IF;
    
    -- Update account balance if approved
    IF approve THEN
      UPDATE public.accounts
      SET balance = balance + deposit_record.amount
      WHERE id = deposit_record.account_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid deposit type';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$function$;