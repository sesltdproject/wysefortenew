-- Fix admin_delete_transaction to properly reverse account balance
CREATE OR REPLACE FUNCTION public.admin_delete_transaction(transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Get transaction details before deletion
  SELECT * INTO v_transaction 
  FROM public.transactions 
  WHERE id = transaction_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;
  
  -- Reverse the transaction amount on the account
  -- If the transaction was positive (credit/deposit), subtract it
  -- If the transaction was negative (debit/withdrawal), add it back
  UPDATE public.accounts
  SET balance = balance - v_transaction.amount,
      updated_at = now()
  WHERE id = v_transaction.account_id;
  
  -- Delete the transaction
  DELETE FROM public.transactions WHERE id = transaction_id;
  
  -- Log admin activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'transaction_deleted',
    jsonb_build_object(
      'transaction_id', transaction_id,
      'account_id', v_transaction.account_id,
      'amount_reversed', v_transaction.amount,
      'original_type', v_transaction.transaction_type,
      'description', v_transaction.description
    )::text
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Transaction deleted and balance adjusted',
    'amount_reversed', v_transaction.amount
  );
END;
$$;