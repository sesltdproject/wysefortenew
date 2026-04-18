-- Update the get_admin_notification_counts function to include support ticket creation
CREATE OR REPLACE FUNCTION public.get_admin_notification_counts()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH notification_data AS (
    SELECT 
      (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as support_tickets,
      (SELECT COUNT(*) FROM foreign_remittances WHERE status = 'pending') as pending_transfers,
      (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending') as pending_loans,
      (SELECT COUNT(*) FROM kyc_documents WHERE verification_status = 'pending') as pending_kyc,
      (SELECT COUNT(*) FROM check_deposits WHERE status = 'pending') as pending_check_deposits,
      (SELECT COUNT(*) FROM crypto_deposits WHERE status = 'pending') as pending_crypto_deposits,
      -- Sample check deposit data
      (SELECT json_build_object(
        'amount', cd.amount,
        'user_name', p.full_name,
        'user_email', p.email
      ) FROM check_deposits cd
      JOIN profiles p ON cd.user_id = p.id
      WHERE cd.status = 'pending'
      ORDER BY cd.created_at DESC
      LIMIT 1) as sample_check_deposit,
      -- Sample crypto deposit data
      (SELECT json_build_object(
        'amount', cd.amount,
        'crypto_type', cd.crypto_type,
        'user_name', p.full_name,
        'user_email', p.email
      ) FROM crypto_deposits cd
      JOIN profiles p ON cd.user_id = p.id
      WHERE cd.status = 'pending'
      ORDER BY cd.created_at DESC
      LIMIT 1) as sample_crypto_deposit
  )
  SELECT json_build_object(
    'supportTickets', support_tickets,
    'pendingTransfers', pending_transfers,
    'pendingLoans', pending_loans,
    'pendingKYC', pending_kyc,
    'pendingCheckDeposits', pending_check_deposits,
    'pendingCryptoDeposits', pending_crypto_deposits,
    'sampleCheckDeposit', sample_check_deposit,
    'sampleCryptoDeposit', sample_crypto_deposit
  ) FROM notification_data;
$function$;

-- Update the account number generation function to support Business Account and the new format
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  prefix TEXT;
  sequence_start BIGINT;
  next_number BIGINT;
  account_suffix TEXT;
BEGIN
  -- Set prefix and starting sequence based on account type
  CASE LOWER(account_type)
    WHEN 'checking' THEN 
      prefix := 'CHK';
      sequence_start := 100000000000; -- 12 digits starting from 100000000000
    WHEN 'savings' THEN 
      prefix := 'SAV';
      sequence_start := 100000000000;
    WHEN 'premium checking' THEN 
      prefix := 'PCK';
      sequence_start := 100000000000;
    WHEN 'premium savings' THEN 
      prefix := 'PSV';
      sequence_start := 100000000000;
    WHEN 'high yield savings' THEN 
      prefix := 'HYS';
      sequence_start := 100000000000;
    WHEN 'trust account' THEN 
      prefix := 'TST';
      sequence_start := 100000000000;
    WHEN 'escrow account' THEN 
      prefix := 'ESC';
      sequence_start := 100000000000;
    WHEN 'investment account' THEN 
      prefix := 'INV';
      sequence_start := 100000000000;
    WHEN 'business account' THEN 
      prefix := 'BUS';
      sequence_start := 100000000000;
    ELSE 
      prefix := 'CUS'; -- Custom
      sequence_start := 100000000000;
  END CASE;
  
  -- Get the next sequential number for this account type
  WITH existing_accounts AS (
    SELECT account_number 
    FROM accounts 
    WHERE account_number LIKE prefix || '-%'
  ),
  numbers AS (
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN length(split_part(account_number, '-', 2)) = 12 
            AND split_part(account_number, '-', 2) ~ '^[0-9]+$'
          THEN split_part(account_number, '-', 2)::bigint
          ELSE sequence_start - 1
        END
      ), 
      sequence_start - 1
    ) as max_number
    FROM existing_accounts
  )
  SELECT max_number + 1 INTO next_number FROM numbers;
  
  -- Ensure the number is 12 digits
  account_suffix := LPAD(next_number::text, 12, '0');
  
  RETURN prefix || '-' || account_suffix;
END;
$function$;