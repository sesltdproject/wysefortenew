-- Add reference_number column to foreign_remittances table
ALTER TABLE public.foreign_remittances 
ADD COLUMN reference_number TEXT;

-- Add unique index for reference numbers
CREATE UNIQUE INDEX idx_foreign_remittances_reference_number 
ON public.foreign_remittances(reference_number) 
WHERE reference_number IS NOT NULL;

-- Generate reference numbers for existing records (if any)
UPDATE public.foreign_remittances
SET reference_number = 'INT' || TO_CHAR(created_at, 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0')
WHERE reference_number IS NULL;