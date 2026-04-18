
-- Create bills and payees tables for Pay Bills functionality
CREATE TABLE public.payees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payee_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  payee_type TEXT DEFAULT 'individual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.bill_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payee_id UUID NOT NULL,
  from_account_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'completed',
  reference_number TEXT DEFAULT 'BILL-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payees
CREATE POLICY "Users can view their own payees" 
ON public.payees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payees" 
ON public.payees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payees" 
ON public.payees 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payees" 
ON public.payees 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payees" 
ON public.payees 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Create policies for bill payments
CREATE POLICY "Users can view their own bill payments" 
ON public.bill_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bill payments" 
ON public.bill_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bill payments" 
ON public.bill_payments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Add admin policies for account status management
CREATE POLICY "Admins can update account status" 
ON public.accounts 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Add foreign key constraints
ALTER TABLE public.payees 
ADD CONSTRAINT payees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE public.bill_payments 
ADD CONSTRAINT bill_payments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id);

ALTER TABLE public.bill_payments 
ADD CONSTRAINT bill_payments_payee_id_fkey 
FOREIGN KEY (payee_id) REFERENCES payees(id);

ALTER TABLE public.bill_payments 
ADD CONSTRAINT bill_payments_from_account_id_fkey 
FOREIGN KEY (from_account_id) REFERENCES accounts(id);

-- Add triggers for updated_at
CREATE TRIGGER update_payees_updated_at
BEFORE UPDATE ON public.payees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bill_payments_updated_at
BEFORE UPDATE ON public.bill_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
