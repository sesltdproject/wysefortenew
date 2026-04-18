-- Only create missing storage policies for avatar uploads (skip bucket creation)

-- Try to create policies (will ignore if they already exist)
DO $$
BEGIN
    -- Try to create each policy, ignore if exists
    BEGIN
        CREATE POLICY "Avatar images are publicly accessible" 
        ON storage.objects 
        FOR SELECT 
        USING (bucket_id = 'avatars');
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        CREATE POLICY "Users can upload their own avatar" 
        ON storage.objects 
        FOR INSERT 
        WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        CREATE POLICY "Users can update their own avatar" 
        ON storage.objects 
        FOR UPDATE 
        USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        CREATE POLICY "Users can delete their own avatar" 
        ON storage.objects 
        FOR DELETE 
        USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
END
$$;