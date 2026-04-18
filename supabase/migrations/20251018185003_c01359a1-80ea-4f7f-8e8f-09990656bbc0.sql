-- Create function to allow admins to clear security code temporary locks
CREATE OR REPLACE FUNCTION public.admin_clear_security_lock(p_user_id uuid)
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
  
  -- Clear the security lock
  UPDATE public.user_security
  SET 
    account_locked_until = NULL,
    failed_verification_attempts = 0,
    last_failed_attempt = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the admin activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'security_lock_cleared',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'cleared_at', now()
    )::text
  );
  
  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;