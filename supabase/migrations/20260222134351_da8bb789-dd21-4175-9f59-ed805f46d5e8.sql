
DROP FUNCTION IF EXISTS public.set_account_transfer_limit(uuid, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.get_account_transfer_limit(uuid);

CREATE OR REPLACE FUNCTION public.set_account_transfer_limit(
  p_account_id UUID,
  p_daily_limit NUMERIC,
  p_single_transaction_limit NUMERIC,
  p_custom_message TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  INSERT INTO public.transfer_limits (account_id, daily_limit, single_transaction_limit, custom_message, updated_at)
  VALUES (p_account_id, p_daily_limit, p_single_transaction_limit, p_custom_message, now())
  ON CONFLICT (account_id)
  DO UPDATE SET
    daily_limit = EXCLUDED.daily_limit,
    single_transaction_limit = EXCLUDED.single_transaction_limit,
    custom_message = EXCLUDED.custom_message,
    updated_at = now();

  RETURN json_build_object('success', true, 'message', 'Transfer limit set successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_transfer_limit(
  p_account_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'daily_limit', tl.daily_limit,
    'single_transaction_limit', tl.single_transaction_limit,
    'custom_message', tl.custom_message
  ) INTO result
  FROM public.transfer_limits tl
  WHERE tl.account_id = p_account_id;

  RETURN result;
END;
$$;
