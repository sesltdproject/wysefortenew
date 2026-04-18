
CREATE OR REPLACE FUNCTION public.verify_security_code(
  p_user_id UUID,
  p_code TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_security_record RECORD;
  v_profile_locked BOOLEAN;
  v_stored_hash TEXT;
  v_backup_codes JSONB;
  v_code_matched BOOLEAN := FALSE;
  v_new_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Check if profile is hard-locked
  SELECT account_locked INTO v_profile_locked
  FROM profiles
  WHERE id = p_user_id;

  IF v_profile_locked = TRUE THEN
    -- Log the attempt
    INSERT INTO security_code_verification_attempts (user_id, success, ip_address, user_agent)
    VALUES (p_user_id, FALSE, p_ip_address, p_user_agent);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account has been locked. Please contact customer service.',
      'hard_locked', true
    );
  END IF;

  -- Get user security record
  SELECT * INTO v_security_record
  FROM user_security
  WHERE user_id = p_user_id;

  IF v_security_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Security settings not found');
  END IF;

  -- Check if temporarily locked (account_locked_until)
  IF v_security_record.account_locked_until IS NOT NULL AND v_security_record.account_locked_until > NOW() THEN
    INSERT INTO security_code_verification_attempts (user_id, success, ip_address, user_agent)
    VALUES (p_user_id, FALSE, p_ip_address, p_user_agent);
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account is temporarily locked. Please try again later.',
      'locked_until', v_security_record.account_locked_until
    );
  END IF;

  -- Get stored hash
  v_stored_hash := v_security_record.security_code_hash;

  -- Check main security code
  IF v_stored_hash IS NOT NULL AND v_stored_hash = crypt(p_code, v_stored_hash) THEN
    v_code_matched := TRUE;
  END IF;

  -- Check backup codes if main code didn't match
  IF NOT v_code_matched AND v_security_record.backup_codes IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(v_security_record.backup_codes) - 1 LOOP
      IF v_security_record.backup_codes->>i = p_code THEN
        v_code_matched := TRUE;
        -- Remove used backup code
        v_backup_codes := v_security_record.backup_codes - i;
        UPDATE user_security SET backup_codes = v_backup_codes WHERE user_id = p_user_id;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF v_code_matched THEN
    -- Success: reset failed attempts and clear any temporary lock
    UPDATE user_security
    SET failed_verification_attempts = 0,
        account_locked_until = NULL,
        last_failed_attempt = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO security_code_verification_attempts (user_id, success, ip_address, user_agent)
    VALUES (p_user_id, TRUE, p_ip_address, p_user_agent);

    RETURN jsonb_build_object('success', true);
  ELSE
    -- Failed: increment attempts
    v_new_attempts := COALESCE(v_security_record.failed_verification_attempts, 0) + 1;

    IF v_new_attempts >= 4 THEN
      -- Hard lock: set profiles.account_locked = true
      UPDATE profiles SET account_locked = TRUE WHERE id = p_user_id;
      UPDATE user_security
      SET failed_verification_attempts = v_new_attempts,
          last_failed_attempt = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;

      INSERT INTO security_code_verification_attempts (user_id, success, ip_address, user_agent)
      VALUES (p_user_id, FALSE, p_ip_address, p_user_agent);

      RETURN jsonb_build_object(
        'success', false,
        'error', 'Account has been locked due to too many failed attempts. Please contact customer service.',
        'hard_locked', true
      );
    ELSIF v_new_attempts = 3 THEN
      -- Temporary lock: 12 hours
      v_locked_until := NOW() + INTERVAL '12 hours';
      UPDATE user_security
      SET failed_verification_attempts = v_new_attempts,
          account_locked_until = v_locked_until,
          last_failed_attempt = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;

      INSERT INTO security_code_verification_attempts (user_id, success, ip_address, user_agent)
      VALUES (p_user_id, FALSE, p_ip_address, p_user_agent);

      RETURN jsonb_build_object(
        'success', false,
        'error', 'Account locked for 12 hours due to too many failed attempts.',
        'locked_until', v_locked_until
      );
    ELSE
      -- Just increment
      UPDATE user_security
      SET failed_verification_attempts = v_new_attempts,
          last_failed_attempt = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;

      INSERT INTO security_code_verification_attempts (user_id, success, ip_address, user_agent)
      VALUES (p_user_id, FALSE, p_ip_address, p_user_agent);

      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid security code. Please try again.',
        'attempts_remaining', 3 - v_new_attempts
      );
    END IF;
  END IF;
END;
$$;
