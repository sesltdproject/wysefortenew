-- Create deposits storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposits', 'deposits', false);

-- Policy: Allow authenticated users to upload their own deposit files
CREATE POLICY "Users can upload own deposit files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deposits' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Allow admins to upload QR codes and configuration files
CREATE POLICY "Admins can upload deposit files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deposits' AND
  has_role(auth.uid(), 'admin')
);

-- Policy: Allow authenticated users to read their own deposit files
CREATE POLICY "Users can read own deposit files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposits' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'))
);

-- Policy: Allow admins to read all deposit files
CREATE POLICY "Admins can read all deposit files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposits' AND
  has_role(auth.uid(), 'admin')
);

-- Policy: Allow admins to update deposit files
CREATE POLICY "Admins can update deposit files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deposits' AND
  has_role(auth.uid(), 'admin')
);

-- Policy: Allow admins to delete deposit files
CREATE POLICY "Admins can delete deposit files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deposits' AND
  has_role(auth.uid(), 'admin')
);