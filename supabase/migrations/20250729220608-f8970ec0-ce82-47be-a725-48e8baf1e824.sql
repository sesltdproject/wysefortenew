-- Extend user_security table with security code fields
ALTER TABLE public.user_security 
ADD COLUMN security_code_enabled boolean DEFAULT false,
ADD COLUMN security_code_hash text,
ADD COLUMN security_code_backup_codes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN security_code_created_at timestamp with time zone,
ADD COLUMN security_code_updated_at timestamp with time zone;

-- Create security_code_attempts table for rate limiting
CREATE TABLE public.security_code_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  attempt_type text NOT NULL, -- 'main' or 'backup'
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text
);

-- Enable RLS on security_code_attempts
ALTER TABLE public.security_code_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for security_code_attempts
CREATE POLICY "Users can view their own security code attempts" 
ON public.security_code_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert security code attempts" 
ON public.security_code_attempts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all security code attempts" 
ON public.security_code_attempts 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Function to verify security code (main or backup)
CREATE OR REPLACE FUNCTION public.verify_security_code(p_user_id uuid, p_code text, p_ip_address text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_security_record RECORD;
  v_backup_codes jsonb;
  v_code_hash text;
  v_backup_code_found boolean := false;
  v_updated_backup_codes jsonb;
  v_recent_attempts integer;
  v_result json;
BEGIN
  -- Check recent failed attempts (rate limiting)
  SELECT COUNT(*) INTO v_recent_attempts
  FROM security_code_attempts 
  WHERE user_id = p_user_id 
    AND attempted_at > NOW() - INTERVAL '15 minutes'
    AND success = false;
    
  IF v_recent_attempts >= 5 THEN
    -- Log the blocked attempt
    INSERT INTO security_code_attempts (user_id, attempt_type, success, ip_address, user_agent)
    VALUES (p_user_id, 'blocked', false, p_ip_address, p_user_agent);
    
    RETURN json_build_object('success', false, 'error', 'Too many failed attempts. Please try again later.');
  END IF;

  -- Get user security settings
  SELECT * INTO v_security_record 
  FROM user_security 
  WHERE user_id = p_user_id AND security_code_enabled = true;
  
  IF v_security_record.user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Security code not enabled');
  END IF;
  
  -- Check if it's the main security code
  IF v_security_record.security_code_hash IS NOT NULL AND 
     crypt(p_code, v_security_record.security_code_hash) = v_security_record.security_code_hash THEN
    
    -- Log successful attempt
    INSERT INTO security_code_attempts (user_id, attempt_type, success, ip_address, user_agent)
    VALUES (p_user_id, 'main', true, p_ip_address, p_user_agent);
    
    RETURN json_build_object('success', true, 'type', 'main');
  END IF;
  
  -- Check backup codes
  v_backup_codes := v_security_record.security_code_backup_codes;
  v_updated_backup_codes := '[]'::jsonb;
  
  FOR i IN 0..jsonb_array_length(v_backup_codes) - 1 LOOP
    v_code_hash := v_backup_codes->i->>'hash';
    
    IF v_code_hash IS NOT NULL AND crypt(p_code, v_code_hash) = v_code_hash THEN
      v_backup_code_found := true;
      -- Don't add this code back to the array (single use)
    ELSE
      -- Keep unused codes
      v_updated_backup_codes := v_updated_backup_codes || (v_backup_codes->i);
    END IF;
  END LOOP;
  
  IF v_backup_code_found THEN
    -- Update backup codes (remove used one)
    UPDATE user_security 
    SET security_code_backup_codes = v_updated_backup_codes,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log successful backup code attempt
    INSERT INTO security_code_attempts (user_id, attempt_type, success, ip_address, user_agent)
    VALUES (p_user_id, 'backup', true, p_ip_address, p_user_agent);
    
    RETURN json_build_object('success', true, 'type', 'backup');
  END IF;
  
  -- Log failed attempt
  INSERT INTO security_code_attempts (user_id, attempt_type, success, ip_address, user_agent)
  VALUES (p_user_id, 'main', false, p_ip_address, p_user_agent);
  
  RETURN json_build_object('success', false, 'error', 'Invalid security code');
END;
$function$;

-- Function to generate backup codes
CREATE OR REPLACE FUNCTION public.generate_backup_codes(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_backup_codes jsonb := '[]'::jsonb;
  v_code text;
  v_hash text;
  v_plain_codes text[] := '{}';
  i integer;
BEGIN
  -- Check if user exists and security code is enabled
  IF NOT EXISTS (SELECT 1 FROM user_security WHERE user_id = p_user_id AND security_code_enabled = true) THEN
    RETURN json_build_object('success', false, 'error', 'Security code not enabled');
  END IF;
  
  -- Generate 5 backup codes
  FOR i IN 1..5 LOOP
    -- Generate 10-digit alphanumeric code
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
    v_hash := crypt(v_code, gen_salt('bf'));
    
    v_backup_codes := v_backup_codes || json_build_object('hash', v_hash, 'created_at', NOW());
    v_plain_codes := array_append(v_plain_codes, v_code);
  END LOOP;
  
  -- Update user_security with new backup codes
  UPDATE user_security 
  SET security_code_backup_codes = v_backup_codes,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object('success', true, 'codes', v_plain_codes);
END;
$function$;

-- Function to update security code
CREATE OR REPLACE FUNCTION public.update_security_code(p_user_id uuid, p_old_code text, p_new_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_security_record RECORD;
  v_new_hash text;
BEGIN
  -- Get current security settings
  SELECT * INTO v_security_record 
  FROM user_security 
  WHERE user_id = p_user_id;
  
  IF v_security_record.user_id IS NULL THEN
    -- Create security record if it doesn't exist
    INSERT INTO user_security (user_id, security_code_enabled) 
    VALUES (p_user_id, false);
    
    SELECT * INTO v_security_record 
    FROM user_security 
    WHERE user_id = p_user_id;
  END IF;
  
  -- If security code is enabled, verify old code
  IF v_security_record.security_code_enabled = true AND v_security_record.security_code_hash IS NOT NULL THEN
    IF p_old_code IS NULL OR crypt(p_old_code, v_security_record.security_code_hash) != v_security_record.security_code_hash THEN
      RETURN json_build_object('success', false, 'error', 'Invalid current security code');
    END IF;
  END IF;
  
  -- Hash new code
  v_new_hash := crypt(p_new_code, gen_salt('bf'));
  
  -- Update security code
  UPDATE user_security 
  SET security_code_hash = v_new_hash,
      security_code_enabled = true,
      security_code_created_at = COALESCE(security_code_created_at, NOW()),
      security_code_updated_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Security code updated successfully');
END;
$function$;

-- Function to toggle security code
CREATE OR REPLACE FUNCTION public.toggle_security_code(p_user_id uuid, p_enabled boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_security_record RECORD;
BEGIN
  -- Get or create security record
  SELECT * INTO v_security_record 
  FROM user_security 
  WHERE user_id = p_user_id;
  
  IF v_security_record.user_id IS NULL THEN
    INSERT INTO user_security (user_id, security_code_enabled) 
    VALUES (p_user_id, p_enabled);
  ELSE
    UPDATE user_security 
    SET security_code_enabled = p_enabled,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN json_build_object('success', true, 'enabled', p_enabled);
END;
$function$;