-- Recreate views with explicit SECURITY INVOKER to respect calling user's RLS policies
CREATE OR REPLACE VIEW admin_check_deposits_view 
WITH (security_invoker = true) AS
SELECT 
  cd.id,
  cd.user_id,
  cd.account_id,
  cd.check_number,
  cd.amount,
  cd.front_image_url,
  cd.back_image_url,
  cd.status,
  cd.admin_notes,
  cd.created_at,
  cd.reviewed_at,
  cd.reviewed_by,
  jsonb_build_object(
    'full_name', p.full_name,
    'email', p.email
  ) as profiles,
  jsonb_build_object(
    'account_number', a.account_number,
    'account_type', a.account_type
  ) as accounts
FROM check_deposits cd
LEFT JOIN profiles p ON p.id = cd.user_id
LEFT JOIN accounts a ON a.id = cd.account_id;

CREATE OR REPLACE VIEW admin_crypto_deposits_view 
WITH (security_invoker = true) AS
SELECT 
  cd.id,
  cd.user_id,
  cd.account_id,
  cd.crypto_type,
  cd.amount,
  cd.transaction_hash,
  cd.wallet_address,
  cd.status,
  cd.admin_notes,
  cd.created_at,
  cd.reviewed_at,
  cd.reviewed_by,
  jsonb_build_object(
    'full_name', p.full_name,
    'email', p.email
  ) as profiles,
  jsonb_build_object(
    'account_number', a.account_number,
    'account_type', a.account_type
  ) as accounts
FROM crypto_deposits cd
LEFT JOIN profiles p ON p.id = cd.user_id
LEFT JOIN accounts a ON a.id = cd.account_id;