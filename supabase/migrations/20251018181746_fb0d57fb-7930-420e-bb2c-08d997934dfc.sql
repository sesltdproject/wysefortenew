-- Fix verify_security_code function - rename variables to avoid ambiguity
DROP FUNCTION IF EXISTS public.verify_security_code(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.verify_security_code(p_user_id uuid, p_code text, p_ip_address text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_stored_hash text;
  v_backup_codes_data jsonb;
  v_code_obj jsonb;
  v_failed_attempts integer;
  v_account_locked_until timestamp with time zone;
  v_recent_attempt_count integer;
  v_lockout_duration interval;
BEGIN
  -- Check if account is temporarily locked
  SELECT 
    failed_verification_attempts,
    account_locked_until
  INTO 
    v_failed_attempts,
    v_account_locked_until
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  -- Check if account is currently locked
  IF v_account_locked_until IS NOT NULL AND v_account_locked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Account temporarily locked due to too many failed attempts. Please try again later.',
      'locked_until', v_account_locked_until
    );
  END IF;
  
  -- Check rate limiting: max 5 attempts in last 15 minutes
  SELECT COUNT(*) INTO v_recent_attempt_count
  FROM public.security_code_verification_attempts
  WHERE user_id = p_user_id 
    AND attempt_time > now() - interval '15 minutes';
  
  IF v_recent_attempt_count >= 5 THEN
    -- Lock account for 15 minutes
    UPDATE public.user_security
    SET account_locked_until = now() + interval '15 minutes'
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Too many verification attempts. Account locked for 15 minutes.',
      'locked_until', now() + interval '15 minutes'
    );
  END IF;
  
  -- Get security code hash and backup codes
  SELECT security_code_hash, backup_codes 
  INTO v_stored_hash, v_backup_codes_data
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  -- Check if it matches the primary security code
  IF v_stored_hash IS NOT NULL AND v_stored_hash = crypt(p_code, v_stored_hash) THEN
    -- Log successful attempt
    INSERT INTO public.security_code_verification_attempts (
      user_id, ip_address, user_agent, success
    ) VALUES (
      p_user_id, p_ip_address, p_user_agent, true
    );
    
    -- Reset failed attempts counter and unlock account
    UPDATE public.user_security
    SET 
      failed_verification_attempts = 0,
      last_failed_attempt = NULL,
      account_locked_until = NULL
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'type', 'security_code');
  END IF;
  
  -- Check if it matches any unused backup code
  IF v_backup_codes_data IS NOT NULL THEN
    FOR v_code_obj IN SELECT * FROM jsonb_array_elements(v_backup_codes_data)
    LOOP
      IF (v_code_obj->>'used')::boolean = false AND 
         (v_code_obj->>'code_hash') = crypt(p_code, (v_code_obj->>'code_hash')) THEN
        -- Mark this backup code as used
        UPDATE public.user_security
        SET backup_codes = (
          SELECT jsonb_agg(
            CASE 
              WHEN elem->>'code_hash' = v_code_obj->>'code_hash' 
              THEN jsonb_set(elem, '{used}', 'true'::jsonb)
              ELSE elem
            END
          )
          FROM jsonb_array_elements(backup_codes) AS elem
        ),
        updated_at = now(),
        failed_verification_attempts = 0,
        last_failed_attempt = NULL,
        account_locked_until = NULL
        WHERE user_id = p_user_id;
        
        -- Log successful attempt
        INSERT INTO public.security_code_verification_attempts (
          user_id, ip_address, user_agent, success
        ) VALUES (
          p_user_id, p_ip_address, p_user_agent, true
        );
        
        RETURN jsonb_build_object('success', true, 'type', 'backup_code');
      END IF;
    END LOOP;
  END IF;
  
  -- No match found - log failed attempt
  INSERT INTO public.security_code_verification_attempts (
    user_id, ip_address, user_agent, success
  ) VALUES (
    p_user_id, p_ip_address, p_user_agent, false
  );
  
  -- Increment failed attempts counter
  v_failed_attempts := COALESCE(v_failed_attempts, 0) + 1;
  
  -- Calculate lockout duration based on failed attempts (progressive lockout)
  IF v_failed_attempts >= 10 THEN
    v_lockout_duration := interval '1 hour';
  ELSIF v_failed_attempts >= 7 THEN
    v_lockout_duration := interval '30 minutes';
  ELSIF v_failed_attempts >= 5 THEN
    v_lockout_duration := interval '15 minutes';
  ELSE
    v_lockout_duration := NULL;
  END IF;
  
  -- Update failed attempts and lockout if needed
  UPDATE public.user_security
  SET 
    failed_verification_attempts = v_failed_attempts,
    last_failed_attempt = now(),
    account_locked_until = CASE 
      WHEN v_lockout_duration IS NOT NULL THEN now() + v_lockout_duration 
      ELSE NULL 
    END
  WHERE user_id = p_user_id;
  
  -- Return appropriate error message
  IF v_lockout_duration IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Too many failed attempts. Account locked for %s.', v_lockout_duration),
      'locked_until', now() + v_lockout_duration
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid security code',
      'attempts_remaining', 5 - v_failed_attempts
    );
  END IF;
END;
$function$;