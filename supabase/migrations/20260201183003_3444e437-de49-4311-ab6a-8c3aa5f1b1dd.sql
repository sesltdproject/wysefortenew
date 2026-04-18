-- Add title column to profiles for proper greeting display
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;

-- Create transfer_charges table for admin-configurable transfer fees
CREATE TABLE IF NOT EXISTS public.transfer_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domestic_charge NUMERIC NOT NULL DEFAULT 25.00,
  international_charge NUMERIC NOT NULL DEFAULT 50.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row if not exists
INSERT INTO public.transfer_charges (domestic_charge, international_charge)
SELECT 25.00, 50.00
WHERE NOT EXISTS (SELECT 1 FROM public.transfer_charges);

-- Enable RLS
ALTER TABLE public.transfer_charges ENABLE ROW LEVEL SECURITY;

-- Admins can manage transfer charges
CREATE POLICY "Admins can manage transfer charges" ON public.transfer_charges
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read transfer charges (needed by approval functions)
CREATE POLICY "Anyone can read transfer charges" ON public.transfer_charges
  FOR SELECT USING (true);

-- Create or replace function to apply transfer charges when approving external transfers
CREATE OR REPLACE FUNCTION public.apply_domestic_transfer_charge(
  p_account_id UUID,
  p_reference_number TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_amount NUMERIC;
  v_new_balance NUMERIC;
  v_currency TEXT;
BEGIN
  -- Get domestic charge amount
  SELECT domestic_charge INTO v_charge_amount
  FROM transfer_charges
  LIMIT 1;
  
  -- Default to 25 if no config found
  v_charge_amount := COALESCE(v_charge_amount, 25.00);
  
  -- Get account currency
  SELECT currency INTO v_currency
  FROM accounts
  WHERE id = p_account_id;
  
  -- Debit the transfer charge
  UPDATE accounts
  SET balance = balance - v_charge_amount,
      updated_at = now()
  WHERE id = p_account_id
  RETURNING balance INTO v_new_balance;
  
  -- Create charge transaction record
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    reference_number,
    completed_at
  ) VALUES (
    p_account_id,
    'fee',
    -v_charge_amount,
    v_new_balance,
    'Domestic transfer fee for ' || p_reference_number,
    'completed',
    'FEE-' || p_reference_number,
    now()
  );
END;
$$;

-- Create or replace function to apply transfer charges when approving international transfers
CREATE OR REPLACE FUNCTION public.apply_international_transfer_charge(
  p_account_id UUID,
  p_reference_number TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_amount NUMERIC;
  v_new_balance NUMERIC;
  v_currency TEXT;
BEGIN
  -- Get international charge amount
  SELECT international_charge INTO v_charge_amount
  FROM transfer_charges
  LIMIT 1;
  
  -- Default to 50 if no config found
  v_charge_amount := COALESCE(v_charge_amount, 50.00);
  
  -- Get account currency
  SELECT currency INTO v_currency
  FROM accounts
  WHERE id = p_account_id;
  
  -- Debit the transfer charge
  UPDATE accounts
  SET balance = balance - v_charge_amount,
      updated_at = now()
  WHERE id = p_account_id
  RETURNING balance INTO v_new_balance;
  
  -- Create charge transaction record
  INSERT INTO transactions (
    account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    status,
    reference_number,
    completed_at
  ) VALUES (
    p_account_id,
    'fee',
    -v_charge_amount,
    v_new_balance,
    'International wire transfer fee for ' || p_reference_number,
    'completed',
    'FEE-' || p_reference_number,
    now()
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.apply_domestic_transfer_charge(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_international_transfer_charge(UUID, TEXT) TO authenticated;