-- Create loan applications table
CREATE TABLE public.loan_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_amount NUMERIC NOT NULL,
  loan_type TEXT NOT NULL DEFAULT 'personal',
  loan_purpose TEXT,
  employment_status TEXT,
  monthly_income NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID,
  loan_type TEXT NOT NULL,
  principal_amount NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  remaining_balance NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  disbursement_date TIMESTAMP WITH TIME ZONE,
  maturity_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan payments table
CREATE TABLE public.loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL,
  payment_amount NUMERIC NOT NULL,
  principal_amount NUMERIC NOT NULL,
  interest_amount NUMERIC NOT NULL,
  remaining_balance NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'completed',
  payment_method TEXT,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all loan tables
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for loan_applications
CREATE POLICY "Users can create their own loan applications" 
ON public.loan_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own loan applications" 
ON public.loan_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all loan applications" 
ON public.loan_applications 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all loan applications" 
ON public.loan_applications 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

-- RLS policies for loans
CREATE POLICY "Users can view their own loans" 
ON public.loans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all loans" 
ON public.loans 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert loans" 
ON public.loans 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all loans" 
ON public.loans 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

-- RLS policies for loan_payments
CREATE POLICY "Users can view their loan payments" 
ON public.loan_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.loans 
  WHERE loans.id = loan_payments.loan_id 
  AND loans.user_id = auth.uid()
));

CREATE POLICY "Admins can view all loan payments" 
ON public.loan_payments 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "System can insert loan payments" 
ON public.loan_payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update loan payments" 
ON public.loan_payments 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

-- Add foreign key constraints
ALTER TABLE public.loan_applications 
ADD CONSTRAINT loan_applications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.loan_applications 
ADD CONSTRAINT loan_applications_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

ALTER TABLE public.loans 
ADD CONSTRAINT loans_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id);

ALTER TABLE public.loans 
ADD CONSTRAINT loans_application_id_fkey 
FOREIGN KEY (application_id) REFERENCES public.loan_applications(id);

ALTER TABLE public.loan_payments 
ADD CONSTRAINT loan_payments_loan_id_fkey 
FOREIGN KEY (loan_id) REFERENCES public.loans(id);

-- Add triggers for updated_at
CREATE TRIGGER update_loan_applications_updated_at
BEFORE UPDATE ON public.loan_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update John Doe's accounts to new format with $1,000,000 balance
UPDATE public.accounts 
SET account_number = public.generate_account_number('checking'),
    balance = 1000000.00
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'john.doe@starbank.com')
  AND account_type = 'checking';

UPDATE public.accounts 
SET account_number = public.generate_account_number('savings'),
    balance = 1000000.00
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'john.doe@starbank.com')
  AND account_type = 'savings';

-- Create sample loan data for John Doe
INSERT INTO public.loan_applications (user_id, requested_amount, loan_type, loan_purpose, employment_status, monthly_income, status, created_at)
SELECT 
  id as user_id,
  50000.00 as requested_amount,
  'personal' as loan_type,
  'Home improvement' as loan_purpose,
  'employed' as employment_status,
  8500.00 as monthly_income,
  'approved' as status,
  NOW() - INTERVAL '30 days' as created_at
FROM public.profiles 
WHERE email = 'john.doe@starbank.com';

-- Create approved loan for John Doe
INSERT INTO public.loans (user_id, application_id, loan_type, principal_amount, interest_rate, term_months, monthly_payment, remaining_balance, status, disbursement_date, maturity_date)
SELECT 
  p.id as user_id,
  la.id as application_id,
  'personal' as loan_type,
  50000.00 as principal_amount,
  5.99 as interest_rate,
  60 as term_months,
  966.64 as monthly_payment,
  47500.00 as remaining_balance,
  'active' as status,
  NOW() - INTERVAL '25 days' as disbursement_date,
  NOW() + INTERVAL '35 months' as maturity_date
FROM public.profiles p
JOIN public.loan_applications la ON la.user_id = p.id
WHERE p.email = 'john.doe@starbank.com'
  AND la.loan_type = 'personal';

-- Create sample loan payments for John Doe
INSERT INTO public.loan_payments (loan_id, payment_amount, principal_amount, interest_amount, remaining_balance, payment_date, due_date, status, reference_number)
SELECT 
  l.id as loan_id,
  966.64 as payment_amount,
  717.31 as principal_amount,
  249.33 as interest_amount,
  49032.69 as remaining_balance,
  NOW() - INTERVAL '25 days' as payment_date,
  NOW() - INTERVAL '25 days' as due_date,
  'completed' as status,
  'LPN-' || SUBSTRING(gen_random_uuid()::text, 1, 8) as reference_number
FROM public.loans l
JOIN public.profiles p ON p.id = l.user_id
WHERE p.email = 'john.doe@starbank.com'
UNION ALL
SELECT 
  l.id as loan_id,
  966.64 as payment_amount,
  720.89 as principal_amount,
  245.75 as interest_amount,
  48311.80 as remaining_balance,
  NOW() - INTERVAL '5 days' as payment_date,
  NOW() - INTERVAL '5 days' as due_date,
  'completed' as status,
  'LPN-' || SUBSTRING(gen_random_uuid()::text, 1, 8) as reference_number
FROM public.loans l
JOIN public.profiles p ON p.id = l.user_id
WHERE p.email = 'john.doe@starbank.com';