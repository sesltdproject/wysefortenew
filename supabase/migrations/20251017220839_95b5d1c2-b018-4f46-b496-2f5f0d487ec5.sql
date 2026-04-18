-- Add created_by column to transactions table to track admin-created transactions
ALTER TABLE public.transactions 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX idx_transactions_created_by ON public.transactions(created_by);

-- Update admin_create_transaction function to set created_by
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_account_id uuid, 
  p_transaction_type transaction_type, 
  p_amount numeric, 
  p_description text DEFAULT NULL::text, 
  p_status transaction_status DEFAULT 'completed'::transaction_status
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
  
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    completed_at,
    created_by
  ) VALUES (
    p_account_id,
    p_transaction_type,
    p_amount,
    p_description,
    p_status,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
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