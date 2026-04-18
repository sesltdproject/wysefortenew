-- Critical Security Fix 1: Add search_path restrictions to all database functions
-- This prevents privilege escalation attacks through function execution

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    CASE 
      WHEN NEW.email = 'admin@starbank.com' THEN 'admin'
      ELSE 'user'
    END
  );
  
  -- Seed demo data for our mock users
  PERFORM public.seed_user_data(NEW.id, NEW.email);
  
  RETURN NEW;
END;
$function$;

-- Fix generate_account_number function
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prefix TEXT;
  type_prefix TEXT;
  next_number BIGINT;
  account_suffix TEXT;
BEGIN
  -- Set prefix and type-specific prefix based on account type
  CASE LOWER(account_type)
    WHEN 'checking' THEN 
      prefix := 'CHK';
      type_prefix := '101';
    WHEN 'savings' THEN 
      prefix := 'SAV';
      type_prefix := '111';
    WHEN 'premium checking' THEN 
      prefix := 'PCK';
      type_prefix := '122';
    WHEN 'premium savings' THEN 
      prefix := 'PSV';
      type_prefix := '131';
    WHEN 'high yield savings' THEN 
      prefix := 'HYS';
      type_prefix := '141';
    WHEN 'trust account' THEN 
      prefix := 'TST';
      type_prefix := '161';
    WHEN 'escrow account' THEN 
      prefix := 'ESC';
      type_prefix := '171';
    WHEN 'investment account' THEN 
      prefix := 'INV';
      type_prefix := '181';
    WHEN 'business account' THEN 
      prefix := 'BUS';
      type_prefix := '191';
    ELSE 
      prefix := 'CUS';
      type_prefix := '999';
  END CASE;
  
  -- Get the next sequential number for this account type
  WITH existing_accounts AS (
    SELECT account_number 
    FROM accounts 
    WHERE account_number LIKE prefix || '-' || type_prefix || '%'
  ),
  numbers AS (
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN length(split_part(account_number, '-', 2)) = 12 
            AND split_part(account_number, '-', 2) ~ '^[0-9]+$'
            AND left(split_part(account_number, '-', 2), 3) = type_prefix
          THEN split_part(account_number, '-', 2)::bigint
          ELSE (type_prefix || '000000000')::bigint - 1
        END
      ), 
      (type_prefix || '000000000')::bigint - 1
    ) as max_number
    FROM existing_accounts
  )
  SELECT max_number + 1 INTO next_number FROM numbers;
  
  -- Ensure the number is 12 digits with the correct type prefix
  account_suffix := LPAD(next_number::text, 12, '0');
  
  RETURN prefix || '-' || account_suffix;
END;
$function$;

-- Fix create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$function$;

-- Fix notify_support_ticket_message function
CREATE OR REPLACE FUNCTION public.notify_support_ticket_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create notification when admin sends message to user
  IF NEW.is_admin_message = true THEN
    -- Get the ticket owner
    DECLARE
      ticket_user_id UUID;
      ticket_subject TEXT;
    BEGIN
      SELECT user_id, subject INTO ticket_user_id, ticket_subject
      FROM support_tickets 
      WHERE id = NEW.ticket_id;
      
      -- Create notification for the user
      IF ticket_user_id IS NOT NULL THEN
        PERFORM public.create_notification(
          ticket_user_id,
          'New Support Response',
          'You have received a new response for your support ticket: "' || ticket_subject || '"',
          'support'
        );
      END IF;
    END;
  -- Create notification when user sends message to admin (including replies)
  ELSE
    -- Get admin users and ticket info
    DECLARE
      admin_user RECORD;
      ticket_subject TEXT;
      ticket_user_name TEXT;
    BEGIN
      SELECT st.subject, p.full_name INTO ticket_subject, ticket_user_name
      FROM support_tickets st
      JOIN profiles p ON st.user_id = p.id
      WHERE st.id = NEW.ticket_id;
      
      -- Create notifications for all admin users
      FOR admin_user IN 
        SELECT id FROM profiles WHERE role = 'admin'
      LOOP
        PERFORM public.create_notification(
          admin_user.id,
          'New Support Ticket Message',
          ticket_user_name || ' has replied to support ticket: "' || ticket_subject || '"',
          'admin_alert'
        );
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix notify_support_ticket_response function
CREATE OR REPLACE FUNCTION public.notify_support_ticket_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create notification if admin_response was added
  IF OLD.admin_response IS NULL AND NEW.admin_response IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Support Ticket Response',
      'Your support ticket "' || NEW.subject || '" has received a response from our support team.',
      'support'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

-- Fix refresh_admin_stats function
CREATE OR REPLACE FUNCTION public.refresh_admin_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW admin_stats_view;
END;
$function$;

