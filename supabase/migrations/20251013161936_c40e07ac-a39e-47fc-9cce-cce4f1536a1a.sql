-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums for type safety
CREATE TYPE public.app_role AS ENUM ('user', 'admin');
CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'business');
CREATE TYPE public.account_status AS ENUM ('active', 'frozen', 'closed');
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.loan_status AS ENUM ('pending', 'approved', 'denied', 'active', 'completed', 'defaulted');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.remittance_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  account_locked BOOLEAN DEFAULT false,
  loan_applications_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================
-- USER ROLES TABLE (Security best practice - separate from profiles)
-- =====================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- =====================
-- ACCOUNTS TABLE
-- =====================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_type account_type NOT NULL DEFAULT 'checking',
  balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  status account_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================
-- TRANSACTIONS TABLE
-- =====================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2),
  description TEXT,
  reference_number TEXT UNIQUE,
  status transaction_status DEFAULT 'pending' NOT NULL,
  recipient_name TEXT,
  recipient_account TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- =====================
-- SUPPORT TICKETS TABLE
-- =====================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status DEFAULT 'open' NOT NULL,
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ
);

-- =====================
-- KYC DOCUMENTS TABLE
-- =====================
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  verification_status kyc_status DEFAULT 'pending' NOT NULL,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- =====================
-- LOAN APPLICATIONS TABLE
-- =====================
CREATE TABLE public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_amount DECIMAL(15, 2) NOT NULL,
  loan_type TEXT NOT NULL,
  loan_purpose TEXT,
  employment_status TEXT,
  monthly_income DECIMAL(15, 2),
  disbursement_account_id UUID REFERENCES public.accounts(id),
  loan_term_months INTEGER,
  status loan_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- =====================
-- LOANS TABLE
-- =====================
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES public.loan_applications(id),
  loan_amount DECIMAL(15, 2) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  loan_term_months INTEGER NOT NULL,
  monthly_payment DECIMAL(15, 2) NOT NULL,
  remaining_balance DECIMAL(15, 2) NOT NULL,
  status loan_status DEFAULT 'active' NOT NULL,
  disbursement_date DATE,
  maturity_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================
-- LOAN PAYMENTS TABLE
-- =====================
CREATE TABLE public.loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  due_date DATE NOT NULL,
  amount_due DECIMAL(15, 2) NOT NULL,
  amount_paid DECIMAL(15, 2),
  payment_date DATE,
  status TEXT DEFAULT 'pending',
  late_fee DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================
-- WEBSITE SETTINGS TABLE
-- =====================
CREATE TABLE public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT DEFAULT 'Wyseforte Bank',
  bank_email TEXT DEFAULT 'support@capitalinvbank.com',
  bank_phone TEXT,
  bank_address TEXT,
  support_email TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert default settings
INSERT INTO public.website_settings (id, bank_name, bank_email, bank_phone, support_email)
VALUES (gen_random_uuid(), 'Wyseforte Bank', 'support@wyseforte.co.uk', '800-WYS-FORT', 'support@wyseforte.co.uk');

-- =====================
-- CHECK DEPOSITS TABLE
-- =====================
CREATE TABLE public.check_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  check_number TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT NOT NULL,
  status deposit_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- =====================
-- CRYPTO DEPOSITS TABLE
-- =====================
CREATE TABLE public.crypto_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  crypto_type TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  transaction_hash TEXT NOT NULL,
  wallet_address TEXT,
  status deposit_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- =====================
-- CRYPTO DEPOSIT CONFIG TABLE
-- =====================
CREATE TABLE public.crypto_deposit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_type TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================
-- FOREIGN REMITTANCES TABLE
-- =====================
CREATE TABLE public.foreign_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_account TEXT NOT NULL,
  recipient_bank TEXT NOT NULL,
  recipient_country TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency TEXT NOT NULL,
  purpose TEXT,
  status remittance_status DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ
);

-- =====================
-- ADMIN NOTIFICATIONS TABLE
-- =====================
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================
-- ADMIN ACTIVITIES TABLE
-- =====================
CREATE TABLE public.admin_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================
-- ENABLE RLS ON ALL TABLES
-- =====================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_deposit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreign_remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;

