-- Update get_admin_notification_counts to include sample user data
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