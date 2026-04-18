-- Fix the Next of Kin RLS policy issue
-- The issue is likely related to the user ID checking in the RLS policy

-- First, let's check if there are any existing next_of_kin records for the user
-- and ensure the RLS policies are correctly configured

-- Update the RLS policies for next_of_kin to ensure they work correctly
DROP POLICY IF EXISTS "Users can create their own next-of-kin" ON next_of_kin;
DROP POLICY IF EXISTS "Users can update their own next-of-kin" ON next_of_kin;
DROP POLICY IF EXISTS "Users can view their own next-of-kin" ON next_of_kin;
DROP POLICY IF EXISTS "Users can delete their own next-of-kin" ON next_of_kin;
DROP POLICY IF EXISTS "Admins can view all next-of-kin" ON next_of_kin;

-- Recreate the policies with proper syntax
CREATE POLICY "Users can view their own next-of-kin" 
ON next_of_kin 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own next-of-kin" 
ON next_of_kin 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own next-of-kin" 
ON next_of_kin 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own next-of-kin" 
ON next_of_kin 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all next-of-kin" 
ON next_of_kin 
FOR SELECT 
USING (get_current_user_role() = 'admin');

-- Also ensure the table has RLS enabled
ALTER TABLE next_of_kin ENABLE ROW LEVEL SECURITY;