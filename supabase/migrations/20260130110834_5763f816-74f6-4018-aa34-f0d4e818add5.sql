-- Create a secure function to lookup intrabank transfer recipients
-- This bypasses RLS to allow users to look up other accounts for transfers
-- while only exposing minimal required information

CREATE OR REPLACE FUNCTION lookup_intrabank_recipient(
  p_account_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
  v_currency TEXT;
  v_full_name TEXT;
  v_caller_id UUID;
BEGIN
  -- Get the calling user's ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Look up the account
  SELECT id, user_id, currency
  INTO v_account_id, v_user_id, v_currency
  FROM accounts
  WHERE account_number = p_account_number
    AND status = 'active'
    AND hidden = false;
  
  IF v_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;
  
  -- Check if it's the caller's own account
  IF v_user_id = v_caller_id THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot transfer to your own account. Use "Between My Accounts" instead.'
    );
  END IF;
  
  -- Get the account holder's name
  SELECT full_name INTO v_full_name
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_full_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account holder not found');
  END IF;
  
  -- Return limited information (no balance, just what's needed for transfer)
  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'full_name', v_full_name,
    'currency', v_currency
  );
END;
$$;