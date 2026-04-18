-- Update RPC function to include pending applications count
CREATE OR REPLACE FUNCTION public.get_admin_notification_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT jsonb_build_object(
    'pending_kyc', (SELECT COUNT(*) FROM public.kyc_documents WHERE verification_status = 'pending'),
    'pending_deposits', (
      SELECT COUNT(*) FROM (
        SELECT id FROM public.check_deposits WHERE status = 'pending'
        UNION ALL
        SELECT id FROM public.crypto_deposits WHERE status = 'pending'
      ) AS deposits
    ),
    'open_tickets', (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress')),
    'pending_loans', (SELECT COUNT(*) FROM public.loan_applications WHERE status = 'pending'),
    'pending_remittances', (SELECT COUNT(*) FROM public.foreign_remittances WHERE status = 'pending'),
    'pending_applications', (SELECT COUNT(*) FROM public.account_applications WHERE status = 'pending')
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Function to approve account application
CREATE OR REPLACE FUNCTION public.approve_account_application(
  p_application_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_application RECORD;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get application details
  SELECT * INTO v_application
  FROM account_applications
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  IF v_application.status != 'pending' THEN
    RAISE EXCEPTION 'Application has already been processed';
  END IF;
  
  -- Update application status to approved
  UPDATE account_applications
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    admin_notes = p_admin_notes
  WHERE id = p_application_id;
  
  -- Log admin activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'application_approved',
    jsonb_build_object(
      'application_id', p_application_id,
      'reference_number', v_application.reference_number,
      'applicant_email', v_application.email
    )::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'message', 'Application approved successfully'
  );
END;
$function$;

-- Function to reject account application
CREATE OR REPLACE FUNCTION public.reject_account_application(
  p_application_id UUID,
  p_rejection_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_application RECORD;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  -- Get application details
  SELECT * INTO v_application
  FROM account_applications
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  
  IF v_application.status != 'pending' THEN
    RAISE EXCEPTION 'Application has already been processed';
  END IF;
  
  -- Update application status to rejected
  UPDATE account_applications
  SET 
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    rejection_reason = p_rejection_reason,
    admin_notes = p_admin_notes
  WHERE id = p_application_id;
  
  -- Log admin activity
  INSERT INTO public.admin_activities (admin_id, action, details)
  VALUES (
    auth.uid(),
    'application_rejected',
    jsonb_build_object(
      'application_id', p_application_id,
      'reference_number', v_application.reference_number,
      'applicant_email', v_application.email,
      'rejection_reason', p_rejection_reason
    )::text
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'message', 'Application rejected successfully'
  );
END;
$function$;