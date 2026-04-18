-- Update the account status for newly created accounts with zero balance
-- and fix the specific account mentioned
UPDATE accounts 
SET status = 'awaiting_deposit'
WHERE balance = 0 AND status = 'active';

-- Update the specific account mentioned by the user
UPDATE accounts 
SET status = 'awaiting_deposit'
WHERE account_number = 'PRE-YNOOOXP4';

-- Update all accounts with status 'awaiting deposit' to use the correct underscore format
UPDATE accounts 
SET status = 'awaiting_deposit'
WHERE status = 'awaiting deposit';