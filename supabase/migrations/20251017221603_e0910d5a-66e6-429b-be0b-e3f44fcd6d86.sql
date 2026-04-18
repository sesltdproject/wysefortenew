-- Add foreign key constraint from accounts to profiles
-- This enables PostgREST to resolve nested relationships properly
ALTER TABLE public.accounts
ADD CONSTRAINT fk_accounts_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;