-- Insert default website settings
INSERT INTO website_settings (
  bank_name, 
  bank_email, 
  support_email,
  email_alerts_enabled,
  auth_emails_enabled,
  show_navigation_menu,
  website_visibility,
  show_kyc_page
) VALUES (
  'Wyseforte Bank',
  'support@capitalinvbank.com',
  'support@capitalinvbank.com',
  true,
  true,
  true,
  true,
  true
);

-- Insert default transfer charges
INSERT INTO transfer_charges (domestic_charge, international_charge)
VALUES (25.00, 50.00);

-- Insert default loan interest rates (only valid types per check constraint)
INSERT INTO loan_interest_rates (loan_type, interest_rate, description) VALUES
  ('personal', 12.5, 'Personal Loan'),
  ('mortgage', 6.5, 'Mortgage Loan'),
  ('auto', 8.0, 'Auto Loan'),
  ('business', 10.0, 'Business Loan');

-- Add RLS policies for password_reset_requests
CREATE POLICY "Admins can view password reset requests"
ON password_reset_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage password reset requests"
ON password_reset_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));