-- Fix RLS policy that's causing permission denied error
-- The existing policy tries to query auth.users which is not accessible
DROP POLICY IF EXISTS "Users can view own applications" ON public.account_applications;

-- Create a simpler policy that doesn't reference auth.users
-- Users will be able to view applications that match their email from the JWT
CREATE POLICY "Users can view own applications"
ON public.account_applications
FOR SELECT
USING (
  email = (SELECT raw_user_meta_data->>'email' FROM auth.users WHERE id = auth.uid())
  OR 
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);