CREATE POLICY "Admins can delete applications"
ON public.account_applications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));