-- Update the accounts table check constraint to include business account
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;

ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check 
CHECK (account_type IN ('checking', 'savings', 'premium checking', 'premium savings', 'high yield savings', 'trust account', 'escrow account', 'investment account', 'business account'));