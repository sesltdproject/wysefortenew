-- Update get_admin_notification_counts function to include enhanced notifications
CREATE OR REPLACE FUNCTION public.get_admin_notification_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  pending_check_deposits INT;
  pending_crypto_deposits INT;
  pending_external_transfers INT;
  unread_support_messages INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Get check deposits count
  SELECT COUNT(*) INTO pending_check_deposits
  FROM public.check_deposits 
  WHERE status = 'pending';
  
  -- Get crypto deposits count
  SELECT COUNT(*) INTO pending_crypto_deposits
  FROM public.crypto_deposits 
  WHERE status = 'pending';
  
  -- Get pending external transfers count (domestic transfers awaiting admin approval)
  SELECT COUNT(*) INTO pending_external_transfers
  FROM public.transactions 
  WHERE status = 'pending' 
    AND transaction_type = 'transfer'
    AND recipient_name IS NOT NULL;
  
  -- Get unread support messages count (tickets with new messages from users)
  SELECT COUNT(DISTINCT stm.ticket_id) INTO unread_support_messages
  FROM public.support_ticket_messages stm
  INNER JOIN public.support_tickets st ON st.id = stm.ticket_id
  WHERE stm.is_admin = false
    AND st.status IN ('open', 'in_progress')
    AND stm.created_at > COALESCE(
      (SELECT MAX(created_at) 
       FROM public.support_ticket_messages 
       WHERE ticket_id = stm.ticket_id 
         AND is_admin = true
      ), 
      '1970-01-01'::timestamp
    );
  
  SELECT jsonb_build_object(
    'pendingKYC', (SELECT COUNT(*) FROM public.kyc_documents WHERE verification_status = 'pending'),
    'pendingCheckDeposits', pending_check_deposits,
    'pendingCryptoDeposits', pending_crypto_deposits,
    'supportTickets', (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress')),
    'pendingLoans', (SELECT COUNT(*) FROM public.loan_applications WHERE status = 'pending'),
    'pendingTransfers', (SELECT COUNT(*) FROM public.foreign_remittances WHERE status = 'pending'),
    'pendingExternalTransfers', pending_external_transfers,
    'pendingApplications', (SELECT COUNT(*) FROM public.account_applications WHERE status = 'pending'),
    'unreadSupportMessages', unread_support_messages
  ) INTO result;
  
  RETURN result;
END;
$$;