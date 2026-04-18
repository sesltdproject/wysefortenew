-- Add RLS policies for kyc-applications storage bucket to allow admin access

-- Policy for admins to view/select files from kyc-applications bucket
CREATE POLICY "Admins can view KYC application documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-applications' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy for admins to download files from kyc-applications bucket (same as SELECT)
-- Note: download operations use SELECT policy

-- Policy for public to insert files during application (no auth required)
CREATE POLICY "Public can upload KYC application documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-applications');