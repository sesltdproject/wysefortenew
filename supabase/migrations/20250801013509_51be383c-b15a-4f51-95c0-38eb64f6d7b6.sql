-- Create the missing trigger to automatically create profiles when users are created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create profile records for existing users who don't have profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  CASE 
    WHEN au.email = 'admin@starbank.com' THEN 'admin'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'user')
  END as role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;