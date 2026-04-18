# Wyseforte Bank - Complete Database Schema Documentation

> **Version:** 1.0  
> **Generated:** February 2026  
> **Database:** PostgreSQL (Supabase)

---

## Table of Contents

1. [Overview](#overview)
2. [Enums](#enums)
3. [Core Tables](#core-tables)
4. [Security & Authentication](#security--authentication)
5. [Financial Tables](#financial-tables)
6. [Application & KYC Tables](#application--kyc-tables)
7. [Support & Notifications](#support--notifications)
8. [Configuration Tables](#configuration-tables)
9. [Database Functions](#database-functions)
10. [Triggers](#triggers)
11. [Views](#views)
12. [Storage Buckets](#storage-buckets)
13. [Row Level Security Policies](#row-level-security-policies)

---

## Overview

This document contains the complete database schema for the Wyseforte Bank application. It includes all tables, enums, functions, triggers, RLS policies, and storage configurations needed to rebuild the entire backend.

### Prerequisites

- PostgreSQL 15+
- Supabase project with Auth enabled
- pgcrypto extension enabled

---

## Enums

```sql
-- Application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Account types
CREATE TYPE public.account_type AS ENUM (
  'checking', 
  'savings', 
  'premium-checking', 
  'premium-savings', 
  'high-yield-savings', 
  'escrow', 
  'call', 
  'investment', 
  'trust'
);

-- Account status
CREATE TYPE public.account_status AS ENUM ('active', 'inactive', 'suspended', 'closed');

-- Transaction types
CREATE TYPE public.transaction_type AS ENUM (
  'deposit', 
  'withdrawal', 
  'transfer', 
  'payment', 
  'fee', 
  'interest', 
  'refund',
  'loan_disbursement',
  'loan_payment'
);

-- Transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Deposit status
CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');

-- KYC verification status
CREATE TYPE public.kyc_status AS ENUM ('pending', 'verified', 'rejected');

-- Loan status
CREATE TYPE public.loan_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'paid_off', 'defaulted');

-- Remittance status
CREATE TYPE public.remittance_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Support ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
```

---

## Core Tables

### profiles

Stores user profile information. Links to `auth.users` via ID.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  title TEXT,
  username TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  account_locked BOOLEAN DEFAULT false,
  loan_applications_allowed BOOLEAN DEFAULT true,
  loan_repayment_account_id UUID REFERENCES public.accounts(id),
  -- Transfer codes (admin-configured)
  transfer_code_1_enabled BOOLEAN DEFAULT false,
  transfer_code_1_name TEXT,
  transfer_code_1_value TEXT,
  transfer_code_2_enabled BOOLEAN DEFAULT false,
  transfer_code_2_name TEXT,
  transfer_code_2_value TEXT,
  transfer_code_3_enabled BOOLEAN DEFAULT false,
  transfer_code_3_name TEXT,
  transfer_code_3_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_username ON public.profiles(username);
```

### user_roles

Stores user roles separately from profiles for security.

```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
```

### accounts

User bank accounts.

```sql
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL UNIQUE,
  account_type account_type NOT NULL DEFAULT 'checking',
  currency TEXT NOT NULL DEFAULT 'USD',
  balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status account_status NOT NULL DEFAULT 'active',
  hidden BOOLEAN DEFAULT false,
  transfers_blocked BOOLEAN DEFAULT false,
  transfers_blocked_at TIMESTAMPTZ,
  transfers_blocked_by UUID,
  transfers_blocked_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_account_number ON public.accounts(account_number);
CREATE INDEX idx_accounts_status ON public.accounts(status);
```

---

## Security & Authentication

### user_security

Stores security settings and 2FA configuration for each user.

```sql
CREATE TABLE public.user_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT false,
  email_2fa_enabled BOOLEAN DEFAULT false,
  email_2fa_code TEXT,
  email_2fa_code_expires_at TIMESTAMPTZ,
  email_2fa_last_sent_at TIMESTAMPTZ,
  security_code_enabled BOOLEAN DEFAULT false,
  security_code_hash TEXT,
  security_code_for_transfers BOOLEAN DEFAULT false,
  backup_codes JSONB DEFAULT '[]'::jsonb,
  backup_codes_generated_at TIMESTAMPTZ,
  login_attempts INTEGER DEFAULT 0,
  failed_verification_attempts INTEGER DEFAULT 0,
  last_failed_attempt TIMESTAMPTZ,
  account_locked BOOLEAN DEFAULT false,
  account_locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  last_login_ip TEXT,
  previous_login_at TIMESTAMPTZ,
  previous_login_ip TEXT,
  must_change_password BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_user_security_user_id ON public.user_security(user_id);
```

### security_code_verification_attempts

Audit log for security code verification attempts.

```sql
CREATE TABLE public.security_code_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_code_verification_attempts ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_security_attempts_user_id ON public.security_code_verification_attempts(user_id);
CREATE INDEX idx_security_attempts_time ON public.security_code_verification_attempts(attempt_time);
```

### password_reset_requests

Stores password reset tokens.

```sql
CREATE TABLE public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reset_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_password_reset_email ON public.password_reset_requests(email);
CREATE INDEX idx_password_reset_code ON public.password_reset_requests(reset_code);
```

### password_reset_audit

Audit log for password reset activities.

```sql
CREATE TABLE public.password_reset_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  action TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;
```

### password_reset_rate_limits

Rate limiting for password reset requests.

```sql
CREATE TABLE public.password_reset_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ
);

-- Indexes
CREATE UNIQUE INDEX idx_rate_limits_identifier ON public.password_reset_rate_limits(identifier, identifier_type);
```

---

## Financial Tables

### transactions

All financial transactions.

```sql
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  balance_after NUMERIC(15,2),
  description TEXT,
  reference_number TEXT,
  recipient_name TEXT,
  recipient_account TEXT,
  bank_name TEXT,
  routing_code TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_transactions_reference ON public.transactions(reference_number);
```

### transfers

Internal transfers between accounts.

```sql
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID NOT NULL REFERENCES public.accounts(id),
  to_account_id UUID NOT NULL REFERENCES public.accounts(id),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  reference_number TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_transfers_from_account ON public.transfers(from_account_id);
CREATE INDEX idx_transfers_to_account ON public.transfers(to_account_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);
```

### foreign_remittances

International wire transfers.

```sql
CREATE TABLE public.foreign_remittances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  from_account_id UUID REFERENCES public.accounts(id),
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_account TEXT NOT NULL,
  recipient_address TEXT,
  recipient_country TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_address TEXT,
  swift_code TEXT,
  iban TEXT,
  correspondent_bank TEXT,
  purpose_of_transfer TEXT,
  priority TEXT DEFAULT 'normal',
  reference_number TEXT,
  status remittance_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.foreign_remittances ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_remittances_user_id ON public.foreign_remittances(user_id);
CREATE INDEX idx_remittances_status ON public.foreign_remittances(status);
CREATE INDEX idx_remittances_created_at ON public.foreign_remittances(created_at);
```

### transfer_charges

Configuration for transfer fees.

```sql
CREATE TABLE public.transfer_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domestic_charge NUMERIC(10,2) NOT NULL DEFAULT 25.00,
  international_charge NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.transfer_charges ENABLE ROW LEVEL SECURITY;

-- Insert default record
INSERT INTO public.transfer_charges (domestic_charge, international_charge) 
VALUES (25.00, 50.00);
```

### check_deposits

Check deposit submissions.

```sql
CREATE TABLE public.check_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  amount NUMERIC(15,2) NOT NULL,
  check_number TEXT NOT NULL,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT NOT NULL,
  status deposit_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.check_deposits ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_check_deposits_user_id ON public.check_deposits(user_id);
CREATE INDEX idx_check_deposits_status ON public.check_deposits(status);
```

### crypto_deposits

Cryptocurrency deposit submissions.

```sql
CREATE TABLE public.crypto_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  amount NUMERIC(15,2) NOT NULL,
  crypto_type TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  wallet_address TEXT,
  status deposit_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_crypto_deposits_user_id ON public.crypto_deposits(user_id);
CREATE INDEX idx_crypto_deposits_status ON public.crypto_deposits(status);
```

### crypto_deposit_config

Admin configuration for cryptocurrency wallet addresses.

```sql
CREATE TABLE public.crypto_deposit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_type TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  qr_code_url TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crypto_deposit_config ENABLE ROW LEVEL SECURITY;
```

### loans

Active loans.

```sql
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  application_id UUID REFERENCES public.loan_applications(id),
  loan_type TEXT,
  loan_amount NUMERIC(15,2) NOT NULL,
  principal_amount NUMERIC(15,2),
  interest_rate NUMERIC(5,2) NOT NULL,
  loan_term_months INTEGER NOT NULL,
  monthly_payment NUMERIC(15,2) NOT NULL,
  remaining_balance NUMERIC(15,2) NOT NULL,
  repayment_account_id UUID REFERENCES public.accounts(id),
  status loan_status NOT NULL DEFAULT 'active',
  disbursement_date DATE,
  maturity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_loans_user_id ON public.loans(user_id);
CREATE INDEX idx_loans_status ON public.loans(status);
```

### loan_applications

Loan application submissions.

```sql
CREATE TABLE public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  loan_type TEXT NOT NULL,
  requested_amount NUMERIC(15,2) NOT NULL,
  monthly_income NUMERIC(15,2),
  employment_status TEXT,
  loan_purpose TEXT,
  loan_term_months INTEGER,
  disbursement_account_id UUID REFERENCES public.accounts(id),
  status loan_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_loan_apps_user_id ON public.loan_applications(user_id);
CREATE INDEX idx_loan_apps_status ON public.loan_applications(status);
```

### loan_payments

Scheduled and completed loan payments.

```sql
CREATE TABLE public.loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount_due NUMERIC(15,2) NOT NULL,
  amount_paid NUMERIC(15,2),
  payment_date DATE,
  late_fee NUMERIC(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX idx_loan_payments_status ON public.loan_payments(status);
```

### loan_interest_rates

Configurable interest rates by loan type.

```sql
CREATE TABLE public.loan_interest_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_type TEXT NOT NULL UNIQUE,
  interest_rate NUMERIC(5,2) NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loan_interest_rates ENABLE ROW LEVEL SECURITY;
```

### bill_payments

Bill payment records.

```sql
CREATE TABLE public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  payee_id UUID NOT NULL REFERENCES public.payees(id),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  reference_number TEXT,
  payment_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
```

### payees

Saved payees for bill payments.

```sql
CREATE TABLE public.payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payee_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT,
  payee_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_payees_user_id ON public.payees(user_id);
```

### account_statements

Generated account statements.

```sql
CREATE TABLE public.account_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credits NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_debits NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_statements ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_statements_user_id ON public.account_statements(user_id);
CREATE INDEX idx_statements_account_id ON public.account_statements(account_id);
```

---

## Application & KYC Tables

### account_applications

New account applications from public form.

```sql
CREATE TABLE public.account_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Personal Information
  title TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  street_address TEXT NOT NULL,
  apartment TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Account Details
  account_ownership TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  joint_applicant_data JSONB,
  business_registration_number TEXT,
  company_name TEXT,
  tax_country TEXT,
  tax_identification_number TEXT,
  employment_status TEXT,
  source_of_funds TEXT,
  -- Identity Verification
  id_type TEXT NOT NULL,
  id_full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  id_document_url TEXT NOT NULL,
  proof_of_address_type TEXT NOT NULL,
  proof_of_address_date DATE,
  proof_of_address_url TEXT NOT NULL,
  -- Security
  desired_username TEXT NOT NULL,
  password_hash TEXT,
  security_code_hash TEXT,
  -- Next of Kin
  next_of_kin_name TEXT NOT NULL,
  next_of_kin_relationship TEXT NOT NULL,
  next_of_kin_phone TEXT NOT NULL,
  next_of_kin_email TEXT NOT NULL,
  next_of_kin_address TEXT,
  -- Consents
  marketing_consent BOOLEAN DEFAULT false,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  accuracy_confirmed BOOLEAN NOT NULL DEFAULT false,
  electronic_consent BOOLEAN NOT NULL DEFAULT false,
  -- Admin
  admin_notes TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_applications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_applications_email ON public.account_applications(email);
CREATE INDEX idx_applications_status ON public.account_applications(status);
CREATE INDEX idx_applications_reference ON public.account_applications(reference_number);
```

### kyc_documents

KYC document uploads for existing users.

```sql
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  verification_status kyc_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_kyc_user_id ON public.kyc_documents(user_id);
CREATE INDEX idx_kyc_status ON public.kyc_documents(verification_status);
```

### email_verification_codes

Email verification for account applications.

```sql
CREATE TABLE public.email_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_verification_email ON public.email_verification_codes(email);
CREATE INDEX idx_email_verification_code ON public.email_verification_codes(verification_code);
```

### next_of_kin

Next of kin information for users.

```sql
CREATE TABLE public.next_of_kin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.next_of_kin ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_next_of_kin_user_id ON public.next_of_kin(user_id);
```

---

## Support & Notifications

### support_tickets

Customer support tickets.

```sql
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
```

### support_ticket_messages

Messages within support tickets.

```sql
CREATE TABLE public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
```

### notifications

User notifications.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
```

### admin_notifications

Admin-specific notifications.

```sql
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
```

### admin_activities

Admin activity audit log.

```sql
CREATE TABLE public.admin_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_activities ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_admin_activities_admin_id ON public.admin_activities(admin_id);
CREATE INDEX idx_admin_activities_created_at ON public.admin_activities(created_at);
```

---

## Configuration Tables

### website_settings

Global website configuration.

```sql
CREATE TABLE public.website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT DEFAULT 'Capital Investment Bank',
  bank_email TEXT DEFAULT 'support@capitalinvbank.com',
  bank_phone TEXT,
  bank_address TEXT,
  support_email TEXT,
  super_admin_email TEXT DEFAULT 'superadmin@capinvbank.com',
  logo_url TEXT,
  favicon_url TEXT,
  footer_logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  -- Feature flags
  email_alerts_enabled BOOLEAN DEFAULT true,
  auth_emails_enabled BOOLEAN DEFAULT true,
  show_navigation_menu BOOLEAN DEFAULT true,
  website_visibility BOOLEAN DEFAULT true,
  show_kyc_page BOOLEAN DEFAULT true,
  -- SMTP configuration
  smtp_enabled BOOLEAN DEFAULT false,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_username TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  smtp_use_ssl BOOLEAN DEFAULT true,
  resend_enabled BOOLEAN DEFAULT true,
  -- Receipt customization
  receipt_header_color TEXT DEFAULT '#003366',
  receipt_accent_color TEXT DEFAULT '#22c55e',
  receipt_title TEXT DEFAULT 'Transfer Confirmation Receipt',
  receipt_show_logo BOOLEAN DEFAULT true,
  receipt_show_watermark BOOLEAN DEFAULT false,
  receipt_watermark_text TEXT DEFAULT 'COPY',
  receipt_footer_disclaimer TEXT DEFAULT 'This is a computer-generated receipt and is valid without signature.',
  receipt_custom_message TEXT,
  receipt_reference_prefix TEXT DEFAULT 'TXN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO public.website_settings (bank_name) VALUES ('Capital Investment Bank');
```

### email_templates

Email template configuration.

```sql
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
```

---

## Database Functions

### has_role (Security Definer)

Check if a user has a specific role. Critical for RLS policies.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### generate_account_number

Generate unique account numbers.

```sql
CREATE OR REPLACE FUNCTION public.generate_account_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 10-digit number starting with specific prefix
    new_number := '10' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM public.accounts WHERE account_number = new_number) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$;
```

### generate_reference_number

Generate unique reference numbers for transactions.

```sql
CREATE OR REPLACE FUNCTION public.generate_reference_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_ref TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_ref := 'TXN' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.transactions WHERE reference_number = new_ref) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN new_ref;
    END IF;
  END LOOP;
END;
$$;
```

### generate_application_reference

Generate reference numbers for account applications.

```sql
CREATE OR REPLACE FUNCTION public.generate_application_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_ref TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_ref := 'APP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    SELECT EXISTS(SELECT 1 FROM public.account_applications WHERE reference_number = new_ref) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN new_ref;
    END IF;
  END LOOP;
END;
$$;
```

### verify_security_code

Verify user's security code.

```sql
CREATE OR REPLACE FUNCTION public.verify_security_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
  is_valid BOOLEAN;
BEGIN
  -- Get the stored hash
  SELECT security_code_hash INTO stored_hash
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verify using pgcrypto
  is_valid := stored_hash = crypt(p_code, stored_hash);
  
  -- Log the attempt
  INSERT INTO public.security_code_verification_attempts (user_id, success)
  VALUES (p_user_id, is_valid);
  
  RETURN is_valid;
END;
$$;
```

### toggle_security_code

Enable or disable security code.

```sql
CREATE OR REPLACE FUNCTION public.toggle_security_code(
  p_user_id UUID,
  p_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_enabled BOOLEAN;
  new_hash TEXT;
BEGIN
  -- Get current state
  SELECT security_code_enabled INTO current_enabled
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  IF current_enabled IS NULL THEN
    -- Create record if not exists
    INSERT INTO public.user_security (user_id, security_code_enabled)
    VALUES (p_user_id, FALSE);
    current_enabled := FALSE;
  END IF;
  
  IF current_enabled THEN
    -- Disable security code
    UPDATE public.user_security
    SET security_code_enabled = FALSE,
        security_code_hash = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'enabled', false);
  ELSE
    -- Enable security code
    IF p_code IS NULL OR LENGTH(p_code) < 4 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Code must be at least 4 characters');
    END IF;
    
    -- Hash the code
    new_hash := crypt(p_code, gen_salt('bf'));
    
    UPDATE public.user_security
    SET security_code_enabled = TRUE,
        security_code_hash = new_hash,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'enabled', true);
  END IF;
END;
$$;
```

### process_internal_transfer

Process transfers between user's own accounts.

```sql
CREATE OR REPLACE FUNCTION public.process_internal_transfer(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_from_user_id UUID;
  v_to_user_id UUID;
  v_reference TEXT;
BEGIN
  -- Verify both accounts belong to same user
  SELECT user_id, balance INTO v_from_user_id, v_from_balance
  FROM public.accounts WHERE id = p_from_account_id FOR UPDATE;
  
  SELECT user_id, balance INTO v_to_user_id, v_to_balance
  FROM public.accounts WHERE id = p_to_account_id FOR UPDATE;
  
  IF v_from_user_id != v_to_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Both accounts must belong to the same user');
  END IF;
  
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  -- Generate reference
  v_reference := generate_reference_number();
  
  -- Update balances
  UPDATE public.accounts SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = p_from_account_id;
  
  UPDATE public.accounts SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = p_to_account_id;
  
  -- Create transfer record
  INSERT INTO public.transfers (from_account_id, to_account_id, amount, description, reference_number, status)
  VALUES (p_from_account_id, p_to_account_id, p_amount, p_description, v_reference, 'completed');
  
  -- Create transaction records
  INSERT INTO public.transactions (account_id, transaction_type, amount, balance_after, description, reference_number, status, completed_at)
  VALUES 
    (p_from_account_id, 'transfer', -p_amount, v_from_balance - p_amount, 'Transfer Out: ' || COALESCE(p_description, ''), v_reference, 'completed', NOW()),
    (p_to_account_id, 'transfer', p_amount, v_to_balance + p_amount, 'Transfer In: ' || COALESCE(p_description, ''), v_reference, 'completed', NOW());
  
  RETURN jsonb_build_object('success', true, 'reference_number', v_reference);
END;
$$;
```

### admin_approve_deposit

Approve or reject deposit requests.

```sql
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  deposit_type TEXT,
  deposit_id UUID,
  approve BOOLEAN,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit RECORD;
  v_new_status deposit_status;
  v_reference TEXT;
BEGIN
  v_new_status := CASE WHEN approve THEN 'approved'::deposit_status ELSE 'rejected'::deposit_status END;
  
  IF deposit_type = 'check' THEN
    SELECT * INTO v_deposit FROM public.check_deposits WHERE id = deposit_id;
    
    UPDATE public.check_deposits
    SET status = v_new_status,
        admin_notes = notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = deposit_id;
    
  ELSIF deposit_type = 'crypto' THEN
    SELECT * INTO v_deposit FROM public.crypto_deposits WHERE id = deposit_id;
    
    UPDATE public.crypto_deposits
    SET status = v_new_status,
        admin_notes = notes,
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = deposit_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid deposit type');
  END IF;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit not found');
  END IF;
  
  -- If approved, credit the account
  IF approve THEN
    v_reference := generate_reference_number();
    
    UPDATE public.accounts
    SET balance = balance + v_deposit.amount,
        updated_at = NOW()
    WHERE id = v_deposit.account_id;
    
    -- Create transaction record
    INSERT INTO public.transactions (
      account_id, transaction_type, amount, description, reference_number, status, completed_at
    ) VALUES (
      v_deposit.account_id, 'deposit', v_deposit.amount,
      CASE deposit_type WHEN 'check' THEN 'Check Deposit' ELSE 'Crypto Deposit - ' || v_deposit.crypto_type END,
      v_reference, 'completed', NOW()
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
```

### get_website_settings

Public function to get website settings.

```sql
CREATE OR REPLACE FUNCTION public.get_website_settings()
RETURNS TABLE (
  bank_name TEXT,
  bank_email TEXT,
  bank_phone TEXT,
  bank_address TEXT,
  support_email TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  footer_logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  show_navigation_menu BOOLEAN,
  website_visibility BOOLEAN,
  show_kyc_page BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ws.bank_name,
    ws.bank_email,
    ws.bank_phone,
    ws.bank_address,
    ws.support_email,
    ws.logo_url,
    ws.favicon_url,
    ws.footer_logo_url,
    ws.primary_color,
    ws.secondary_color,
    ws.show_navigation_menu,
    ws.website_visibility,
    ws.show_kyc_page
  FROM public.website_settings ws
  LIMIT 1;
$$;
```

### admin_approve_loan_with_disbursement

Approve loan and disburse funds.

```sql
CREATE OR REPLACE FUNCTION public.admin_approve_loan_with_disbursement(
  p_application_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application RECORD;
  v_interest_rate NUMERIC;
  v_monthly_payment NUMERIC;
  v_loan_id UUID;
  v_reference TEXT;
BEGIN
  -- Get application details
  SELECT * INTO v_application FROM public.loan_applications WHERE id = p_application_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found');
  END IF;
  
  IF v_application.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application already processed');
  END IF;
  
  -- Get interest rate
  SELECT interest_rate INTO v_interest_rate
  FROM public.loan_interest_rates
  WHERE loan_type = v_application.loan_type;
  
  IF NOT FOUND THEN
    v_interest_rate := 12.0; -- Default rate
  END IF;
  
  -- Calculate monthly payment (simple formula)
  v_monthly_payment := (v_application.requested_amount * (1 + (v_interest_rate / 100))) / COALESCE(v_application.loan_term_months, 12);
  
  -- Create loan record
  INSERT INTO public.loans (
    user_id, application_id, loan_type, loan_amount, principal_amount,
    interest_rate, loan_term_months, monthly_payment, remaining_balance,
    repayment_account_id, status, disbursement_date, maturity_date
  ) VALUES (
    v_application.user_id, p_application_id, v_application.loan_type,
    v_application.requested_amount, v_application.requested_amount,
    v_interest_rate, COALESCE(v_application.loan_term_months, 12),
    v_monthly_payment, v_application.requested_amount * (1 + (v_interest_rate / 100)),
    v_application.disbursement_account_id, 'active', CURRENT_DATE,
    CURRENT_DATE + (COALESCE(v_application.loan_term_months, 12) || ' months')::INTERVAL
  ) RETURNING id INTO v_loan_id;
  
  -- Update application status
  UPDATE public.loan_applications
  SET status = 'approved',
      admin_notes = p_admin_notes,
      reviewed_by = auth.uid(),
      reviewed_at = NOW()
  WHERE id = p_application_id;
  
  -- Disburse funds if account specified
  IF v_application.disbursement_account_id IS NOT NULL THEN
    v_reference := generate_reference_number();
    
    UPDATE public.accounts
    SET balance = balance + v_application.requested_amount,
        updated_at = NOW()
    WHERE id = v_application.disbursement_account_id;
    
    INSERT INTO public.transactions (
      account_id, transaction_type, amount, description, reference_number, status, completed_at
    ) VALUES (
      v_application.disbursement_account_id, 'loan_disbursement', v_application.requested_amount,
      'Loan Disbursement - ' || v_application.loan_type, v_reference, 'completed', NOW()
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'loan_id', v_loan_id);
END;
$$;
```

---

## Triggers

### Update updated_at timestamps

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_settings_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_security_updated_at
  BEFORE UPDATE ON public.user_security
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_next_of_kin_updated_at
  BEFORE UPDATE ON public.next_of_kin
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_applications_updated_at
  BEFORE UPDATE ON public.account_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crypto_deposit_config_updated_at
  BEFORE UPDATE ON public.crypto_deposit_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Handle new user creation

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create user security record
  INSERT INTO public.user_security (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Auto-generate application reference

```sql
CREATE OR REPLACE FUNCTION public.set_application_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := generate_application_reference();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_application_reference_trigger
  BEFORE INSERT ON public.account_applications
  FOR EACH ROW EXECUTE FUNCTION set_application_reference();
```

---

## Views

### admin_check_deposits_view

```sql
CREATE OR REPLACE VIEW public.admin_check_deposits_view AS
SELECT 
  cd.id,
  cd.user_id,
  cd.account_id,
  cd.amount,
  cd.check_number,
  cd.front_image_url,
  cd.back_image_url,
  cd.status,
  cd.admin_notes,
  cd.reviewed_by,
  cd.reviewed_at,
  cd.created_at,
  jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name
  ) AS profiles,
  jsonb_build_object(
    'id', a.id,
    'account_number', a.account_number,
    'account_type', a.account_type
  ) AS accounts
FROM public.check_deposits cd
LEFT JOIN public.profiles p ON cd.user_id = p.id
LEFT JOIN public.accounts a ON cd.account_id = a.id;
```

### admin_crypto_deposits_view

```sql
CREATE OR REPLACE VIEW public.admin_crypto_deposits_view AS
SELECT 
  cd.id,
  cd.user_id,
  cd.account_id,
  cd.amount,
  cd.crypto_type,
  cd.transaction_hash,
  cd.wallet_address,
  cd.status,
  cd.admin_notes,
  cd.reviewed_by,
  cd.reviewed_at,
  cd.created_at,
  jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'full_name', p.full_name
  ) AS profiles,
  jsonb_build_object(
    'id', a.id,
    'account_number', a.account_number,
    'account_type', a.account_type
  ) AS accounts
FROM public.crypto_deposits cd
LEFT JOIN public.profiles p ON cd.user_id = p.id
LEFT JOIN public.accounts a ON cd.account_id = a.id;
```

---

## Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('deposits', 'deposits', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-applications', 'kyc-applications', false);

-- Avatars policies (public read, authenticated upload)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Deposits bucket policies
CREATE POLICY "Users can upload deposit images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'deposits' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view own deposit images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deposits' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all deposit images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'deposits' 
  AND public.has_role(auth.uid(), 'admin')
);

-- KYC documents policies
CREATE POLICY "Users can upload KYC documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view own KYC documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

-- KYC applications (for account applications - public upload, admin view)
CREATE POLICY "Anyone can upload application documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kyc-applications');

CREATE POLICY "Admins can view application documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kyc-applications' 
  AND public.has_role(auth.uid(), 'admin')
);
```

---

## Row Level Security Policies

### profiles

```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

### user_roles

```sql
-- Users can view own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### accounts

```sql
-- Users can view own accounts
CREATE POLICY "Users can view own accounts"
ON public.accounts FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own accounts
CREATE POLICY "Users can update own accounts"
ON public.accounts FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all accounts
CREATE POLICY "Admins can view all accounts"
ON public.accounts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage accounts
CREATE POLICY "Admins can manage accounts"
ON public.accounts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### transactions

```sql
-- Users can view own transactions
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE accounts.id = transactions.account_id
    AND accounts.user_id = auth.uid()
  )
);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage transactions
CREATE POLICY "Admins can manage transactions"
ON public.transactions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### transfers

```sql
-- Users can view own transfers
CREATE POLICY "Users can view own transfers"
ON public.transfers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts
    WHERE (accounts.id = transfers.from_account_id OR accounts.id = transfers.to_account_id)
    AND accounts.user_id = auth.uid()
  )
);

-- Admins can view all transfers
CREATE POLICY "Admins can view all transfers"
ON public.transfers FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage transfers
CREATE POLICY "Admins can manage transfers"
ON public.transfers FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### user_security

```sql
-- Users can view own security settings
CREATE POLICY "Users can view own security settings"
ON public.user_security FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own security settings
CREATE POLICY "Users can insert own security settings"
ON public.user_security FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own security settings
CREATE POLICY "Users can update own security settings"
ON public.user_security FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all security settings
CREATE POLICY "Admins can view all security settings"
ON public.user_security FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all security settings
CREATE POLICY "Admins can update all security settings"
ON public.user_security FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
```

### notifications

```sql
-- Users can view own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert user notifications
CREATE POLICY "System can insert user notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage notifications
CREATE POLICY "Admins can manage notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### support_tickets

```sql
-- Users can view own tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own tickets
CREATE POLICY "Users can update own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage tickets
CREATE POLICY "Admins can manage tickets"
ON public.support_tickets FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### support_ticket_messages

```sql
-- Users can view messages for their tickets
CREATE POLICY "Users can view messages for their tickets"
ON public.support_ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_ticket_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

-- Users and admins can send messages
CREATE POLICY "Users and admins can send messages"
ON public.support_ticket_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.support_ticket_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

### loans & loan_applications

```sql
-- Users can view own loans
CREATE POLICY "Users can view own loans"
ON public.loans FOR SELECT
USING (auth.uid() = user_id);

-- Users can view own loan applications
CREATE POLICY "Users can view own loan applications"
ON public.loan_applications FOR SELECT
USING (auth.uid() = user_id);

-- Users can create loan applications
CREATE POLICY "Users can create loan applications"
ON public.loan_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all loans
CREATE POLICY "Admins can view all loans"
ON public.loans FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage loans
CREATE POLICY "Admins can manage loans"
ON public.loans FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all loan applications
CREATE POLICY "Admins can view all loan applications"
ON public.loan_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage loan applications
CREATE POLICY "Admins can manage loan applications"
ON public.loan_applications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### loan_payments

```sql
-- Users can view own loan payments
CREATE POLICY "Users can view own loan payments"
ON public.loan_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.loans
    WHERE loans.id = loan_payments.loan_id
    AND loans.user_id = auth.uid()
  )
);

-- Admins can view all loan payments
CREATE POLICY "Admins can view all loan payments"
ON public.loan_payments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage loan payments
CREATE POLICY "Admins can manage loan payments"
ON public.loan_payments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert loan payments
CREATE POLICY "Admins can insert loan payments"
ON public.loan_payments FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### loan_interest_rates

```sql
-- Anyone can view interest rates
CREATE POLICY "Anyone can view interest rates"
ON public.loan_interest_rates FOR SELECT
USING (true);

-- Admins can manage interest rates
CREATE POLICY "Admins can manage interest rates"
ON public.loan_interest_rates FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

### check_deposits & crypto_deposits

```sql
-- Users can view own check deposits
CREATE POLICY "Users can view own check deposits"
ON public.check_deposits FOR SELECT
USING (auth.uid() = user_id);

-- Users can create check deposits
CREATE POLICY "Users can create check deposits"
ON public.check_deposits FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all check deposits
CREATE POLICY "Admins can view all check deposits"
ON public.check_deposits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage check deposits
CREATE POLICY "Admins can manage check deposits"
ON public.check_deposits FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Same for crypto deposits
CREATE POLICY "Users can view own crypto deposits"
ON public.crypto_deposits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create crypto deposits"
ON public.crypto_deposits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all crypto deposits"
ON public.crypto_deposits FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage crypto deposits"
ON public.crypto_deposits FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### crypto_deposit_config

```sql
-- Everyone can view enabled crypto config
CREATE POLICY "Everyone can view crypto config"
ON public.crypto_deposit_config FOR SELECT
USING (enabled = true);

-- Admins can manage crypto config
CREATE POLICY "Admins can manage crypto config"
ON public.crypto_deposit_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### foreign_remittances

```sql
-- Users can view own remittances
CREATE POLICY "Users can view own remittances"
ON public.foreign_remittances FOR SELECT
USING (auth.uid() = user_id);

-- Users can create remittances
CREATE POLICY "Users can create remittances"
ON public.foreign_remittances FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all remittances
CREATE POLICY "Admins can view all remittances"
ON public.foreign_remittances FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage remittances
CREATE POLICY "Admins can manage remittances"
ON public.foreign_remittances FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### kyc_documents

```sql
-- Users can view own documents
CREATE POLICY "Users can view own documents"
ON public.kyc_documents FOR SELECT
USING (auth.uid() = user_id);

-- Users can upload documents
CREATE POLICY "Users can upload documents"
ON public.kyc_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON public.kyc_documents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage documents
CREATE POLICY "Admins can manage documents"
ON public.kyc_documents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### next_of_kin

```sql
-- Users can view their own next of kin
CREATE POLICY "Users can view their own next of kin"
ON public.next_of_kin FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own next of kin
CREATE POLICY "Users can insert their own next of kin"
ON public.next_of_kin FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own next of kin
CREATE POLICY "Users can update their own next of kin"
ON public.next_of_kin FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own next of kin
CREATE POLICY "Users can delete their own next of kin"
ON public.next_of_kin FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all next of kin
CREATE POLICY "Admins can view all next of kin"
ON public.next_of_kin FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage all next of kin
CREATE POLICY "Admins can manage all next of kin"
ON public.next_of_kin FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### payees

```sql
-- Users can view own payees
CREATE POLICY "Users can view own payees"
ON public.payees FOR SELECT
USING (auth.uid() = user_id);

-- Users can create own payees
CREATE POLICY "Users can create own payees"
ON public.payees FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own payees
CREATE POLICY "Users can update own payees"
ON public.payees FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own payees
CREATE POLICY "Users can delete own payees"
ON public.payees FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all payees
CREATE POLICY "Admins can view all payees"
ON public.payees FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

### account_statements

```sql
-- Users can view own account statements
CREATE POLICY "Users can view own account statements"
ON public.account_statements FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all account statements
CREATE POLICY "Admins can view all account statements"
ON public.account_statements FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert account statements
CREATE POLICY "Admins can insert account statements"
ON public.account_statements FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can manage account statements
CREATE POLICY "Admins can manage account statements"
ON public.account_statements FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### transfer_charges

```sql
-- Anyone can read transfer charges
CREATE POLICY "Anyone can read transfer charges"
ON public.transfer_charges FOR SELECT
USING (true);

-- Admins can manage transfer charges
CREATE POLICY "Admins can manage transfer charges"
ON public.transfer_charges FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### website_settings

```sql
-- Admins can view all website settings
CREATE POLICY "Admins can view all website settings"
ON public.website_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage website settings
CREATE POLICY "Admins can manage website settings"
ON public.website_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### email_templates

```sql
-- Admins can view email templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage email templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### admin_notifications

```sql
-- Admins can view admin notifications
CREATE POLICY "Admins can view admin notifications"
ON public.admin_notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage admin notifications
CREATE POLICY "Admins can manage admin notifications"
ON public.admin_notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
```

### admin_activities

```sql
-- Admins can view activities
CREATE POLICY "Admins can view activities"
ON public.admin_activities FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can log own activities
CREATE POLICY "Admins can log own activities"
ON public.admin_activities FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND admin_id = auth.uid()
);
```

### password_reset_audit

```sql
-- Admins can view password reset audit
CREATE POLICY "Admins can view password reset audit"
ON public.password_reset_audit FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

### security_code_verification_attempts

```sql
-- Users can view own verification attempts
CREATE POLICY "Users can view own verification attempts"
ON public.security_code_verification_attempts FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all verification attempts
CREATE POLICY "Admins can view all verification attempts"
ON public.security_code_verification_attempts FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
```

### account_applications

```sql
-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.account_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage applications
CREATE POLICY "Admins can manage applications"
ON public.account_applications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Public can insert applications (no auth required)
CREATE POLICY "Public can insert applications"
ON public.account_applications FOR INSERT
WITH CHECK (true);
```

---

## Extensions Required

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Initial Data

```sql
-- Insert default website settings
INSERT INTO public.website_settings (bank_name, bank_email)
VALUES ('Capital Investment Bank', 'support@capitalinvbank.com')
ON CONFLICT DO NOTHING;

-- Insert default transfer charges
INSERT INTO public.transfer_charges (domestic_charge, international_charge)
VALUES (25.00, 50.00)
ON CONFLICT DO NOTHING;

-- Insert default loan interest rates
INSERT INTO public.loan_interest_rates (loan_type, interest_rate, description) VALUES
  ('personal', 12.5, 'Personal Loan'),
  ('mortgage', 6.5, 'Mortgage Loan'),
  ('auto', 8.0, 'Auto Loan'),
  ('business', 10.0, 'Business Loan'),
  ('education', 7.5, 'Education Loan')
ON CONFLICT (loan_type) DO NOTHING;
```

---

## Notes

1. **RLS is enabled on all tables** - Ensure the `has_role` function is created first before applying policies.

2. **The `handle_new_user` trigger** creates profile, role, and security records automatically when a user signs up.

3. **Storage buckets** must be created via the Supabase dashboard or API, not raw SQL in some cases.

4. **Email templates** should be seeded with default templates for various notifications.

5. **Edge Functions** are not included in this schema but are deployed separately.

---

## Rebuild Order

To rebuild the database, execute in this order:

1. Extensions
2. Enums
3. Core tables (profiles, user_roles, accounts)
4. Security tables (user_security, etc.)
5. Financial tables
6. Application & KYC tables
7. Support & Notification tables
8. Configuration tables
9. Functions (especially `has_role` first)
10. Triggers
11. Views
12. Storage buckets & policies
13. RLS policies
14. Initial data

---

*End of Documentation*