-- =====================
-- SECURITY DEFINER FUNCTIONS
-- =====================

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =====================
-- RLS POLICIES - PROFILES
-- =====================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - USER_ROLES
-- =====================
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - ACCOUNTS
-- =====================
CREATE POLICY "Users can view own accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all accounts"
  ON public.accounts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage accounts"
  ON public.accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - TRANSACTIONS
-- =====================
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = transactions.account_id
      AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage transactions"
  ON public.transactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - SUPPORT TICKETS
-- =====================
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage tickets"
  ON public.support_tickets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - KYC DOCUMENTS
-- =====================
CREATE POLICY "Users can view own documents"
  ON public.kyc_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload documents"
  ON public.kyc_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents"
  ON public.kyc_documents FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage documents"
  ON public.kyc_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - LOAN APPLICATIONS
-- =====================
CREATE POLICY "Users can view own loan applications"
  ON public.loan_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create loan applications"
  ON public.loan_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all loan applications"
  ON public.loan_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage loan applications"
  ON public.loan_applications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - LOANS
-- =====================
CREATE POLICY "Users can view own loans"
  ON public.loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all loans"
  ON public.loans FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage loans"
  ON public.loans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - LOAN PAYMENTS
-- =====================
CREATE POLICY "Users can view own loan payments"
  ON public.loan_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all loan payments"
  ON public.loan_payments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage loan payments"
  ON public.loan_payments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - WEBSITE SETTINGS
-- =====================
CREATE POLICY "Everyone can view website settings"
  ON public.website_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage website settings"
  ON public.website_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - CHECK DEPOSITS
-- =====================
CREATE POLICY "Users can view own check deposits"
  ON public.check_deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create check deposits"
  ON public.check_deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all check deposits"
  ON public.check_deposits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage check deposits"
  ON public.check_deposits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - CRYPTO DEPOSITS
-- =====================
CREATE POLICY "Users can view own crypto deposits"
  ON public.crypto_deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create crypto deposits"
  ON public.crypto_deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all crypto deposits"
  ON public.crypto_deposits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage crypto deposits"
  ON public.crypto_deposits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - CRYPTO CONFIG
-- =====================
CREATE POLICY "Everyone can view crypto config"
  ON public.crypto_deposit_config FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can manage crypto config"
  ON public.crypto_deposit_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - FOREIGN REMITTANCES
-- =====================
CREATE POLICY "Users can view own remittances"
  ON public.foreign_remittances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create remittances"
  ON public.foreign_remittances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all remittances"
  ON public.foreign_remittances FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage remittances"
  ON public.foreign_remittances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - ADMIN NOTIFICATIONS
-- =====================
CREATE POLICY "Admins can view notifications"
  ON public.admin_notifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage notifications"
  ON public.admin_notifications FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- RLS POLICIES - ADMIN ACTIVITIES
-- =====================
CREATE POLICY "Admins can view activities"
  ON public.admin_activities FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can log activities"
  ON public.admin_activities FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================
-- TRIGGERS
-- =====================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_settings_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile and assign default role when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now(),
    now()
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'user')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to generate unique account numbers
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 12-digit account number
    new_number := LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM public.accounts WHERE account_number = new_number) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to generate reference numbers for transactions
CREATE OR REPLACE FUNCTION public.generate_reference_number()
RETURNS TEXT AS $$
DECLARE
  new_ref TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate reference like TXN20250112XXXXXXXXXX
    new_ref := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.transactions WHERE reference_number = new_ref) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_ref;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_transaction_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := public.generate_reference_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_transaction_reference_trigger
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_transaction_reference();

-- =====================
-- BUSINESS LOGIC FUNCTIONS
-- =====================

-- Function to get website settings
CREATE OR REPLACE FUNCTION public.get_website_settings()
RETURNS SETOF public.website_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.website_settings LIMIT 1;
$$;

