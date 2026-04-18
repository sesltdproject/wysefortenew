-- Fix RLS policy by using profiles table instead of auth.users
DROP POLICY IF EXISTS "Users can view own applications" ON public.account_applications;

-- Create policy that uses profiles table (which users can access)
CREATE POLICY "Users can view own applications"
ON public.account_applications
FOR SELECT
USING (
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);