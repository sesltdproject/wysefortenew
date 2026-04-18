-- Create deposits storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('deposits', 'deposits', false);

-- Create storage policies for deposits bucket
CREATE POLICY "Users can upload their own deposit files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'deposits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own deposit files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'deposits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all deposit files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'deposits' AND get_current_user_role() = 'admin');

-- Create check_deposits table
CREATE TABLE public.check_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  front_image_url TEXT,
  back_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID
);

-- Enable RLS on check_deposits
ALTER TABLE public.check_deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for check_deposits
CREATE POLICY "Users can view their own check deposits" 
ON public.check_deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own check deposits" 
ON public.check_deposits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all check deposits" 
ON public.check_deposits 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all check deposits" 
ON public.check_deposits 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

-- Create crypto_deposit_config table
CREATE TABLE public.crypto_deposit_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crypto_type TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on crypto_deposit_config
ALTER TABLE public.crypto_deposit_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for crypto_deposit_config
CREATE POLICY "Everyone can view active crypto configs" 
ON public.crypto_deposit_config 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage crypto configs" 
ON public.crypto_deposit_config 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create crypto_deposits table
CREATE TABLE public.crypto_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL,
  crypto_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  wallet_address_used TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID
);

-- Enable RLS on crypto_deposits
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for crypto_deposits
CREATE POLICY "Users can view their own crypto deposits" 
ON public.crypto_deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crypto deposits" 
ON public.crypto_deposits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all crypto deposits" 
ON public.crypto_deposits 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all crypto deposits" 
ON public.crypto_deposits 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

-- Create triggers for updated_at columns
CREATE TRIGGER update_check_deposits_updated_at
BEFORE UPDATE ON public.check_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crypto_deposit_config_updated_at
BEFORE UPDATE ON public.crypto_deposit_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crypto_deposits_updated_at
BEFORE UPDATE ON public.crypto_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default crypto configurations
INSERT INTO public.crypto_deposit_config (crypto_type, wallet_address, is_active) VALUES
('BTC', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', false),
('USDT-TRC20', 'TQn9Y2khEsLJW1ChVWFMSMeRDow5HXKZ4k', false);