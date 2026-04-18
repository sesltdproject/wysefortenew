-- Drop the constraint if it exists (in case it's in a broken state)
ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;

-- Add foreign key constraint for support_tickets.user_id -> profiles.id
ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;