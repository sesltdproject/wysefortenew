-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE, -- 'credit_alert', 'debit_alert'
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for email templates
CREATE POLICY "Admins can manage email templates" 
ON public.email_templates 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

-- Create function to get email templates
CREATE OR REPLACE FUNCTION public.get_email_templates()
RETURNS TABLE(
  id UUID,
  template_name TEXT,
  subject_template TEXT,
  html_template TEXT,
  template_variables JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    et.id,
    et.template_name,
    et.subject_template,
    et.html_template,
    et.template_variables,
    et.is_active,
    et.created_at,
    et.updated_at
  FROM email_templates et
  WHERE get_current_user_role() = 'admin'
  ORDER BY et.created_at DESC;
$$;

-- Create function to update email template
CREATE OR REPLACE FUNCTION public.update_email_template(
  p_template_name TEXT,
  p_subject_template TEXT,
  p_html_template TEXT,
  p_template_variables JSONB DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_result JSON;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Insert or update template
  INSERT INTO email_templates (
    template_name, 
    subject_template, 
    html_template, 
    template_variables,
    is_active,
    created_by,
    updated_by
  ) VALUES (
    p_template_name,
    p_subject_template,
    p_html_template,
    COALESCE(p_template_variables, '[]'::jsonb),
    p_is_active,
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (template_name) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    html_template = EXCLUDED.html_template,
    template_variables = EXCLUDED.template_variables,
    is_active = EXCLUDED.is_active,
    updated_by = auth.uid(),
    updated_at = NOW()
  RETURNING id INTO v_template_id;
  
  v_result := json_build_object(
    'success', true, 
    'template_id', v_template_id,
    'message', 'Email template updated successfully'
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Failed to update template: ' || SQLERRM);
END;
$$;

-- Create function to get active template by type
CREATE OR REPLACE FUNCTION public.get_active_template(p_template_name TEXT)
RETURNS TABLE(
  id UUID,
  template_name TEXT,
  subject_template TEXT,
  html_template TEXT,
  template_variables JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    et.id,
    et.template_name,
    et.subject_template,
    et.html_template,
    et.template_variables
  FROM email_templates et
  WHERE et.template_name = p_template_name 
    AND et.is_active = true
  LIMIT 1;
$$;

-- Insert default email templates
INSERT INTO email_templates (template_name, subject_template, html_template, template_variables, is_active) VALUES 
(
  'credit_alert',
  'Account Credit Alert - {bank_name}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credit Alert</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content { padding: 15px !important; }
      .amount { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">✓ Credit Alert</h1>
    </div>
    <div class="content" style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear {user_name},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">Your account has been credited with the following transaction:</p>
      
      <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <div class="amount" style="font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin-bottom: 15px;">
          +${amount}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Transaction Type:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{transaction_type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Description:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{description}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Account Number:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{account_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Reference:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{reference_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">New Balance:</td>
            <td style="padding: 8px 0; color: #059669; font-weight: bold; text-align: right;">${new_balance}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Date & Time:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{transaction_date}</td>
          </tr>
        </table>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        If you have any questions about this transaction, please contact us at {contact_email} or visit your nearest branch.
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">{bank_name}</p>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">{bank_address}</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '["user_name", "bank_name", "transaction_type", "amount", "description", "account_number", "reference_number", "new_balance", "transaction_date", "contact_email", "bank_address"]'::jsonb,
  true
),
(
  'debit_alert',
  'Account Debit Alert - {bank_name}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Debit Alert</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content { padding: 15px !important; }
      .amount { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">⚠ Debit Alert</h1>
    </div>
    <div class="content" style="padding: 30px;">
      <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear {user_name},</p>
      <p style="font-size: 16px; color: #333; margin-bottom: 25px;">Your account has been debited with the following transaction:</p>
      
      <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <div class="amount" style="font-size: 32px; font-weight: bold; color: #ef4444; text-align: center; margin-bottom: 15px;">
          -${amount}
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Transaction Type:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{transaction_type}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Description:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{description}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Account Number:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{account_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Reference:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{reference_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">New Balance:</td>
            <td style="padding: 8px 0; color: #059669; font-weight: bold; text-align: right;">${new_balance}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #374151;">Date & Time:</td>
            <td style="padding: 8px 0; color: #6b7280; text-align: right;">{transaction_date}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #fefbf3; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <p style="font-size: 14px; color: #92400e; margin: 0;">
          <strong>Security Notice:</strong> If you did not authorize this transaction, please contact us immediately at {contact_email} or call our 24/7 helpline.
        </p>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
        For any questions about this transaction, please contact us at {contact_email} or visit your nearest branch.
      </p>
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 5px;">{bank_name}</p>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">{bank_address}</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '["user_name", "bank_name", "transaction_type", "amount", "description", "account_number", "reference_number", "new_balance", "transaction_date", "contact_email", "bank_address"]'::jsonb,
  true
);

-- Create trigger to update timestamp
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();