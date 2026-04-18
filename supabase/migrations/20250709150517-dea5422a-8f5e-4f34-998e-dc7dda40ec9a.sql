
-- Remove bank accounts from admin users
DELETE FROM accounts WHERE user_id IN (
  SELECT id FROM profiles WHERE role = 'admin'
);

-- Add account_locked column to profiles table for easier user management
ALTER TABLE profiles ADD COLUMN account_locked BOOLEAN DEFAULT FALSE;

-- Create entries in user_security table for existing users (if none exist)
INSERT INTO user_security (user_id, account_locked, two_factor_enabled, login_attempts)
SELECT id, FALSE, FALSE, 0 
FROM profiles 
WHERE id NOT IN (SELECT COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid) FROM user_security);
