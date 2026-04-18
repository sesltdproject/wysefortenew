-- Allow all authenticated users to read QR codes (public configuration files)
CREATE POLICY "Anyone can read QR codes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposits' AND
  (storage.foldername(name))[1] = 'qr_codes'
);