-- Fix seed_user_data function
CREATE OR REPLACE FUNCTION public.seed_user_data(user_id uuid, user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  checking_account_id UUID;
  savings_account_id UUID;
BEGIN
  -- Only seed for our demo users
  IF user_email IN ('john.doe@starbank.com', 'admin@starbank.com') THEN
    -- Create checking account
    INSERT INTO public.accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'checking', 'CHK-' || SUBSTRING(user_id::text, 1, 8), 4225.22, 'active')
    RETURNING id INTO checking_account_id;
    
    -- Create savings account  
    INSERT INTO public.accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'savings', 'SAV-' || SUBSTRING(user_id::text, 1, 8), 8234.56, 'active')
    RETURNING id INTO savings_account_id;
    
    -- Create sample transactions for checking account
    INSERT INTO public.transactions (account_id, transaction_type, amount, description, reference_number, status, created_at) VALUES
    (checking_account_id, 'deposit', 3500.00, 'Salary Deposit', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '1 day'),
    (checking_account_id, 'withdrawal', 129.99, 'Online Purchase - Amazon', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW()),
    (checking_account_id, 'withdrawal', 4.50, 'Coffee Shop', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '2 days'),
    (checking_account_id, 'withdrawal', 45.00, 'Gas Station', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '3 days'),
    (checking_account_id, 'withdrawal', 100.00, 'ATM Withdrawal', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '7 days');
    
    -- Create sample transactions for savings account
    INSERT INTO public.transactions (account_id, transaction_type, amount, description, reference_number, status, created_at) VALUES
    (savings_account_id, 'deposit', 500.00, 'Monthly Savings', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '1 day'),
    (savings_account_id, 'deposit', 1000.00, 'Bonus Deposit', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '15 days');
    
    -- Create sample KYC documents
    INSERT INTO public.kyc_documents (user_id, document_type, verification_status, uploaded_at) VALUES
    (user_id, 'passport', 'approved', NOW() - INTERVAL '30 days'),
    (user_id, 'utility_bill', 'pending', NOW() - INTERVAL '5 days');
    
    -- Create sample support ticket for regular user (not admin)
    IF user_email = 'john.doe@starbank.com' THEN
      INSERT INTO public.support_tickets (user_id, subject, message, status, priority, created_at) VALUES
      (user_id, 'Mobile App Login Issue', 'I am having trouble logging into the mobile banking app. Can you please help?', 'open', 'medium', NOW() - INTERVAL '2 days');
    END IF;
  END IF;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix send_transaction_notification function
CREATE OR REPLACE FUNCTION public.send_transaction_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_http_response RECORD;
  v_error_message TEXT;
BEGIN
  -- Only send notifications for completed transactions
  IF NEW.status = 'completed' THEN
    BEGIN
      -- Log that we're attempting to send notification
      RAISE LOG 'Attempting to send transaction notification for transaction ID: %', NEW.id;
      
      -- Call the edge function to send email notification
      SELECT * INTO v_http_response FROM net.http_post(
        url := 'https://szmsrrazerqxmwawhevc.supabase.co/functions/v1/send-transaction-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bXNycmF6ZXJxeG13YXdoZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjMyNjYsImV4cCI6MjA2NzUzOTI2Nn0.a7s3MLb8wCv6DWxdeK3M6-j5wsJNlXUaAc5kgBlKNFk"}'::jsonb,
        body := json_build_object('transaction_id', NEW.id)::jsonb
      );
      
      -- Log the HTTP response
      IF v_http_response.status_code BETWEEN 200 AND 299 THEN
        RAISE LOG 'Transaction notification sent successfully for transaction ID: %, HTTP status: %', NEW.id, v_http_response.status_code;
      ELSE
        RAISE WARNING 'Transaction notification failed for transaction ID: %, HTTP status: %, Response: %', NEW.id, v_http_response.status_code, v_http_response.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log any errors but don't fail the transaction
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
      RAISE WARNING 'Failed to send transaction notification for transaction ID: %, Error: %', NEW.id, v_error_message;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Critical Security Fix 2: Prevent users from self-escalating roles
-- Add RLS policy to prevent users from updating their own role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile (excluding role)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent users from updating their own role
  (OLD.role = NEW.role OR get_current_user_role() = 'admin')
);

-- Critical Security Fix 3: Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES auth.users(id),
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

-- Create audit trigger for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_log (
      user_id,
      action,
      table_name,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      NEW.id,
      'UPDATE',
      'profiles',
      json_build_object('role', OLD.role),
      json_build_object('role', NEW.role),
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for role change auditing
DROP TRIGGER IF EXISTS audit_profile_role_changes ON public.profiles;
CREATE TRIGGER audit_profile_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();