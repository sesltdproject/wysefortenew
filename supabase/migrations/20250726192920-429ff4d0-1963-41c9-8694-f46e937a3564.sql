-- Critical Security Fix: Add search_path restrictions to remaining database functions
-- This prevents privilege escalation attacks

CREATE OR REPLACE FUNCTION public.get_admin_notification_counts()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH notification_data AS (
    SELECT 
      (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as support_tickets,
      (SELECT COUNT(*) FROM foreign_remittances WHERE status = 'pending') as pending_transfers,
      (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending') as pending_loans,
      (SELECT COUNT(*) FROM kyc_documents WHERE verification_status = 'pending') as pending_kyc,
      (SELECT COUNT(*) FROM check_deposits WHERE status = 'pending') as pending_check_deposits,
      (SELECT COUNT(*) FROM crypto_deposits WHERE status = 'pending') as pending_crypto_deposits,
      -- Sample check deposit data
      (SELECT json_build_object(
        'amount', cd.amount,
        'user_name', p.full_name,
        'user_email', p.email
      ) FROM check_deposits cd
      JOIN profiles p ON cd.user_id = p.id
      WHERE cd.status = 'pending'
      ORDER BY cd.created_at DESC
      LIMIT 1) as sample_check_deposit,
      -- Sample crypto deposit data
      (SELECT json_build_object(
        'amount', cd.amount,
        'crypto_type', cd.crypto_type,
        'user_name', p.full_name,
        'user_email', p.email
      ) FROM crypto_deposits cd
      JOIN profiles p ON cd.user_id = p.id
      WHERE cd.status = 'pending'
      ORDER BY cd.created_at DESC
      LIMIT 1) as sample_crypto_deposit
  )
  SELECT json_build_object(
    'supportTickets', support_tickets,
    'pendingTransfers', pending_transfers,
    'pendingLoans', pending_loans,
    'pendingKYC', pending_kyc,
    'pendingCheckDeposits', pending_check_deposits,
    'pendingCryptoDeposits', pending_crypto_deposits,
    'sampleCheckDeposit', sample_check_deposit,
    'sampleCryptoDeposit', sample_crypto_deposit
  ) FROM notification_data;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_users_paginated(p_offset integer DEFAULT 0, p_limit integer DEFAULT 50, p_search text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  WITH user_accounts AS (
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.created_at,
      p.account_locked,
      p.phone,
      p.address,
      p.date_of_birth,
      COUNT(a.id) as account_count,
      COALESCE(SUM(a.balance), 0) as total_balance,
      CASE WHEN p.account_locked THEN 'frozen' ELSE 'active' END as status
    FROM profiles p
    LEFT JOIN accounts a ON p.id = a.user_id
    WHERE (p_search IS NULL OR 
           p.full_name ILIKE '%' || p_search || '%' OR 
           p.email ILIKE '%' || p_search || '%')
    GROUP BY p.id, p.email, p.full_name, p.role, p.created_at, p.account_locked, p.phone, p.address, p.date_of_birth
    ORDER BY p.created_at DESC
    OFFSET p_offset
    LIMIT p_limit
  )
  SELECT json_build_object(
    'users', json_agg(user_accounts),
    'total_count', (
      SELECT COUNT(*) 
      FROM profiles p 
      WHERE (p_search IS NULL OR 
             p.full_name ILIKE '%' || p_search || '%' OR 
             p.email ILIKE '%' || p_search || '%')
    )
  ) INTO v_result
  FROM user_accounts;
  
  RETURN v_result;
END;
$function$;

-- Critical Security Fix: Secure role updates with proper RLS
-- First, drop the existing policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a new secure policy that prevents role escalation
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Allow role updates only if user is admin OR role is not being changed
  (get_current_user_role() = 'admin' OR role = (SELECT role FROM profiles WHERE id = auth.uid()))
);

-- Add audit logging table for security monitoring
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.audit_log 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (true);