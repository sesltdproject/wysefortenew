-- Add email 2FA columns to user_security table
ALTER TABLE user_security 
ADD COLUMN IF NOT EXISTS email_2fa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_2fa_code text,
ADD COLUMN IF NOT EXISTS email_2fa_code_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_2fa_last_sent_at timestamp with time zone;

-- Insert email 2FA login template
INSERT INTO email_templates (template_name, subject_template, html_template, template_variables, is_active)
VALUES (
  'email_2fa_login',
  'Login Verification Code - {{bank_name}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Verification Code</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content { padding: 15px !important; }
      .code { font-size: 28px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: #1e3a5f; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Login Verification</h1>
    </div>
    <div class="content" style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear {user_name},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">A login attempt was detected on your account. Use the verification code below to complete your sign in:</p>
      
      <div style="background-color: #f0f7ff; border: 2px solid #1e3a5f; border-radius: 8px; padding: 25px; margin-bottom: 25px; text-align: center;">
        <div class="code" style="font-size: 36px; font-weight: bold; color: #1e3a5f; letter-spacing: 8px; margin-bottom: 10px;">
          {verification_code}
        </div>
        <p style="font-size: 14px; color: #666; margin: 0;">This code expires in 10 minutes</p>
      </div>
      
      <div style="background-color: #fff8e6; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #92400e; margin: 0 0 10px 0;"><strong>⚠️ Security Notice</strong></p>
        <table style="width: 100%; font-size: 14px; color: #92400e;">
          <tr>
            <td style="padding: 4px 0;"><strong>IP Address:</strong></td>
            <td style="padding: 4px 0;">{login_ip}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Location:</strong></td>
            <td style="padding: 4px 0;">{login_location}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>Date & Time:</strong></td>
            <td style="padding: 4px 0;">{login_time}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #ef4444; margin-bottom: 20px;">
        <strong>If you did not attempt to log in, please contact us immediately at {contact_email} or change your password right away.</strong>
      </p>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        If you have any questions, please contact our support team.
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">{bank_name}</p>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">{bank_address}</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '["user_name", "user_email", "bank_name", "bank_address", "contact_email", "verification_code", "login_ip", "login_location", "login_time"]'::jsonb,
  true
) ON CONFLICT (template_name) DO UPDATE SET
  subject_template = EXCLUDED.subject_template,
  html_template = EXCLUDED.html_template,
  template_variables = EXCLUDED.template_variables,
  updated_at = now();