-- Function to update website settings
CREATE OR REPLACE FUNCTION public.update_website_settings(settings JSONB)
RETURNS SETOF public.website_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.website_settings
  SET
    bank_name = COALESCE((settings->>'bank_name')::TEXT, bank_name),
    bank_email = COALESCE((settings->>'bank_email')::TEXT, bank_email),
    bank_phone = COALESCE((settings->>'bank_phone')::TEXT, bank_phone),
    bank_address = COALESCE((settings->>'bank_address')::TEXT, bank_address),
    support_email = COALESCE((settings->>'support_email')::TEXT, support_email),
    logo_url = COALESCE((settings->>'logo_url')::TEXT, logo_url),
    favicon_url = COALESCE((settings->>'favicon_url')::TEXT, favicon_url),
    primary_color = COALESCE((settings->>'primary_color')::TEXT, primary_color),
    secondary_color = COALESCE((settings->>'secondary_color')::TEXT, secondary_color),
    updated_at = now()
  WHERE id = (SELECT id FROM public.website_settings LIMIT 1);
  
  RETURN QUERY SELECT * FROM public.website_settings LIMIT 1;
END;
$$;

-- Function to approve/reject deposits
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  deposit_id UUID,
  deposit_type TEXT,
  approve BOOLEAN,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deposit_record RECORD;
  new_status deposit_status;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  new_status := CASE WHEN approve THEN 'approved' ELSE 'rejected' END;
  
  IF deposit_type = 'check' THEN
    UPDATE public.check_deposits
    SET status = new_status,
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = deposit_id
    RETURNING * INTO deposit_record;
    
    IF approve THEN
      UPDATE public.accounts
      SET balance = balance + deposit_record.amount
      WHERE id = deposit_record.account_id;
    END IF;
  ELSIF deposit_type = 'crypto' THEN
    UPDATE public.crypto_deposits
    SET status = new_status,
        admin_notes = notes,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = deposit_id
    RETURNING * INTO deposit_record;
    
    IF approve THEN
      UPDATE public.accounts
      SET balance = balance + deposit_record.amount
      WHERE id = deposit_record.account_id;
    END IF;
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to delete transaction (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_transaction(transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  DELETE FROM public.transactions WHERE id = transaction_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to approve foreign remittance
CREATE OR REPLACE FUNCTION public.approve_foreign_remittance(
  remittance_id UUID,
  approve BOOLEAN,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remittance_record RECORD;
  new_status remittance_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  new_status := CASE WHEN approve THEN 'approved' ELSE 'rejected' END;
  
  UPDATE public.foreign_remittances
  SET status = new_status,
      admin_notes = notes,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      completed_at = CASE WHEN approve THEN now() ELSE NULL END
  WHERE id = remittance_id
  RETURNING * INTO remittance_record;
  
  IF approve THEN
    UPDATE public.accounts
    SET balance = balance - remittance_record.amount
    WHERE id = remittance_record.account_id;
    
    INSERT INTO public.transactions (
      account_id,
      transaction_type,
      amount,
      description,
      status,
      recipient_name,
      recipient_account,
      completed_at
    ) VALUES (
      remittance_record.account_id,
      'transfer',
      -remittance_record.amount,
      'Foreign Remittance to ' || remittance_record.recipient_name,
      'completed',
      remittance_record.recipient_name,
      remittance_record.recipient_account,
      now()
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to get admin notification counts
CREATE OR REPLACE FUNCTION public.get_admin_notification_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT jsonb_build_object(
    'pending_kyc', (SELECT COUNT(*) FROM public.kyc_documents WHERE verification_status = 'pending'),
    'pending_deposits', (
      SELECT COUNT(*) FROM (
        SELECT id FROM public.check_deposits WHERE status = 'pending'
        UNION ALL
        SELECT id FROM public.crypto_deposits WHERE status = 'pending'
      ) AS deposits
    ),
    'open_tickets', (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress')),
    'pending_loans', (SELECT COUNT(*) FROM public.loan_applications WHERE status = 'pending'),
    'pending_remittances', (SELECT COUNT(*) FROM public.foreign_remittances WHERE status = 'pending')
  ) INTO result;
  
  RETURN result;
END;
$$;