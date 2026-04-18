-- Fix the account_statements table to have proper unique constraint for ON CONFLICT
ALTER TABLE public.account_statements 
ADD CONSTRAINT unique_account_statement_period 
UNIQUE (account_id, statement_period_start);