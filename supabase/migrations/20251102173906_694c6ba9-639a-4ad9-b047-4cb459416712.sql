-- Phase 2: Create function to generate KYC records from account applications
CREATE OR REPLACE FUNCTION public.create_kyc_from_application(
  p_application_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_application RECORD;
BEGIN
  -- Get application details
  SELECT * INTO v_application
  FROM account_applications
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;
  
  -- Create KYC document record for ID document
  INSERT INTO kyc_documents (
    user_id,
    document_type,
    document_url,
    verification_status,
    uploaded_at,
    reviewed_by,
    reviewed_at
  ) VALUES (
    p_user_id,
    v_application.id_type,
    v_application.id_document_url,
    'approved',
    v_application.created_at,
    v_application.reviewed_by,
    v_application.reviewed_at
  );
  
  -- Create KYC document record for proof of address
  INSERT INTO kyc_documents (
    user_id,
    document_type,
    document_url,
    verification_status,
    uploaded_at,
    reviewed_by,
    reviewed_at
  ) VALUES (
    p_user_id,
    v_application.proof_of_address_type,
    v_application.proof_of_address_url,
    'approved',
    v_application.created_at,
    v_application.reviewed_by,
    v_application.reviewed_at
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update approve_account_application to call create_kyc_from_application
CREATE OR REPLACE FUNCTION public.approve_account_application(
  p_application_id uuid, 
  p_admin_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Phase 4: Storage bucket and policies for KYC documents
-- Create kyc-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete KYC documents" ON storage.objects;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "Users can view own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to read all KYC documents
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete KYC documents
CREATE POLICY "Admins can delete KYC documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);