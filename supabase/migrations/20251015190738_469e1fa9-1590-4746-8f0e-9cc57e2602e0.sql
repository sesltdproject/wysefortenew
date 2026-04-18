-- Create account_applications table
CREATE TABLE public.account_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Personal Information
  title TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  street_address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  
  -- Account Details
  account_ownership TEXT NOT NULL CHECK (account_ownership IN ('individual', 'joint', 'corporate')),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  
  -- Joint Applicant (if applicable)
  joint_applicant_data JSONB,
  
  -- Corporate Details (if applicable)
  business_registration_number TEXT,
  company_name TEXT,
  
  -- Tax & Financial
  tax_country TEXT,
  tax_identification_number TEXT,
  employment_status TEXT,
  source_of_funds TEXT,
  
  -- KYC Documents
  id_type TEXT NOT NULL,
  id_full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  id_document_url TEXT NOT NULL,
  proof_of_address_type TEXT NOT NULL,
  proof_of_address_date DATE,
  proof_of_address_url TEXT NOT NULL,
  
  -- Security
  desired_username TEXT NOT NULL,
  
  -- Next of Kin
  next_of_kin_name TEXT NOT NULL,
  next_of_kin_relationship TEXT NOT NULL,
  next_of_kin_phone TEXT NOT NULL,
  next_of_kin_email TEXT NOT NULL,
  next_of_kin_address TEXT,
  
  -- Marketing & Consents
  marketing_consent BOOLEAN DEFAULT false,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  accuracy_confirmed BOOLEAN NOT NULL DEFAULT false,
  electronic_consent BOOLEAN NOT NULL DEFAULT false,
  
  -- Admin Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own applications"
  ON public.account_applications
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all applications"
  ON public.account_applications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
  ON public.account_applications
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create applications"
  ON public.account_applications
  FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-applications', 'kyc-applications', false);

-- Storage policies
CREATE POLICY "Users can upload own KYC documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'kyc-applications');

CREATE POLICY "Users can view own KYC documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'kyc-applications');

CREATE POLICY "Admins can view all KYC documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'kyc-applications' AND has_role(auth.uid(), 'admin'));

-- Function to generate reference number
CREATE OR REPLACE FUNCTION generate_application_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_ref TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_ref := 'APP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    SELECT EXISTS(SELECT 1 FROM public.account_applications WHERE reference_number = new_ref) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_ref;
END;
$$;

-- Trigger to auto-generate reference number
CREATE OR REPLACE FUNCTION set_application_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number := generate_application_reference();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_application_reference_trigger
BEFORE INSERT ON public.account_applications
FOR EACH ROW
EXECUTE FUNCTION set_application_reference();

-- Trigger to update updated_at
CREATE TRIGGER update_account_applications_updated_at
BEFORE UPDATE ON public.account_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();