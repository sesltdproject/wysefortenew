-- Add qr_code_url column to crypto_deposit_config table
ALTER TABLE public.crypto_deposit_config
ADD COLUMN qr_code_url TEXT;