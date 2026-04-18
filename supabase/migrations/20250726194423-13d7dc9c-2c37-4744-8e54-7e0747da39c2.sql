-- Fix remaining search_path security warnings for database functions

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
  INSERT INTO notifications (user_id, title, message, type)
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
        PERFORM create_notification(
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
        PERFORM create_notification(
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

-- Fix get_current_user_role function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE id = auth.uid();
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
    PERFORM create_notification(
      NEW.user_id,
      'Support Ticket Response',
      'Your support ticket "' || NEW.subject || '" has received a response from our support team.',
      'support'
    );
  END IF;
  
  RETURN NEW;
END;
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
    INSERT INTO accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'checking', 'CHK-' || SUBSTRING(user_id::text, 1, 8), 4225.22, 'active')
    RETURNING id INTO checking_account_id;
    
    -- Create savings account  
    INSERT INTO accounts (user_id, account_type, account_number, balance, status)
    VALUES (user_id, 'savings', 'SAV-' || SUBSTRING(user_id::text, 1, 8), 8234.56, 'active')
    RETURNING id INTO savings_account_id;
    
    -- Create sample transactions for checking account
    INSERT INTO transactions (account_id, transaction_type, amount, description, reference_number, status, created_at) VALUES
    (checking_account_id, 'deposit', 3500.00, 'Salary Deposit', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '1 day'),
    (checking_account_id, 'withdrawal', 129.99, 'Online Purchase - Amazon', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW()),
    (checking_account_id, 'withdrawal', 4.50, 'Coffee Shop', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '2 days'),
    (checking_account_id, 'withdrawal', 45.00, 'Gas Station', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '3 days'),
    (checking_account_id, 'withdrawal', 100.00, 'ATM Withdrawal', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '7 days');
    
    -- Create sample transactions for savings account
    INSERT INTO transactions (account_id, transaction_type, amount, description, reference_number, status, created_at) VALUES
    (savings_account_id, 'deposit', 500.00, 'Monthly Savings', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '1 day'),
    (savings_account_id, 'deposit', 1000.00, 'Bonus Deposit', 'TXN-' || SUBSTRING(gen_random_uuid()::text, 1, 8), 'completed', NOW() - INTERVAL '15 days');
    
    -- Create sample KYC documents
    INSERT INTO kyc_documents (user_id, document_type, verification_status, uploaded_at) VALUES
    (user_id, 'passport', 'approved', NOW() - INTERVAL '30 days'),
    (user_id, 'utility_bill', 'pending', NOW() - INTERVAL '5 days');
    
    -- Create sample support ticket for regular user (not admin)
    IF user_email = 'john.doe@starbank.com' THEN
      INSERT INTO support_tickets (user_id, subject, message, status, priority, created_at) VALUES
      (user_id, 'Mobile App Login Issue', 'I am having trouble logging into the mobile banking app. Can you please help?', 'open', 'medium', NOW() - INTERVAL '2 days');
    END IF;
  END IF;
END;
$function$;