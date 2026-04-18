-- Insert account application verification email template
INSERT INTO email_templates (
  template_name,
  subject_template,
  html_template,
  template_variables,
  is_active
) VALUES (
  'account_application_verification',
  '{{bank_name}} - Email Verification Code',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="font-family:''Segoe UI'',Tahoma,Geneva,Verdana,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#1a365d 0%,#2d4a77 100%);padding:30px;text-align:center;border-radius:10px 10px 0 0;"><h1 style="color:white;margin:0;font-size:24px;">{{bank_name}}</h1><p style="color:rgba(255,255,255,0.8);margin:10px 0 0 0;font-size:14px;">Account Application Verification</p></div><div style="background-color:#f8fafc;padding:30px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:none;"><h2 style="color:#1a365d;margin-top:0;">Verify Your Email Address</h2><p>Thank you for applying for an account with {{bank_name}}. To continue with your application, please enter the following verification code:</p><div style="background-color:#1a365d;color:white;font-size:32px;font-weight:bold;letter-spacing:8px;padding:20px;text-align:center;border-radius:8px;margin:25px 0;">{{verification_code}}</div><p style="color:#64748b;font-size:14px;">This code will expire in <strong>{{expiry_time}}</strong>.</p><div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:0 8px 8px 0;"><p style="margin:0;color:#92400e;font-size:14px;"><strong>Security Notice:</strong> If you did not initiate this account application, please disregard this email.</p></div><p style="color:#64748b;font-size:12px;margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;">This is an automated message from {{bank_name}}. Please do not reply to this email.</p></div></body></html>',
  '["bank_name", "verification_code", "expiry_time"]'::jsonb,
  true
) ON CONFLICT (template_name) DO NOTHING;