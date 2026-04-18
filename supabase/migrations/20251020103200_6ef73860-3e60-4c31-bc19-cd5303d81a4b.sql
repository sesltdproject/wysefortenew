-- Add repayment_account_id to loans table
ALTER TABLE public.loans 
ADD COLUMN repayment_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.loans.repayment_account_id IS 
'Specific account for this loan repayment deductions';