-- Allow admins to delete support ticket messages
CREATE POLICY "Admins can delete ticket messages"
ON public.support_ticket_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete support tickets
CREATE POLICY "Admins can delete tickets"
ON public.support_tickets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));