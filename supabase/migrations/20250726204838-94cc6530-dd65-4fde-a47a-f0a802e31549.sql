-- Create website_settings table
CREATE TABLE public.website_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL DEFAULT 'StarBank',
  bank_address TEXT NOT NULL DEFAULT '123 Main Street, Cityville, ST 12345',
  bank_phone TEXT NOT NULL DEFAULT '(555) 123-4567',
  contact_email TEXT NOT NULL DEFAULT 'info@starbank.com',
  logo_url TEXT,
  favicon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view website settings" 
ON public.website_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update website settings" 
ON public.website_settings 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert website settings" 
ON public.website_settings 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin');

-- Create function to get website settings
CREATE OR REPLACE FUNCTION public.get_website_settings()
RETURNS TABLE (
  bank_name TEXT,
  bank_address TEXT,
  bank_phone TEXT,
  contact_email TEXT,
  logo_url TEXT,
  favicon_url TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ws.bank_name,
    ws.bank_address,
    ws.bank_phone,
    ws.contact_email,
    ws.logo_url,
    ws.favicon_url
  FROM website_settings ws
  ORDER BY ws.created_at DESC
  LIMIT 1;
$$;

-- Create function to update website settings
CREATE OR REPLACE FUNCTION public.update_website_settings(
  p_bank_name TEXT DEFAULT NULL,
  p_bank_address TEXT DEFAULT NULL,
  p_bank_phone TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_favicon_url TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings_id UUID;
  v_result json;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get or create settings record
  SELECT id INTO v_settings_id FROM website_settings ORDER BY created_at DESC LIMIT 1;
  
  IF v_settings_id IS NULL THEN
    -- Insert first settings record
    INSERT INTO website_settings (
      bank_name,
      bank_address,
      bank_phone,
      contact_email,
      logo_url,
      favicon_url
    ) VALUES (
      COALESCE(p_bank_name, 'StarBank'),
      COALESCE(p_bank_address, '123 Main Street, Cityville, ST 12345'),
      COALESCE(p_bank_phone, '(555) 123-4567'),
      COALESCE(p_contact_email, 'info@starbank.com'),
      p_logo_url,
      p_favicon_url
    )
    RETURNING id INTO v_settings_id;
  ELSE
    -- Update existing settings
    UPDATE website_settings 
    SET 
      bank_name = COALESCE(p_bank_name, bank_name),
      bank_address = COALESCE(p_bank_address, bank_address),
      bank_phone = COALESCE(p_bank_phone, bank_phone),
      contact_email = COALESCE(p_contact_email, contact_email),
      logo_url = COALESCE(p_logo_url, logo_url),
      favicon_url = COALESCE(p_favicon_url, favicon_url),
      updated_at = now()
    WHERE id = v_settings_id;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Website settings updated successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Failed to update settings: ' || SQLERRM);
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_website_settings_updated_at
BEFORE UPDATE ON public.website_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.website_settings (
  bank_name,
  bank_address,
  bank_phone,
  contact_email
) VALUES (
  'StarBank',
  '123 Main Street, Cityville, ST 12345',
  '(555) 123-4567',
  'info@starbank.com'
) ON CONFLICT DO NOTHING;

-- Enable realtime for website_settings table
ALTER TABLE public.website_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.website_settings;