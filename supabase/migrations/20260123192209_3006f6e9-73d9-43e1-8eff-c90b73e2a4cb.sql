-- Insert application email templates
INSERT INTO email_templates (template_name, subject_template, html_template, template_variables, is_active)
VALUES 
(
  'application_submitted',
  '{{bank_name}} - Application Received (Ref: {{reference_number}})',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{{bank_name}}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #dbeafe; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 40px;">📋</span>
                </div>
                <h2 style="color: #1e3a5f; margin: 0 0 10px; font-size: 22px;">Application Under Review</h2>
                <p style="color: #6b7280; margin: 0; font-size: 16px;">Thank you for choosing {{bank_name}}</p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dear {{applicant_name}},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                We have received your account application and it is currently under review. Our team is carefully evaluating your submission to ensure we can provide you with the best banking experience.
              </p>
              
              <!-- Reference Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Your Reference Number</p>
                <p style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 2px;">{{reference_number}}</p>
                <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">Please save this for your records</p>
              </div>
              
              <h3 style="color: #1e3a5f; font-size: 16px; margin: 25px 0 15px;">What happens next?</h3>
              <ul style="color: #374151; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 25px;">
                <li>Our team will review your application within 3-5 business days</li>
                <li>You will receive an email notification once a decision has been made</li>
                <li>If additional information is required, we will contact you</li>
              </ul>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                If you have any questions, please contact us at <a href="mailto:{{bank_email}}" style="color: #2563eb; text-decoration: none;">{{bank_email}}</a> or call us at {{bank_phone}}.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0 0 15px; text-align: center;">
                Application submitted on {{application_date}}
              </p>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 15px;">
                <p style="font-size: 11px; color: #9ca3af; line-height: 1.6; margin: 0;">
                  <strong>CONFIDENTIALITY NOTICE:</strong> This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete this email. Any unauthorized use, disclosure, or distribution is prohibited. {{bank_name}} will never ask for your full password or sensitive information via email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["bank_name", "applicant_name", "reference_number", "application_date", "bank_email", "bank_phone"]',
  true
),
(
  'application_approved',
  '🎉 {{bank_name}} - Your Account Has Been Approved!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{{bank_name}}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #dcfce7; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 40px;">✅</span>
                </div>
                <h2 style="color: #059669; margin: 0 0 10px; font-size: 24px;">Congratulations!</h2>
                <p style="color: #374151; margin: 0; font-size: 18px; font-weight: 500;">Your Account Application Has Been Approved</p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Dear {{applicant_name}},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                We are pleased to inform you that your account application has been approved. Welcome to {{bank_name}}! Below are your account details and login credentials.
              </p>
              
              <!-- Account Details Box -->
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                <h3 style="color: #166534; font-size: 16px; margin: 0 0 20px; text-transform: uppercase; letter-spacing: 1px;">Account Details</h3>
                <table width="100%" cellspacing="0" cellpadding="8">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; width: 40%;">Account Number:</td>
                    <td style="color: #1e3a5f; font-size: 16px; font-weight: 600;">{{account_number}}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;">Account Type:</td>
                    <td style="color: #1e3a5f; font-size: 16px; font-weight: 600;">{{account_type}}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;">Account Status:</td>
                    <td><span style="background-color: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">Awaiting Initial Deposit</span></td>
                  </tr>
                </table>
              </div>
              
              <!-- Login Credentials Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
                <h3 style="color: #1e3a5f; font-size: 16px; margin: 0 0 20px; text-transform: uppercase; letter-spacing: 1px;">Login Credentials</h3>
                <table width="100%" cellspacing="0" cellpadding="8">
                  <tr>
                    <td style="color: #6b7280; font-size: 14px; width: 40%;">Username:</td>
                    <td style="color: #1e3a5f; font-size: 16px; font-weight: 600;">{{username}}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-size: 14px;">Password:</td>
                    <td style="color: #1e3a5f; font-size: 16px; font-weight: 600;">{{redacted_password}}</td>
                  </tr>
                </table>
                <p style="color: #dc2626; font-size: 13px; margin: 15px 0 0; font-style: italic;">
                  ⚠️ Please use the password you created during your application. For security, we do not store or display your full password.
                </p>
              </div>
              
              <h3 style="color: #1e3a5f; font-size: 16px; margin: 25px 0 15px;">Next Steps</h3>
              <ol style="color: #374151; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 25px;">
                <li>Log in to your online banking portal using your credentials</li>
                <li>Make your initial deposit to activate your account</li>
                <li>Set up your security preferences and notification settings</li>
                <li>Explore our banking features and services</li>
              </ol>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                If you have any questions, please contact us at <a href="mailto:{{bank_email}}" style="color: #2563eb; text-decoration: none;">{{bank_email}}</a> or call us at {{bank_phone}}.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p style="font-size: 11px; color: #9ca3af; line-height: 1.6; margin: 0;">
                  <strong>CONFIDENTIALITY NOTICE:</strong> This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete this email. Any unauthorized use, disclosure, or distribution is prohibited. {{bank_name}} will never ask for your full password or sensitive information via email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["bank_name", "applicant_name", "account_number", "account_type", "username", "redacted_password", "bank_email", "bank_phone"]',
  true
),
(
  'application_rejected',
  '{{bank_name}} - Account Application Update',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">{{bank_name}}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #fef2f2; border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 40px;">📝</span>
                </div>
                <h2 style="color: #1e3a5f; margin: 0 0 10px; font-size: 22px;">Application Update</h2>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Dear {{applicant_name}},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Thank you for your interest in opening an account with {{bank_name}}. After careful review of your application (Reference: <strong>{{reference_number}}</strong>), we regret to inform you that we are unable to approve your application at this time.
              </p>
              
              <!-- Reason Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 25px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Reason for Decision:</p>
                <p style="color: #374151; font-size: 15px; margin: 0; line-height: 1.6;">{{rejection_reason}}</p>
              </div>
              
              <h3 style="color: #1e3a5f; font-size: 16px; margin: 25px 0 15px;">What You Can Do</h3>
              <ul style="color: #374151; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 25px;">
                <li>Contact our support team to discuss your application</li>
                <li>Address the issues mentioned above and consider reapplying</li>
                <li>Request additional information about our requirements</li>
              </ul>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                We understand this may not be the outcome you were hoping for. Please know that this decision does not reflect on you personally, and we encourage you to reach out if you have any questions or would like to discuss alternative options.
              </p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                For further assistance, please contact us at <a href="mailto:{{bank_email}}" style="color: #2563eb; text-decoration: none;">{{bank_email}}</a> or call us at {{bank_phone}}.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0 0 15px; text-align: center;">
                Thank you for considering {{bank_name}}.
              </p>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 15px;">
                <p style="font-size: 11px; color: #9ca3af; line-height: 1.6; margin: 0;">
                  <strong>CONFIDENTIALITY NOTICE:</strong> This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete this email. Any unauthorized use, disclosure, or distribution is prohibited. {{bank_name}} will never ask for your full password or sensitive information via email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  '["bank_name", "applicant_name", "reference_number", "rejection_reason", "bank_email", "bank_phone"]',
  true
);