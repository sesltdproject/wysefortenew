-- Add loan_repayment_account_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN loan_repayment_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.loan_repayment_account_id IS 
'Default account for automatic loan payment deductions';