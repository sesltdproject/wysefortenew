
CREATE OR REPLACE FUNCTION public.set_account_transfer_limit(
  account_id UUID,
  daily_limit NUMERIC,
  single_transaction_limit NUMERIC,
  custom_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.transfer_limits (account_id, daily_limit, single_transaction_limit, custom_message, updated_at)
  VALUES (set_account_transfer_limit.account_id, set_account_transfer_limit.daily_limit, set_account_transfer_limit.single_transaction_limit, set_account_transfer_limit.custom_message, now())
  ON CONFLICT (account_id) DO UPDATE SET
    daily_limit = EXCLUDED.daily_limit,
    single_transaction_limit = EXCLUDED.single_transaction_limit,
    custom_message = EXCLUDED.custom_message,
    updated_at = now();

  RETURN json_build_object('success', true, 'message', 'Transfer limit set successfully');
END;
$$;
