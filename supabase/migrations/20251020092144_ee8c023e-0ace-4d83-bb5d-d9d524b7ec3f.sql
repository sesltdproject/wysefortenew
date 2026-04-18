-- Cleanup migration to ensure account_type enum consistency
-- This migration updates any legacy 'business' values to 'business_account'

-- Update any accounts that might have 'business' to 'business_account'
UPDATE public.accounts 
SET account_type = 'business_account' 
WHERE account_type::text = 'business';

-- Add informational notice about enum values
DO $$
BEGIN
    RAISE NOTICE 'Account type enum cleanup completed. Valid values: checking, savings, premium_checking, premium_savings, high_yield_savings, trust_account, escrow_account, investment_account, business_account';
END $$;