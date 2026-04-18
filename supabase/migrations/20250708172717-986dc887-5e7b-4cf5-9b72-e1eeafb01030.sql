-- Fix precision issues with bill_payments and other monetary columns
-- Change amount columns from integer/numeric to numeric(10,2) for proper precision

-- Update bill_payments table
ALTER TABLE public.bill_payments 
ALTER COLUMN amount TYPE numeric(10,2);

-- Update transactions table  
ALTER TABLE public.transactions 
ALTER COLUMN amount TYPE numeric(10,2);

-- Update transfers table
ALTER TABLE public.transfers 
ALTER COLUMN amount TYPE numeric(10,2);

-- Update accounts table
ALTER TABLE public.accounts 
ALTER COLUMN balance TYPE numeric(10,2);

-- Update foreign_remittances table
ALTER TABLE public.foreign_remittances 
ALTER COLUMN amount TYPE numeric(10,2);

-- Update loan-related tables
ALTER TABLE public.loan_applications 
ALTER COLUMN requested_amount TYPE numeric(10,2),
ALTER COLUMN monthly_income TYPE numeric(10,2);

ALTER TABLE public.loans 
ALTER COLUMN principal_amount TYPE numeric(10,2),
ALTER COLUMN remaining_balance TYPE numeric(10,2),
ALTER COLUMN monthly_payment TYPE numeric(10,2),
ALTER COLUMN interest_rate TYPE numeric(5,4);

ALTER TABLE public.loan_payments 
ALTER COLUMN payment_amount TYPE numeric(10,2),
ALTER COLUMN principal_amount TYPE numeric(10,2),
ALTER COLUMN interest_amount TYPE numeric(10,2),
ALTER COLUMN remaining_balance TYPE numeric(10,2);

-- Update account_statements table
ALTER TABLE public.account_statements 
ALTER COLUMN opening_balance TYPE numeric(10,2),
ALTER COLUMN closing_balance TYPE numeric(10,2),
ALTER COLUMN total_deposits TYPE numeric(10,2),
ALTER COLUMN total_withdrawals TYPE numeric(10,2);