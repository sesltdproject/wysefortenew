-- Update the generate_account_number function to use new format
-- Format: CHK-XXXXX-XXXXXXX
-- Where XXXXX is sequential (00001, 00002, etc.) and XXXXXXX is random
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
DECLARE
  new_number TEXT;
  sequential_part INT;
  random_suffix TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Find the highest sequential number currently in use
    SELECT COALESCE(
      MAX(
        CAST(
          SUBSTRING(account_number FROM 5 FOR 5) AS INT
        )
      ), 
      0
    ) INTO sequential_part
    FROM public.accounts
    WHERE account_number LIKE 'CHK-%';
    
    -- Increment the sequential part
    sequential_part := sequential_part + 1;
    
    -- Generate a random 7-digit suffix
    random_suffix := LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
    
    -- Combine into format CHK-XXXXX-XXXXXXX
    new_number := 'CHK-' || LPAD(sequential_part::TEXT, 5, '0') || '-' || random_suffix;
    
    -- Check if it already exists (unlikely but possible)
    SELECT EXISTS(SELECT 1 FROM public.accounts WHERE account_number = new_number) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_number;
END;
$$;