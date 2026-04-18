-- Create support ticket messages table for threaded conversations
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_admin_message BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for support ticket messages
CREATE POLICY "Users can view messages for their own tickets" 
ON public.support_ticket_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = support_ticket_messages.ticket_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages for their own tickets" 
ON public.support_ticket_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE id = support_ticket_messages.ticket_id 
    AND user_id = auth.uid()
  )
  AND sender_id = auth.uid()
  AND is_admin_message = false
);

CREATE POLICY "Admins can view all ticket messages" 
ON public.support_ticket_messages 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can create admin messages" 
ON public.support_ticket_messages 
FOR INSERT 
WITH CHECK (
  get_current_user_role() = 'admin'
  AND sender_id = auth.uid()
  AND is_admin_message = true
);

-- Add updated_at trigger
CREATE TRIGGER update_support_ticket_messages_updated_at
BEFORE UPDATE ON public.support_ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing admin responses to the new messages table
INSERT INTO public.support_ticket_messages (ticket_id, sender_id, message, is_admin_message, created_at)
SELECT 
  id as ticket_id,
  (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1) as sender_id,
  admin_response as message,
  true as is_admin_message,
  updated_at as created_at
FROM public.support_tickets 
WHERE admin_response IS NOT NULL;

-- Update loan_payments foreign key to allow cascading deletes
ALTER TABLE public.loan_payments 
DROP CONSTRAINT IF EXISTS loan_payments_loan_id_fkey;

ALTER TABLE public.loan_payments 
ADD CONSTRAINT loan_payments_loan_id_fkey 
FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE;

-- Add status options for support tickets
ALTER TABLE public.support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_tickets_status_check 
CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));