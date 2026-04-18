-- Fix storage policies for avatars bucket to allow authenticated users to upload
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can view avatars" ON storage.objects;

-- Create proper storage policies for avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');