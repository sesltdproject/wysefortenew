-- Add hidden field to accounts table for account hiding functionality
ALTER TABLE accounts ADD COLUMN hidden boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering hidden accounts
CREATE INDEX idx_accounts_hidden ON accounts(hidden);

-- Update RLS policies to filter hidden accounts for regular users
-- This policy ensures users don't see their hidden accounts
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
CREATE POLICY "Users can view their own accounts" ON accounts
FOR SELECT USING (auth.uid() = user_id AND hidden = false);

-- Admin policy remains unchanged - they can see all accounts including hidden ones
-- The existing admin policy already covers this