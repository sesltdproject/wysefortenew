
-- Fix infinite recursion in profiles RLS policy
-- The current "Admins can view all profiles" policy is causing infinite recursion
-- because it queries the same table it's protecting

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a new policy that uses the existing security definer function
-- This function already exists from a previous migration to avoid recursion
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Also ensure accounts can be properly accessed for the join operation
-- Add missing policy for admins to insert accounts if needed
CREATE POLICY IF NOT EXISTS "Admins can insert accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');
