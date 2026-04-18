-- Add missing admin RLS policies for next_of_kin table
-- This fixes the issue where admins cannot create/update/delete next of kin records for users

-- Add admin policies for INSERT, UPDATE, and DELETE operations
CREATE POLICY "Admins can create next-of-kin for any user" 
ON next_of_kin 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update next-of-kin for any user" 
ON next_of_kin 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete next-of-kin for any user" 
ON next_of_kin 
FOR DELETE 
USING (get_current_user_role() = 'admin');