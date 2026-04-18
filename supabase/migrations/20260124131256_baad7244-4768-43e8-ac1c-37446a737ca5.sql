-- Add crypto deposit email templates
INSERT INTO email_templates (template_name, subject_template, html_template, template_variables, is_active)
VALUES (
  'crypto_deposit_pending',
  '{bank_name} - Crypto Deposit Received',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crypto Deposit Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 40px 50px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">{bank_name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Secure Digital Banking</p>
            </td>
          </tr>
          
          <!-- Status Banner -->
          <tr>
            <td style="background-color: #fef3c7; padding: 20px 50px; border-bottom: 1px solid #f59e0b;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #92400e;">⏳ Deposit Pending Review</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #a16207;">Your crypto deposit has been received and is awaiting approval.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 50px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">Dear <strong>{user_name}</strong>,</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">We have received your cryptocurrency deposit request. Our team will review and process your deposit shortly.</p>
              
              <!-- Deposit Details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Deposit Details</h3>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Cryptocurrency:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">{crypto_type}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                        <td style="padding: 8px 0; color: #059669; font-size: 18px; font-weight: 700; text-align: right;">${amount}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Transaction Hash:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 12px; text-align: right; word-break: break-all;">{transaction_hash}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Target Account:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">{account_number}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
                        <td style="padding: 8px 0; text-align: right;"><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">{status}</span></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Submission Date:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{submission_date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- What to Expect -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">What happens next?</h4>
                <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Our team will verify your transaction on the blockchain</li>
                  <li>Review typically takes 1-24 hours</li>
                  <li>You will receive an email once your deposit is approved</li>
                  <li>Funds will be credited to your account after approval</li>
                </ul>
              </div>
              
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">If you have any questions about your deposit, please contact our support team.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 50px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 15px 0;">Need assistance? Contact us at <a href="mailto:{bank_email}" style="color: #2563eb;">{bank_email}</a> or call {bank_phone}</p>
              <div style="border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 20px;">
                <p style="font-size: 11px; color: #9ca3af; line-height: 1.6; margin: 0;">
                  <strong>CONFIDENTIALITY NOTICE:</strong> This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete this email. Any unauthorized use, disclosure, or distribution is prohibited. {bank_name} will never ask for your full password or sensitive information via email.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0; text-align: center;">© {bank_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["bank_name", "user_name", "amount", "crypto_type", "transaction_hash", "account_number", "status", "submission_date", "bank_email", "bank_phone"]',
  true
),
(
  'crypto_deposit_approved',
  '{bank_name} - Crypto Deposit Approved!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crypto Deposit Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f7fa;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); padding: 40px 50px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">{bank_name}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Secure Digital Banking</p>
            </td>
          </tr>
          
          <!-- Success Banner -->
          <tr>
            <td style="background-color: #d1fae5; padding: 20px 50px; border-bottom: 1px solid #10b981;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">✓ Deposit Approved Successfully!</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #047857;">Your crypto deposit has been processed and credited to your account.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 50px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">Dear <strong>{user_name}</strong>,</p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Great news! Your cryptocurrency deposit has been approved and the funds have been credited to your account.</p>
              
              <!-- Deposit Details -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Deposit Summary</h3>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Cryptocurrency:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">{crypto_type}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount Deposited:</td>
                        <td style="padding: 8px 0; color: #059669; font-size: 20px; font-weight: 700; text-align: right;">+${amount}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Account:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">{account_type} - {account_number}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 15px 0 8px 0; border-top: 1px dashed #e5e7eb; margin-top: 10px;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">New Balance:</td>
                        <td style="padding: 8px 0; color: #1e3a5f; font-size: 22px; font-weight: 700; text-align: right;">${new_balance}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Approval Date:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">{approval_date}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Account Balance</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">Thank you for banking with us!</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 50px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0 0 15px 0;">Need assistance? Contact us at <a href="mailto:{bank_email}" style="color: #2563eb;">{bank_email}</a> or call {bank_phone}</p>
              <div style="border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 20px;">
                <p style="font-size: 11px; color: #9ca3af; line-height: 1.6; margin: 0;">
                  <strong>CONFIDENTIALITY NOTICE:</strong> This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete this email. Any unauthorized use, disclosure, or distribution is prohibited. {bank_name} will never ask for your full password or sensitive information via email.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0; text-align: center;">© {bank_name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["bank_name", "user_name", "amount", "crypto_type", "account_number", "account_type", "new_balance", "approval_date", "bank_email", "bank_phone"]',
  true
)
ON CONFLICT (template_name) DO NOTHING;

-- Fix the transaction email alert trigger to use correct project URL
CREATE OR REPLACE FUNCTION public.send_transaction_email_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record RECORD;
  url TEXT;
  service_key TEXT;
BEGIN
  -- Get website settings to check if email alerts are enabled
  SELECT * INTO settings_record FROM public.website_settings LIMIT 1;
  
  -- Only send if email alerts are enabled
  IF settings_record.email_alerts_enabled = false THEN
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
  PERFORM net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'transaction_type', NEW.type,
      'amount', NEW.amount,
      'description', NEW.description,
      'account_number', (SELECT account_number FROM public.accounts WHERE id = NEW.account_id),
      'reference_number', NEW.reference_number,
      'new_balance', (SELECT balance FROM public.accounts WHERE id = NEW.account_id)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send transaction email alert: %', SQLERRM;
  RETURN NEW;
END;
$$;