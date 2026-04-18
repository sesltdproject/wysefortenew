-- Fix support ticket notification trigger to ensure user replies trigger admin notifications
-- Recreate the trigger function with better error handling

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

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS trigger_support_ticket_message_notifications ON support_ticket_messages;
CREATE TRIGGER trigger_support_ticket_message_notifications
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_support_ticket_message();