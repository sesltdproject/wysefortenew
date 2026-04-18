-- Add transfer codes fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN transfer_code_1_enabled boolean DEFAULT false,
ADD COLUMN transfer_code_1_name text,
ADD COLUMN transfer_code_1_value text,
ADD COLUMN transfer_code_2_enabled boolean DEFAULT false,
ADD COLUMN transfer_code_2_name text,
ADD COLUMN transfer_code_2_value text,
ADD COLUMN transfer_code_3_enabled boolean DEFAULT false,
ADD COLUMN transfer_code_3_name text,
ADD COLUMN transfer_code_3_value text;

-- Add constraints for validation
ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_1_name_length 
  CHECK (transfer_code_1_name IS NULL OR length(transfer_code_1_name) <= 100);

ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_1_value_format 
  CHECK (transfer_code_1_value IS NULL OR (length(transfer_code_1_value) = 10 AND transfer_code_1_value ~ '^[A-Za-z0-9]{10}$'));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_2_name_length 
  CHECK (transfer_code_2_name IS NULL OR length(transfer_code_2_name) <= 100);

ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_2_value_format 
  CHECK (transfer_code_2_value IS NULL OR (length(transfer_code_2_value) = 10 AND transfer_code_2_value ~ '^[A-Za-z0-9]{10}$'));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_3_name_length 
  CHECK (transfer_code_3_name IS NULL OR length(transfer_code_3_name) <= 100);

ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_3_value_format 
  CHECK (transfer_code_3_value IS NULL OR (length(transfer_code_3_value) = 10 AND transfer_code_3_value ~ '^[A-Za-z0-9]{10}$'));

-- Add constraints to ensure when enabled, both name and value are provided
ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_1_complete 
  CHECK (NOT transfer_code_1_enabled OR (transfer_code_1_name IS NOT NULL AND transfer_code_1_value IS NOT NULL));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_2_complete 
  CHECK (NOT transfer_code_2_enabled OR (transfer_code_2_name IS NOT NULL AND transfer_code_2_value IS NOT NULL));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_transfer_code_3_complete 
  CHECK (NOT transfer_code_3_enabled OR (transfer_code_3_name IS NOT NULL AND transfer_code_3_value IS NOT NULL));