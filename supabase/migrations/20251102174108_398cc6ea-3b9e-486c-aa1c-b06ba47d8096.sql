-- Add missing columns to kyc_documents table
ALTER TABLE public.kyc_documents
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;