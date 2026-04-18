-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN username text;

-- Create unique index for case-insensitive username lookups
CREATE UNIQUE INDEX profiles_username_lower_idx ON profiles(LOWER(username));