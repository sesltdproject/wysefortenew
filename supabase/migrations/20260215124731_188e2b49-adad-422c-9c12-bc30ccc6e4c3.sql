
-- Add admin storage policies for avatars bucket so admins can manage user avatars
CREATE POLICY "Admins can upload avatars for any user"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can update avatars for any user"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete avatars for any user"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
