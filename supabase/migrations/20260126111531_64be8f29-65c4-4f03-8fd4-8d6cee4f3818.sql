-- 1. Drop duplicate foreign key constraints on crypto_deposits
-- These duplicates cause PostgREST ambiguity errors
ALTER TABLE crypto_deposits DROP CONSTRAINT IF EXISTS fk_crypto_deposits_account;
ALTER TABLE crypto_deposits DROP CONSTRAINT IF EXISTS fk_crypto_deposits_user;

-- Also drop duplicates on check_deposits if they exist
ALTER TABLE check_deposits DROP CONSTRAINT IF EXISTS fk_check_deposits_account;

-- 2. Create get_active_template function for transaction emails
CREATE OR REPLACE FUNCTION public.get_active_template(p_template_name TEXT)
RETURNS TABLE (
  id UUID,
  template_name TEXT,
  subject_template TEXT,
  html_template TEXT,
  template_variables JSONB,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.id,
    et.template_name,
    et.subject_template,
    et.html_template,
    et.template_variables,
    et.is_active
  FROM email_templates et
  WHERE et.template_name = p_template_name
    AND et.is_active = true
  LIMIT 1;
END;
$$;