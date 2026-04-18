-- Add missing columns
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Create support ticket messages table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_ticket_messages
CREATE POLICY "Users can view messages for their tickets"
  ON support_ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON support_ticket_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users and admins can send messages"
  ON support_ticket_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE support_tickets.id = ticket_id 
        AND support_tickets.user_id = auth.uid()
      ) OR has_role(auth.uid(), 'admin')
    )
  );

-- Create missing RPC functions
CREATE OR REPLACE FUNCTION admin_create_transaction(
  p_account_id UUID,
  p_transaction_type transaction_type,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_status transaction_status DEFAULT 'completed'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    completed_at
  ) VALUES (
    p_account_id,
    p_transaction_type,
    p_amount,
    p_description,
    p_status,
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  RETURNING id INTO new_transaction_id;
  
  IF p_status = 'completed' THEN
    UPDATE accounts 
    SET balance = balance + p_amount 
    WHERE id = p_account_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', new_transaction_id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_approve_loan_with_disbursement(
  p_application_id UUID,
  p_approve BOOLEAN,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  application RECORD;
  new_loan_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT * INTO application 
  FROM loan_applications 
  WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan application not found';
  END IF;
  
  IF p_approve THEN
    UPDATE loan_applications
    SET status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = p_application_id;
    
    INSERT INTO loans (
      user_id,
      application_id,
      loan_amount,
      loan_type,
      loan_term_months,
      interest_rate,
      monthly_payment,
      remaining_balance,
      principal_amount,
      disbursement_date,
      maturity_date,
      status
    ) VALUES (
      application.user_id,
      application.id,
      application.requested_amount,
      application.loan_type,
      application.loan_term_months,
      5.0,
      application.requested_amount / application.loan_term_months,
      application.requested_amount,
      application.requested_amount,
      CURRENT_DATE,
      CURRENT_DATE + (application.loan_term_months || ' months')::INTERVAL,
      'active'
    )
    RETURNING id INTO new_loan_id;
    
    IF application.disbursement_account_id IS NOT NULL THEN
      UPDATE accounts
      SET balance = balance + application.requested_amount
      WHERE id = application.disbursement_account_id;
    END IF;
  ELSE
    UPDATE loan_applications
    SET status = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = p_application_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'loan_id', new_loan_id);
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_loan(p_loan_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  DELETE FROM loans WHERE id = p_loan_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;