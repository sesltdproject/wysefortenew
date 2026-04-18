-- Update admin_create_transaction function to accept transaction date parameter
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_account_id uuid, 
  p_transaction_type transaction_type, 
  p_amount numeric, 
  p_description text DEFAULT NULL::text, 
  p_status transaction_status DEFAULT 'completed'::transaction_status,
  p_transaction_date timestamp with time zone DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_transaction_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Input validation: amount cannot be zero
  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount cannot be zero');
  END IF;
  
  -- Input validation: decimal precision (max 2 decimal places)
  IF p_amount::TEXT ~ '\.\d{3,}' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must have at most 2 decimal places');
  END IF;
  
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    completed_at,
    created_at,
    created_by
  ) VALUES (
    p_account_id,
    p_transaction_type,
    p_amount,
    p_description,
    p_status,
    CASE WHEN p_status = 'completed' THEN p_transaction_date ELSE NULL END,
    p_transaction_date,
    auth.uid()
  )
  RETURNING id INTO new_transaction_id;
  
  IF p_status = 'completed' THEN
    UPDATE accounts 
    SET balance = balance + p_amount 
    WHERE id = p_account_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', new_transaction_id);
END;
$function$;