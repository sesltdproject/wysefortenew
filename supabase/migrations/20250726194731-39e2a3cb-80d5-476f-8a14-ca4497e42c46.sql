-- Fix remaining security warnings

-- Fix the last two functions with search_path issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_transaction_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_http_response RECORD;
  v_error_message TEXT;
BEGIN
  -- Only send notifications for completed transactions
  IF NEW.status = 'completed' THEN
    BEGIN
      -- Log that we're attempting to send notification
      RAISE LOG 'Attempting to send transaction notification for transaction ID: %', NEW.id;
      
      -- Call the edge function to send email notification
      SELECT * INTO v_http_response FROM net.http_post(
        url := 'https://szmsrrazerqxmwawhevc.supabase.co/functions/v1/send-transaction-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bXNycmF6ZXJxeG13YXdoZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjMyNjYsImV4cCI6MjA2NzUzOTI2Nn0.a7s3MLb8wCv6DWxdeK3M6-j5wsJNlXUaAc5kgBlKNFk"}'::jsonb,
        body := json_build_object('transaction_id', NEW.id)::jsonb
      );
      
      -- Log the HTTP response
      IF v_http_response.status_code BETWEEN 200 AND 299 THEN
        RAISE LOG 'Transaction notification sent successfully for transaction ID: %, HTTP status: %', NEW.id, v_http_response.status_code;
      ELSE
        RAISE WARNING 'Transaction notification failed for transaction ID: %, HTTP status: %, Response: %', NEW.id, v_http_response.status_code, v_http_response.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log any errors but don't fail the transaction
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
      RAISE WARNING 'Failed to send transaction notification for transaction ID: %, Error: %', NEW.id, v_error_message;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Move pg_net extension to extensions schema (security best practice)
-- First check if extensions schema exists, create if not
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension from public to extensions schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the send_transaction_notification function to use the new schema
CREATE OR REPLACE FUNCTION public.send_transaction_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public, extensions'
AS $function$
DECLARE
  v_http_response RECORD;
  v_error_message TEXT;
BEGIN
  -- Only send notifications for completed transactions
  IF NEW.status = 'completed' THEN
    BEGIN
      -- Log that we're attempting to send notification
      RAISE LOG 'Attempting to send transaction notification for transaction ID: %', NEW.id;
      
      -- Call the edge function to send email notification
      SELECT * INTO v_http_response FROM extensions.http_post(
        url := 'https://szmsrrazerqxmwawhevc.supabase.co/functions/v1/send-transaction-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6bXNycmF6ZXJxeG13YXdoZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjMyNjYsImV4cCI6MjA2NzUzOTI2Nn0.a7s3MLb8wCv6DWxdeK3M6-j5wsJNlXUaAc5kgBlKNFk"}'::jsonb,
        body := json_build_object('transaction_id', NEW.id)::jsonb
      );
      
      -- Log the HTTP response
      IF v_http_response.status_code BETWEEN 200 AND 299 THEN
        RAISE LOG 'Transaction notification sent successfully for transaction ID: %, HTTP status: %', NEW.id, v_http_response.status_code;
      ELSE
        RAISE WARNING 'Transaction notification failed for transaction ID: %, HTTP status: %, Response: %', NEW.id, v_http_response.status_code, v_http_response.content;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log any errors but don't fail the transaction
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
      RAISE WARNING 'Failed to send transaction notification for transaction ID: %, Error: %', NEW.id, v_error_message;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Remove admin_stats_view from API access by revoking permissions
REVOKE ALL ON admin_stats_view FROM anon;
REVOKE ALL ON admin_stats_view FROM authenticated;

-- Grant access only to specific roles that need it
GRANT SELECT ON admin_stats_view TO service_role;