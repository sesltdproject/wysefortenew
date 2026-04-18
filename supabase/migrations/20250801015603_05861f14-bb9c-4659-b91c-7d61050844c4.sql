-- Update handle_new_user function to not create demo data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    CASE 
      WHEN NEW.email = 'admin@starbank.com' THEN 'admin'
      ELSE 'user'
    END
  );
  
  -- Removed the call to seed_user_data to ensure all users start with a clean slate
  
  RETURN NEW;
END;
$function$