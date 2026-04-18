-- Create email_templates table with proper schema
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT UNIQUE NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default email templates
INSERT INTO public.email_templates (template_name, subject_template, html_template, template_variables, is_active)
VALUES 
  ('welcome', 'Welcome to {{bank_name}}', '<h1>Welcome to {{bank_name}}</h1><p>Hello {{user_name}},</p><p>Thank you for choosing us as your banking partner. We are excited to have you on board!</p><p>Best regards,<br>The {{bank_name}} Team</p>', '["user_name", "bank_name"]'::jsonb, true),
  ('credit_alert', 'Credit Alert - {{bank_name}}', '<h2>Credit Alert</h2><p>Dear {{user_name}},</p><p>Your account {{account_number}} has been credited with {{amount}}.</p><p><strong>Transaction Details:</strong></p><ul><li>Description: {{description}}</li><li>Reference: {{reference_number}}</li><li>New Balance: {{new_balance}}</li><li>Date: {{transaction_date}}</li></ul><p>Best regards,<br>{{bank_name}}</p>', '["user_name", "account_number", "amount", "description", "reference_number", "new_balance", "transaction_date", "bank_name"]'::jsonb, true),
  ('debit_alert', 'Debit Alert - {{bank_name}}', '<h2>Debit Alert</h2><p>Dear {{user_name}},</p><p>Your account {{account_number}} has been debited with {{amount}}.</p><p><strong>Transaction Details:</strong></p><ul><li>Description: {{description}}</li><li>Reference: {{reference_number}}</li><li>New Balance: {{new_balance}}</li><li>Date: {{transaction_date}}</li></ul><p>Best regards,<br>{{bank_name}}</p>', '["user_name", "account_number", "amount", "description", "reference_number", "new_balance", "transaction_date", "bank_name"]'::jsonb, true),
  ('transfer_notification', 'Transfer Notification - {{bank_name}}', '<h2>Transfer Notification</h2><p>Dear {{user_name}},</p><p>A transfer of {{amount}} has been successfully processed.</p><p><strong>Transfer Details:</strong></p><ul><li>From: {{from_account}}</li><li>To: {{to_account}}</li><li>Reference: {{reference_number}}</li><li>Date: {{transaction_date}}</li></ul><p>Best regards,<br>{{bank_name}}</p>', '["user_name", "amount", "from_account", "to_account", "reference_number", "transaction_date", "bank_name"]'::jsonb, true)
ON CONFLICT (template_name) DO NOTHING;

-- Enable RLS on email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Recreate get_email_templates function
CREATE OR REPLACE FUNCTION public.get_email_templates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN (
    SELECT jsonb_agg(row_to_json(t))
    FROM public.email_templates t
    ORDER BY t.template_name
  );
END;
$function$;

-- Update the update_email_template function
CREATE OR REPLACE FUNCTION public.update_email_template(
  template_id TEXT,
  new_subject TEXT,
  new_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.email_templates
  SET 
    subject_template = new_subject,
    html_template = new_body,
    updated_at = now()
  WHERE template_name = template_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template not found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Template updated successfully');
END;
$function$;

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();