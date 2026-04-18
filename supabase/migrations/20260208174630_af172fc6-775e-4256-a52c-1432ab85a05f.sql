-- Add required_initial_deposit column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN required_initial_deposit numeric NULL;