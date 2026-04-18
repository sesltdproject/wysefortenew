-- Add RLS policies for user_security table
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own security records
CREATE POLICY "Users can view their own security records" 
ON public.user_security 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow admins to view all security records
CREATE POLICY "Admins can view all security records" 
ON public.user_security 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Allow admins to update all security records
CREATE POLICY "Admins can update all security records" 
ON public.user_security 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

-- Allow admins to insert security records
CREATE POLICY "Admins can insert security records" 
ON public.user_security 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Add trigger for notifications updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function for support ticket responses
CREATE OR REPLACE FUNCTION public.notify_support_ticket_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger for support ticket responses
CREATE TRIGGER support_ticket_response_notification
AFTER UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_support_ticket_response();