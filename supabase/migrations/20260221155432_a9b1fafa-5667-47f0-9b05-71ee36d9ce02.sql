
-- Drop old functions that have incompatible return types
DROP FUNCTION IF EXISTS public.get_account_transfer_limit(UUID);
DROP FUNCTION IF EXISTS public.set_account_transfer_limit(UUID, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.check_transfer_limit(UUID, NUMERIC);

-- Rewrite set_account_transfer_limit to actually store limits
CREATE OR REPLACE FUNCTION public.set_account_transfer_limit(
  account_id UUID,
  daily_limit NUMERIC,
  single_transaction_limit NUMERIC,
  custom_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.transfer_limits (account_id, daily_limit, single_transaction_limit, custom_message, updated_at)
  VALUES (account_id, daily_limit, single_transaction_limit, custom_message, now())
  ON CONFLICT (account_id) DO UPDATE SET
    daily_limit = EXCLUDED.daily_limit,
    single_transaction_limit = EXCLUDED.single_transaction_limit,
    custom_message = EXCLUDED.custom_message,
    updated_at = now();

  RETURN json_build_object('success', true, 'message', 'Transfer limit set successfully');
END;
$$;

-- Rewrite get_account_transfer_limit to actually read from table
CREATE OR REPLACE FUNCTION public.get_account_transfer_limit(account_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit RECORD;
BEGIN
  SELECT tl.daily_limit, tl.single_transaction_limit, tl.custom_message
  INTO v_limit
  FROM public.transfer_limits tl
  WHERE tl.account_id = get_account_transfer_limit.account_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'daily_limit', v_limit.daily_limit,
    'single_transaction_limit', v_limit.single_transaction_limit,
    'custom_message', v_limit.custom_message
  );
END;
$$;

-- Rewrite check_transfer_limit to actually enforce limits
CREATE OR REPLACE FUNCTION public.check_transfer_limit(p_account_id UUID, p_amount NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit RECORD;
  v_default_message TEXT;
BEGIN
  SELECT tl.daily_limit, tl.single_transaction_limit, tl.custom_message
  INTO v_limit
  FROM public.transfer_limits tl
  WHERE tl.account_id = p_account_id;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', true);
  END IF;

  IF v_limit.single_transaction_limit > 0 AND p_amount > v_limit.single_transaction_limit THEN
    v_default_message := 'Your transfer request exceeds the current limit of $' || 
      trim(to_char(v_limit.single_transaction_limit, 'FM999,999,999.00')) || 
      ' for your account. Please contact customer support to review your account restrictions or request an increase.';
    
    RETURN json_build_object(
      'allowed', false,
      'message', COALESCE(v_limit.custom_message, v_default_message),
      'limit', v_limit.single_transaction_limit
    );
  END IF;

  RETURN json_build_object('allowed', true);
END;
$$;
