-- =====================================================
-- MIGRATION: Fix Profile Upload, Pay Bills, and Security Pages
-- =====================================================

-- =====================================================
-- PART 1: Create Avatars Storage Bucket
-- =====================================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- PART 2: Create User Security Table
-- =====================================================

-- Create user_security table
CREATE TABLE IF NOT EXISTS public.user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  account_locked BOOLEAN DEFAULT false,
  security_code_enabled BOOLEAN DEFAULT false,
  security_code_hash TEXT,
  last_updated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_security
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

-- Users can view their own security settings
CREATE POLICY "Users can view own security settings"
ON public.user_security
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own security settings
CREATE POLICY "Users can update own security settings"
ON public.user_security
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own security settings
CREATE POLICY "Users can insert own security settings"
ON public.user_security
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all security settings
CREATE POLICY "Admins can view all security settings"
ON public.user_security
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all security settings
CREATE POLICY "Admins can update all security settings"
ON public.user_security
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create trigger to automatically create security record for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_security (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_security
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_security();

-- Create trigger for updated_at
CREATE TRIGGER update_user_security_updated_at
  BEFORE UPDATE ON public.user_security
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 3: Create Bill Payment Tables
-- =====================================================

-- Create payees table
CREATE TABLE IF NOT EXISTS public.payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  payee_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payees
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- Users can view their own payees
CREATE POLICY "Users can view own payees"
ON public.payees
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own payees
CREATE POLICY "Users can create own payees"
ON public.payees
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own payees
CREATE POLICY "Users can update own payees"
ON public.payees
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own payees
CREATE POLICY "Users can delete own payees"
ON public.payees
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all payees
CREATE POLICY "Admins can view all payees"
ON public.payees
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create bill_payments table
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES public.payees(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  status TEXT DEFAULT 'completed',
  reference_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on bill_payments
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own bill payments
CREATE POLICY "Users can view own bill payments"
ON public.bill_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all bill payments
CREATE POLICY "Admins can view all bill payments"
ON public.bill_payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can manage all bill payments
CREATE POLICY "Admins can manage all bill payments"
ON public.bill_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create process_bill_payment function
CREATE OR REPLACE FUNCTION public.process_bill_payment(
  p_payee_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_payee_user_id UUID;
  v_account_balance NUMERIC;
  v_payee_name TEXT;
  v_reference_number TEXT;
  v_payment_id UUID;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Verify the payee belongs to the user
  SELECT user_id INTO v_payee_user_id
  FROM public.payees
  WHERE id = p_payee_id;
  
  IF v_payee_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payee not found');
  END IF;
  
  IF v_payee_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Payee does not belong to user');
  END IF;
  
  -- Verify the account belongs to the user and get balance
  SELECT balance INTO v_account_balance
  FROM public.accounts
  WHERE id = p_account_id AND user_id = v_user_id;
  
  IF v_account_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account not found or unauthorized');
  END IF;
  
  -- Check sufficient balance
  IF v_account_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Get payee name
  SELECT payee_name INTO v_payee_name
  FROM public.payees
  WHERE id = p_payee_id;
  
  -- Generate reference number
  v_reference_number := 'BILL' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
  
  -- Deduct from account
  UPDATE public.accounts
  SET balance = balance - p_amount
  WHERE id = p_account_id;
  
  -- Create bill payment record
  INSERT INTO public.bill_payments (
    user_id,
    payee_id,
    account_id,
    amount,
    description,
    status,
    reference_number
  ) VALUES (
    v_user_id,
    p_payee_id,
    p_account_id,
    p_amount,
    p_description,
    'completed',
    v_reference_number
  )
  RETURNING id INTO v_payment_id;
  
  -- Create corresponding transaction record
  INSERT INTO public.transactions (
    account_id,
    transaction_type,
    amount,
    description,
    status,
    reference_number,
    recipient_name,
    completed_at
  ) VALUES (
    p_account_id,
    'transfer',
    -p_amount,
    COALESCE(p_description, 'Bill Payment to ' || v_payee_name),
    'completed',
    v_reference_number,
    v_payee_name,
    now()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'reference_number', v_reference_number
  );
END;
$$;