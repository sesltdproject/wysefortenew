-- Update the generate_account_number function to use sequential numbering
CREATE OR REPLACE FUNCTION public.generate_account_number(account_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  prefix TEXT;
  sequence_start INTEGER;
  next_number INTEGER;
  account_suffix TEXT;
BEGIN
  -- Set prefix and starting sequence based on account type
  CASE LOWER(account_type)
    WHEN 'checking' THEN 
      prefix := 'CHK';
      sequence_start := 1000000000; -- Start from 1000000000
    WHEN 'savings' THEN 
      prefix := 'SAV';
      sequence_start := 1110000000; -- Start from 1110000000
    WHEN 'premium checking' THEN 
      prefix := 'PCK';
      sequence_start := 1220000000; -- Start from 1220000000
    WHEN 'premium savings' THEN 
      prefix := 'PSV';
      sequence_start := 1330000000; -- Start from 1330000000
    WHEN 'high yield savings' THEN 
      prefix := 'HYS';
      sequence_start := 1440000000; -- Start from 1440000000
    WHEN 'escrow account' THEN 
      prefix := 'ESC';
      sequence_start := 1000000000;
    WHEN 'call account' THEN 
      prefix := 'CAL';
      sequence_start := 1110000000;
    WHEN 'investment account' THEN 
      prefix := 'INV';
      sequence_start := 1220000000;
    WHEN 'trust account' THEN 
      prefix := 'TRU';
      sequence_start := 1330000000;
    ELSE 
      prefix := 'CUS'; -- Custom
      sequence_start := 1440000000;
  END CASE;
  
  -- Get the next sequential number for this account type
  WITH existing_accounts AS (
    SELECT account_number 
    FROM accounts 
    WHERE account_number LIKE prefix || '-%'
  ),
  numbers AS (
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN length(split_part(account_number, '-', 2)) = 10 
            AND split_part(account_number, '-', 2) ~ '^[0-9]+$'
          THEN split_part(account_number, '-', 2)::bigint
          ELSE sequence_start - 1
        END
      ), 
      sequence_start - 1
    ) as max_number
    FROM existing_accounts
  )
  SELECT max_number + 1 INTO next_number FROM numbers;
  
  -- Ensure the number is 10 digits
  account_suffix := LPAD(next_number::text, 10, '0');
  
  RETURN prefix || '-' || account_suffix;
END;
$function$;