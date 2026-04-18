
-- Drop the 2-param overload that blocks admin deletion
DROP FUNCTION IF EXISTS public.delete_user_completely(uuid, uuid);

-- Create is_default_admin helper function
CREATE OR REPLACE FUNCTION public.is_default_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM website_settings ws
    JOIN profiles p ON p.email = ws.super_admin_email
    WHERE p.id = _user_id
    LIMIT 1
  )
$$;

-- Set wyseforte@proton.me as the default admin
UPDATE public.website_settings
SET super_admin_email = 'wyseforte@proton.me'
WHERE id = (SELECT id FROM public.website_settings LIMIT 1);
