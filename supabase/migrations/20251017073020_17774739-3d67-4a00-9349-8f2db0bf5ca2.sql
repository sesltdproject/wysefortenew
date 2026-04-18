-- Add missing account status enum values
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'inactive';
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'dormant';
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'awaiting_deposit';