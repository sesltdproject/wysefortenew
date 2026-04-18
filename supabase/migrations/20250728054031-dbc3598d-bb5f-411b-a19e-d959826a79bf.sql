-- Add disbursement_account_id to loan_applications table
ALTER TABLE public.loan_applications 
ADD COLUMN disbursement_account_id uuid REFERENCES public.accounts(id);

-- Add RLS policy for the new column
CREATE POLICY "Users can reference their own accounts in loan applications" 
ON public.loan_applications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.accounts 
    WHERE id = loan_applications.disbursement_account_id 
    AND user_id = auth.uid()
  )
);