-- Phase 1: Fix RLS issues with security definer function
-- Create the missing get_current_user_role function to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop the existing problematic policy and recreate it properly
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- Add missing policy for admins to insert accounts (drop first if exists)
DROP POLICY IF EXISTS "Admins can insert accounts" ON public.accounts;
CREATE POLICY "Admins can insert accounts" 
ON public.accounts 
FOR INSERT 
WITH CHECK (public.get_current_user_role() = 'admin');

-- Phase 2: Create foreign remittances table for overseas transfers
CREATE TABLE public.foreign_remittances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID NOT NULL,
  
  -- Recipient Bank Information
  swift_code TEXT NOT NULL,
  iban TEXT,
  correspondent_bank TEXT,
  bank_name TEXT NOT NULL,
  bank_address TEXT NOT NULL,
  
  -- Recipient Information
  recipient_name TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  
  -- Transfer Details
  amount DECIMAL(15,2) NOT NULL,
  reference_number TEXT DEFAULT ('FR-' || SUBSTRING(gen_random_uuid()::text, 1, 8)),
  purpose_of_transfer TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'express', 'urgent')),
  
  -- Admin Approval Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.foreign_remittances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for foreign remittances
CREATE POLICY "Users can create their own foreign remittances" 
ON public.foreign_remittances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own foreign remittances" 
ON public.foreign_remittances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all foreign remittances" 
ON public.foreign_remittances 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all foreign remittances" 
ON public.foreign_remittances 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_foreign_remittances_updated_at
BEFORE UPDATE ON public.foreign_remittances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add missing RLS policies for transfers table that was missing policies
CREATE POLICY "Users can create transfers between their accounts" 
ON public.transfers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM accounts 
    WHERE id = from_account_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own transfers" 
ON public.transfers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM accounts 
    WHERE (id = from_account_id OR id = to_account_id) AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all transfers" 
ON public.transfers 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all transfers" 
ON public.transfers 
FOR UPDATE 
USING (public.get_current_user_role() = 'admin');