-- Fix security warnings by setting search_path on functions

CREATE OR REPLACE FUNCTION generate_application_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ref TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_ref := 'APP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.account_applications WHERE reference_number = new_ref) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_ref;
END;
$$;

CREATE OR REPLACE FUNCTION set_application_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := generate_application_reference();
  END IF;
  RETURN NEW;
END;
$$;