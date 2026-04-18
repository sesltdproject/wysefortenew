-- Fix 1: Create trigger for transaction email alerts (the trigger doesn't exist!)
-- First fix the function to use correct column names: account_id -> user_id lookup, transaction_type not type

CREATE OR REPLACE FUNCTION public.send_transaction_email_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record RECORD;
  v_user_id UUID;
  v_account_number TEXT;
  v_new_balance NUMERIC;
  url TEXT;
  service_key TEXT;
BEGIN
  -- Get website settings to check if email alerts are enabled
  SELECT * INTO settings_record FROM public.website_settings LIMIT 1;
  
  -- Only send if email alerts are enabled
  IF settings_record.email_alerts_enabled = false THEN
    RETURN NEW;
  END IF;

  -- Get user_id from account (transactions table has account_id, not user_id)
  SELECT user_id, account_number, balance 
  INTO v_user_id, v_account_number, v_new_balance
  FROM public.accounts 
  WHERE id = NEW.account_id;

  IF v_user_id IS NULL THEN
    RAISE WARNING 'Could not find account for transaction';
    RETURN NEW;
  END IF;

  -- Get the service role key from vault
  SELECT decrypted_secret INTO service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;

  -- Build the edge function URL with the correct project ID
  url := 'https://odrcmvvkpxhevulxcrcj.supabase.co/functions/v1/send-transaction-email';

  -- Call the edge function asynchronously
  -- Use correct column names: transaction_type instead of type
  PERFORM net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body := jsonb_build_object(
      'user_id', v_user_id,
      'transaction_type', NEW.transaction_type,
      'amount', NEW.amount,
      'description', COALESCE(NEW.description, ''),
      'account_number', v_account_number,
      'reference_number', COALESCE(NEW.reference_number, ''),
      'new_balance', v_new_balance
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send transaction email alert: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS transaction_email_alert_trigger ON transactions;
CREATE TRIGGER transaction_email_alert_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION send_transaction_email_alert();

-- Fix 7: Create trigger to insert crypto deposits into transactions table
CREATE OR REPLACE FUNCTION public.create_crypto_deposit_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    created_by,
    reference_number
  ) VALUES (
    NEW.account_id,
    'deposit',
    NEW.amount,
    'Crypto Deposit - ' || NEW.crypto_type || ' (Hash: ' || SUBSTRING(NEW.transaction_hash, 1, 16) || '...)',
    'pending',
    NEW.user_id,
    'CRYPTO-' || SUBSTRING(NEW.id::text, 1, 8)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crypto_deposit_transaction_trigger ON crypto_deposits;
CREATE TRIGGER crypto_deposit_transaction_trigger
  AFTER INSERT ON crypto_deposits
  FOR EACH ROW
  EXECUTE FUNCTION create_crypto_deposit_transaction();

-- Add password_hash column to account_applications for storing hashed passwords
ALTER TABLE account_applications 
ADD COLUMN IF NOT EXISTS password_hash TEXT;