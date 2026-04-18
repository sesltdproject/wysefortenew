-- Fix search path for the credential validation function
CREATE OR REPLACE FUNCTION public.validate_user_credentials(p_email text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_encrypted_pass TEXT;
  v_profile_data RECORD;
  v_security_data RECORD;
BEGIN
  -- Get user from auth.users table (we can only read basic info)
  SELECT au.id, au.encrypted_password 
  INTO v_user_id, v_encrypted_pass
  FROM auth.users au 
  WHERE au.email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Note: We cannot validate password hash directly in our function
  -- since Supabase handles password verification internally.
  -- This function will be used to get user info after credential validation
  
  -- Get profile data
  SELECT * INTO v_profile_data 
  FROM public.profiles 
  WHERE id = v_user_id;
  
  IF v_profile_data.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Check if account is locked
  IF v_profile_data.account_locked = true THEN
    RETURN json_build_object('success', false, 'error', 'Account is locked', 'account_locked', true);
  END IF;
  
  -- Check admin portal restrictions
  IF v_profile_data.role = 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Admin accounts cannot login through customer portal');
  END IF;
  
  -- Get security settings
  SELECT * INTO v_security_data 
  FROM public.user_security 
  WHERE user_id = v_user_id;
  
  -- Return user info and security settings
  RETURN json_build_object(
    'success', true, 
    'user_id', v_user_id,
    'profile', row_to_json(v_profile_data),
    'security_code_enabled', COALESCE(v_security_data.security_code_enabled, false)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Validation failed: ' || SQLERRM);
END;
$function$;