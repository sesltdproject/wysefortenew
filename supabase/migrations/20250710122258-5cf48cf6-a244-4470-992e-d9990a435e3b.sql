-- Update storage policies to allow admin uploads to qr_codes folder
INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('deposits', 'qr_codes/.keep', null, '{}') ON CONFLICT DO NOTHING;

-- Create or update storage policies for QR code uploads
CREATE POLICY "Admins can upload QR codes" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'deposits' 
  AND (storage.foldername(name))[1] = 'qr_codes'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow public read access to QR codes
CREATE POLICY "Public can view QR codes" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'deposits' 
  AND (storage.foldername(name))[1] = 'qr_codes'
);