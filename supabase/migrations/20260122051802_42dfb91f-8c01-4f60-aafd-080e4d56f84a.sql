-- Add column to track if security code is required for transfers
ALTER TABLE user_security 
ADD COLUMN IF NOT EXISTS security_code_for_transfers boolean DEFAULT false;