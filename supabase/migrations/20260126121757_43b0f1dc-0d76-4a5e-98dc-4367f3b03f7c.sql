-- Create failed_login_alert email template if it doesn't exist
INSERT INTO email_templates (template_name, subject_template, html_template, template_variables, is_active)
VALUES (
  'failed_login_alert',
  'Security Alert: Failed Login Attempts on Your Account',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Security Alert</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">Suspicious Login Activity Detected</p>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear {user_name},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">We detected multiple failed login attempts on your account. As a security measure, your account has been temporarily locked for 30 minutes.</p>
      
      <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <h3 style="color: #991b1b; margin: 0 0 15px; font-size: 16px;">Failed Login Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">IP Address:</td>
            <td style="padding: 8px 0; color: #dc2626; text-align: right; font-family: monospace;">{ip_address}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Date & Time:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{attempt_time}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Failed Attempts:</td>
            <td style="padding: 8px 0; color: #dc2626; font-weight: bold; text-align: right;">{attempt_count}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Account Locked Until:</td>
            <td style="padding: 8px 0; color: #991b1b; font-weight: bold; text-align: right;">{locked_until}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #92400e; margin: 0;">
          <strong>⚠️ Important:</strong> If this was not you, please contact our support team immediately at {bank_email}. We recommend changing your password after regaining access.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        Your account will automatically unlock after 30 minutes. If you need immediate assistance, please contact our 24/7 support team.
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">{bank_name}</p>
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">This is an automated security notification.</p>
      </div>
    </div>
    <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
      <p style="font-size: 11px; color: #6b7280; margin: 0;">
        This email was sent because your account experienced suspicious activity. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>',
  '["user_name", "ip_address", "attempt_time", "attempt_count", "locked_until", "bank_name", "bank_email"]'::jsonb,
  true
) ON CONFLICT (template_name) DO NOTHING;