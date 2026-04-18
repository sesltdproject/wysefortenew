-- Add email alerts setting to website_settings table
ALTER TABLE public.website_settings 
ADD COLUMN email_alerts_enabled BOOLEAN NOT NULL DEFAULT true;

-- Drop and recreate the get_website_settings function to include email_alerts_enabled
DROP FUNCTION IF EXISTS public.get_website_settings();

CREATE OR REPLACE FUNCTION public.get_website_settings()
RETURNS TABLE (
  bank_name TEXT,
  bank_address TEXT,
  bank_phone TEXT,
  contact_email TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  email_alerts_enabled BOOLEAN
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
    ws.favicon_url,
    ws.email_alerts_enabled
  FROM website_settings ws
  ORDER BY ws.created_at DESC
  LIMIT 1;
$$;

-- Update the update_website_settings function to include email_alerts_enabled
CREATE OR REPLACE FUNCTION public.update_website_settings(
  p_bank_name TEXT DEFAULT NULL,
  p_bank_address TEXT DEFAULT NULL,
  p_bank_phone TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_favicon_url TEXT DEFAULT NULL,
  p_email_alerts_enabled BOOLEAN DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings_count INTEGER;
BEGIN
  -- Check if user is admin
  IF get_current_user_role() != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Check if settings exist
  SELECT COUNT(*) INTO v_settings_count FROM website_settings;
  
  IF v_settings_count = 0 THEN
    -- Insert new settings if none exist
    INSERT INTO website_settings (
      bank_name, 
      bank_address, 
      bank_phone, 
      contact_email, 
      logo_url, 
      favicon_url,
      email_alerts_enabled
    ) VALUES (
      COALESCE(p_bank_name, 'StarBank'),
      COALESCE(p_bank_address, '123 Main Street, Cityville, ST 12345'),
      COALESCE(p_bank_phone, '(555) 123-4567'),
      COALESCE(p_contact_email, 'info@starbank.com'),
      p_logo_url,
      p_favicon_url,
      COALESCE(p_email_alerts_enabled, true)
    );
  ELSE
    -- Update existing settings (only non-null values)
    UPDATE website_settings SET
      bank_name = COALESCE(p_bank_name, bank_name),
      bank_address = COALESCE(p_bank_address, bank_address),
      bank_phone = COALESCE(p_bank_phone, bank_phone),
      contact_email = COALESCE(p_contact_email, contact_email),
      logo_url = COALESCE(p_logo_url, logo_url),
      favicon_url = COALESCE(p_favicon_url, favicon_url),
      email_alerts_enabled = COALESCE(p_email_alerts_enabled, email_alerts_enabled),
      updated_at = NOW()
    WHERE id = (
      SELECT id FROM website_settings 
      ORDER BY created_at DESC 
      LIMIT 1
    );
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Website settings updated successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'Failed to update settings: ' || SQLERRM);
END;
$$;