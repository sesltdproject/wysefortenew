-- Create function to send transaction email alerts
CREATE OR REPLACE FUNCTION public.send_transaction_email_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_account_number TEXT;
  v_new_balance NUMERIC;
  v_settings_record RECORD;
BEGIN
  -- Get account details and user_id
  SELECT a.user_id, a.account_number, a.balance 
  INTO v_user_id, v_account_number, v_new_balance
  FROM accounts a 
  WHERE a.id = NEW.account_id;
  
  -- Check if email alerts are enabled globally
  SELECT email_alerts_enabled INTO v_settings_record
  FROM website_settings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Only send email if alerts are enabled and transaction is completed
  IF v_settings_record.email_alerts_enabled = true AND NEW.status = 'completed' THEN
    -- Call the edge function to send email (async, won't block transaction)
    PERFORM net.http_post(
      url := 'https://szmsrrazerqxmwawhevc.supabase.co/functions/v1/send-transaction-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', v_user_id,
        'transaction_type', NEW.transaction_type,
        'amount', NEW.amount,
        'description', NEW.description,
        'account_number', v_account_number,
        'reference_number', NEW.reference_number,
        'new_balance', v_new_balance
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to send email alerts for new transactions
DROP TRIGGER IF EXISTS transaction_email_alert_trigger ON transactions;
CREATE TRIGGER transaction_email_alert_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION send_transaction_email_alert();

-- Also trigger on transaction status updates (for pending -> completed)
DROP TRIGGER IF EXISTS transaction_status_email_alert_trigger ON transactions;
CREATE TRIGGER transaction_status_email_alert_trigger
  AFTER UPDATE OF status ON transactions
  FOR EACH ROW
  WHEN (OLD.status != NEW.status AND NEW.status = 'completed')
  EXECUTE FUNCTION send_transaction_email_alert();