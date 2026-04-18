-- Add missing columns to foreign_remittances table for international transfer details
ALTER TABLE public.foreign_remittances 
ADD COLUMN IF NOT EXISTS swift_code TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS correspondent_bank TEXT,
ADD COLUMN IF NOT EXISTS bank_address TEXT,
ADD COLUMN IF NOT EXISTS recipient_address TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS from_account_id UUID;

-- Rename 'purpose' column to 'purpose_of_transfer' to match UI expectations
ALTER TABLE public.foreign_remittances 
RENAME COLUMN purpose TO purpose_of_transfer;

-- Rename 'recipient_bank' to 'bank_name' to match UI expectations
ALTER TABLE public.foreign_remittances 
RENAME COLUMN recipient_bank TO bank_name;

-- Add foreign key constraint for from_account_id
ALTER TABLE public.foreign_remittances
ADD CONSTRAINT fk_foreign_remittances_from_account 
FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;