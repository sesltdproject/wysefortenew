-- Fix storage access issues for deposits bucket
-- First, check if RLS policies exist for storage.objects table for the deposits bucket

-- Create policies for the deposits bucket to allow signed URL generation
-- Policy for admins to access all files in deposits bucket
CREATE POLICY "Admins can access all files in deposits bucket" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'deposits' 
  AND (get_current_user_role() = 'admin')
);

-- Policy for users to access their own files in deposits bucket
CREATE POLICY "Users can access their own files in deposits bucket" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'deposits' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for QR codes access (everyone can view QR codes for crypto configs)
CREATE POLICY "Everyone can view QR codes for crypto configs" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'deposits' 
  AND name LIKE 'qr_codes/%'
);

-- Allow users to upload their own files to deposits bucket
CREATE POLICY "Users can upload their own files to deposits bucket" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'deposits' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to upload QR codes
CREATE POLICY "Admins can upload QR codes" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'deposits' 
  AND name LIKE 'qr_codes/%'
  AND get_current_user_role() = 'admin'
);