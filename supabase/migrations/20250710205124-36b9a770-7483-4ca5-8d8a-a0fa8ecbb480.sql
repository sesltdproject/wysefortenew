-- Fix account type constraint to allow all account types used in the UI
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;

ALTER TABLE public.accounts ADD CONSTRAINT accounts_account_type_check 
CHECK (account_type = ANY (ARRAY[
  'checking'::text,
  'savings'::text, 
  'credit'::text,
  'premium checking'::text,
  'premium savings'::text,
  'high yield savings'::text,
  'escrow account'::text,
  'call account'::text,
  'investment account'::text,
  'trust account'::text
]));

-- Fix John Donut's crypto deposit amount
UPDATE public.crypto_deposits 
SET amount = 2000.00 
WHERE id = 'a8c3e18d-b175-4e17-8bcd-159d79df26d8' 
AND amount = 1999.85;