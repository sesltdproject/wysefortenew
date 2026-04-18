-- Add missing columns to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS loan_type TEXT,
ADD COLUMN IF NOT EXISTS principal_amount NUMERIC;

-- Create missing database functions
CREATE OR REPLACE FUNCTION public.admin_update_transaction(
  transaction_id UUID,
  new_amount NUMERIC DEFAULT NULL,
  new_status transaction_status DEFAULT NULL,
  new_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.transactions
  SET 
    amount = COALESCE(new_amount, amount),
    status = COALESCE(new_status, status),
    description = COALESCE(new_description, description)
  WHERE id = transaction_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users_paginated(
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 50,
  search_term TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT COUNT(*) INTO total_count
  FROM public.profiles p
  WHERE search_term IS NULL 
    OR p.full_name ILIKE '%' || search_term || '%'
    OR p.email ILIKE '%' || search_term || '%';
  
  SELECT jsonb_build_object(
    'users', (
      SELECT jsonb_agg(row_to_json(p))
      FROM (
        SELECT p.*, ur.role
        FROM public.profiles p
        LEFT JOIN public.user_roles ur ON ur.user_id = p.id
        WHERE search_term IS NULL 
          OR p.full_name ILIKE '%' || search_term || '%'
          OR p.email ILIKE '%' || search_term || '%'
        ORDER BY p.created_at DESC
        LIMIT page_size
        OFFSET (page_number - 1) * page_size
      ) p
    ),
    'total', total_count,
    'page', page_number,
    'page_size', page_size
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_account_transfer_limit(account_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT jsonb_build_object(
    'daily_limit', 10000,
    'single_transaction_limit', 5000
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_account_transfer_limit(
  account_id UUID,
  daily_limit NUMERIC,
  single_transaction_limit NUMERIC
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_email_templates()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN jsonb_build_array(
    jsonb_build_object(
      'id', 'welcome',
      'name', 'Welcome Email',
      'subject', 'Welcome to {{bank_name}}',
      'body', 'Hello {{user_name}}, welcome to our bank!'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_email_template(
  template_id TEXT,
  new_subject TEXT,
  new_body TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;