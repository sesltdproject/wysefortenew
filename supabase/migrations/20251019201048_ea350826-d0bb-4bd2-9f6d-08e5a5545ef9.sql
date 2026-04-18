-- Create website-assets bucket for admin-managed files (logos, favicons, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-assets', 'website-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to website assets
CREATE POLICY "Public read access to website assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'website-assets');

-- Allow admins to upload website assets
CREATE POLICY "Admins can upload website assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'website-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update website assets
CREATE POLICY "Admins can update website assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'website-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete website assets
CREATE POLICY "Admins can delete website assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'website-assets' 
  AND has_role(auth.uid(), 'admin'::app_role)
);