-- Create loan_interest_rates table
CREATE TABLE IF NOT EXISTS public.loan_interest_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_type TEXT NOT NULL UNIQUE,
  interest_rate NUMERIC(5,2) NOT NULL CHECK (interest_rate >= 0 AND interest_rate <= 100),
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT valid_loan_type CHECK (loan_type IN ('personal', 'auto', 'mortgage', 'business'))
);

-- Create index on loan_type for fast lookups
CREATE INDEX idx_loan_interest_rates_loan_type ON public.loan_interest_rates(loan_type);

-- Enable RLS
ALTER TABLE public.loan_interest_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view interest rates"
  ON public.loan_interest_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage interest rates"
  ON public.loan_interest_rates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_loan_interest_rates_updated_at
  BEFORE UPDATE ON public.loan_interest_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default interest rates
INSERT INTO public.loan_interest_rates (loan_type, interest_rate, description) VALUES
  ('personal', 8.50, 'Standard personal loan interest rate'),
  ('auto', 6.25, 'Auto loan interest rate'),
  ('mortgage', 4.75, 'Mortgage loan interest rate'),
  ('business', 7.00, 'Business loan interest rate')
ON CONFLICT (loan_type) DO NOTHING;

COMMENT ON TABLE public.loan_interest_rates IS 
'Configurable interest rates for different loan types';