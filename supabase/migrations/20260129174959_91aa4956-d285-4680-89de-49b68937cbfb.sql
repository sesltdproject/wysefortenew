-- =====================================================================
-- FIX REMAINING "RLS Policy Always True" issues
-- =====================================================================

-- 1. email_verification_codes: Remove overly permissive INSERT and UPDATE policies
-- These operations should ONLY be done by edge functions using service role key

DROP POLICY IF EXISTS "Allow public insert for email verification" ON email_verification_codes;
DROP POLICY IF EXISTS "Allow public update for email verification" ON email_verification_codes;

-- Note: Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
-- No direct INSERT/UPDATE access for regular users is needed

-- 2. account_applications: "Anyone can create applications" is INTENTIONAL
-- This is a public form - unauthenticated users must be able to apply
-- Adding a comment to document this intentional design decision

COMMENT ON POLICY "Anyone can create applications" ON account_applications IS 
'Intentional: Account applications are submitted by unauthenticated users through a public form. This allows prospective customers to apply for accounts before having login credentials.';