-- Update the account number generation function with new format requirements
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
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

-- Update the support ticket message notification trigger to include user replies
CREATE OR REPLACE FUNCTION public.notify_support_ticket_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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