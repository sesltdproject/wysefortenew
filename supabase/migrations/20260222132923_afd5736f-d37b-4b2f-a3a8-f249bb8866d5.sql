
-- Create the transfer_limits table that the existing functions reference
CREATE TABLE IF NOT EXISTS public.transfer_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE,
  daily_limit NUMERIC NOT NULL DEFAULT 0,
  single_transaction_limit NUMERIC NOT NULL DEFAULT 0,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfer_limits ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage transfer limits"
  ON public.transfer_limits FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view transfer limits"
  ON public.transfer_limits FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow authenticated users to read their own account limits (needed for check_transfer_limit)
CREATE POLICY "Users can view own transfer limits"
  ON public.transfer_limits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = transfer_limits.account_id
    AND accounts.user_id = auth.uid()
  ));
