-- Recreate the trigger to automatically create profiles for new users
-- This trigger was missing, causing new users created by admin to not appear in the profiles table

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also recreate the security trigger if missing
CREATE TRIGGER on_auth_user_created_security
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_security();