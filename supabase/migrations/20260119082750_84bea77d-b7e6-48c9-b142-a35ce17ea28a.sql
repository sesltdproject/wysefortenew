-- Add transfer block columns to accounts table
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS transfers_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transfers_blocked_message TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transfers_blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transfers_blocked_by UUID DEFAULT NULL;

-- Create function to disable security code for a user (admin only)
CREATE OR REPLACE FUNCTION public.admin_disable_security_code(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify the requesting user is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Disable security code and clear related data
  UPDATE public.user_security
  SET 
    security_code_enabled = false,
    security_code_hash = NULL,
    account_locked_until = NULL,
    failed_verification_attempts = 0,
    last_failed_attempt = NULL,
    backup_codes = '[]'::jsonb,
    backup_codes_generated_at = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the admin activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'security_code_disabled',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'disabled_at', now()
    )::text
  );
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- Create function to toggle account transfer block (admin only)
CREATE OR REPLACE FUNCTION public.admin_toggle_account_transfer_block(
  p_account_id uuid,
  p_blocked boolean,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_account_number text;
BEGIN
  -- Verify the requesting user is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get account number for logging
  SELECT account_number INTO v_account_number
  FROM public.accounts WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found');
  END IF;
  
  -- Validate message is provided when blocking
  IF p_blocked AND (p_message IS NULL OR trim(p_message) = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Block message is required when blocking transfers');
  END IF;
  
  -- Update the account
  UPDATE public.accounts
  SET 
    transfers_blocked = p_blocked,
    transfers_blocked_message = CASE WHEN p_blocked THEN p_message ELSE NULL END,
    transfers_blocked_at = CASE WHEN p_blocked THEN now() ELSE NULL END,
    transfers_blocked_by = CASE WHEN p_blocked THEN auth.uid() ELSE NULL END,
    updated_at = now()
  WHERE id = p_account_id;
  
  -- Log the admin activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_blocked THEN 'account_transfers_blocked' ELSE 'account_transfers_unblocked' END,
    jsonb_build_object(
      'account_id', p_account_id,
      'account_number', v_account_number,
      'blocked', p_blocked,
      'message', p_message
    )::text
  );
  
  RETURN jsonb_build_object('success', true, 'account_id', p_account_id, 'blocked', p_blocked);
END;
$$;