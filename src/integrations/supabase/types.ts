export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_applications: {
        Row: {
          account_name: string
          account_ownership: string
          account_type: string
          accuracy_confirmed: boolean
          admin_notes: string | null
          apartment: string | null
          business_registration_number: string | null
          city: string
          company_name: string | null
          country: string
          created_at: string
          currency: string | null
          date_of_birth: string
          desired_username: string
          electronic_consent: boolean
          email: string
          employment_status: string | null
          first_name: string
          id: string
          id_document_url: string
          id_full_name: string
          id_number: string
          id_type: string
          joint_applicant_data: Json | null
          last_name: string
          marketing_consent: boolean | null
          middle_name: string | null
          next_of_kin_address: string | null
          next_of_kin_email: string
          next_of_kin_name: string
          next_of_kin_phone: string
          next_of_kin_relationship: string
          password_hash: string | null
          phone_number: string
          postal_code: string
          proof_of_address_date: string | null
          proof_of_address_type: string
          proof_of_address_url: string
          reference_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          security_code_hash: string | null
          source_of_funds: string | null
          state: string
          status: string
          street_address: string
          tax_country: string | null
          tax_identification_number: string | null
          terms_accepted: boolean
          title: string
          updated_at: string
        }
        Insert: {
          account_name: string
          account_ownership: string
          account_type: string
          accuracy_confirmed?: boolean
          admin_notes?: string | null
          apartment?: string | null
          business_registration_number?: string | null
          city: string
          company_name?: string | null
          country: string
          created_at?: string
          currency?: string | null
          date_of_birth: string
          desired_username: string
          electronic_consent?: boolean
          email: string
          employment_status?: string | null
          first_name: string
          id?: string
          id_document_url: string
          id_full_name: string
          id_number: string
          id_type: string
          joint_applicant_data?: Json | null
          last_name: string
          marketing_consent?: boolean | null
          middle_name?: string | null
          next_of_kin_address?: string | null
          next_of_kin_email: string
          next_of_kin_name: string
          next_of_kin_phone: string
          next_of_kin_relationship: string
          password_hash?: string | null
          phone_number: string
          postal_code: string
          proof_of_address_date?: string | null
          proof_of_address_type: string
          proof_of_address_url: string
          reference_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_code_hash?: string | null
          source_of_funds?: string | null
          state: string
          status?: string
          street_address: string
          tax_country?: string | null
          tax_identification_number?: string | null
          terms_accepted?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_ownership?: string
          account_type?: string
          accuracy_confirmed?: boolean
          admin_notes?: string | null
          apartment?: string | null
          business_registration_number?: string | null
          city?: string
          company_name?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          date_of_birth?: string
          desired_username?: string
          electronic_consent?: boolean
          email?: string
          employment_status?: string | null
          first_name?: string
          id?: string
          id_document_url?: string
          id_full_name?: string
          id_number?: string
          id_type?: string
          joint_applicant_data?: Json | null
          last_name?: string
          marketing_consent?: boolean | null
          middle_name?: string | null
          next_of_kin_address?: string | null
          next_of_kin_email?: string
          next_of_kin_name?: string
          next_of_kin_phone?: string
          next_of_kin_relationship?: string
          password_hash?: string | null
          phone_number?: string
          postal_code?: string
          proof_of_address_date?: string | null
          proof_of_address_type?: string
          proof_of_address_url?: string
          reference_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          security_code_hash?: string | null
          source_of_funds?: string | null
          state?: string
          status?: string
          street_address?: string
          tax_country?: string | null
          tax_identification_number?: string | null
          terms_accepted?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      account_statements: {
        Row: {
          account_id: string
          closing_balance: number
          created_at: string
          id: string
          opening_balance: number
          statement_period_end: string
          statement_period_start: string
          total_credits: number
          total_debits: number
          user_id: string
        }
        Insert: {
          account_id: string
          closing_balance?: number
          created_at?: string
          id?: string
          opening_balance?: number
          statement_period_end: string
          statement_period_start: string
          total_credits?: number
          total_debits?: number
          user_id: string
        }
        Update: {
          account_id?: string
          closing_balance?: number
          created_at?: string
          id?: string
          opening_balance?: number
          statement_period_end?: string
          statement_period_start?: string
          total_credits?: number
          total_debits?: number
          user_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_number: string
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          created_at: string
          currency: string
          hidden: boolean | null
          id: string
          required_initial_deposit: number | null
          status: Database["public"]["Enums"]["account_status"]
          transfers_blocked: boolean | null
          transfers_blocked_at: string | null
          transfers_blocked_by: string | null
          transfers_blocked_message: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          hidden?: boolean | null
          id?: string
          required_initial_deposit?: number | null
          status?: Database["public"]["Enums"]["account_status"]
          transfers_blocked?: boolean | null
          transfers_blocked_at?: string | null
          transfers_blocked_by?: string | null
          transfers_blocked_message?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string
          currency?: string
          hidden?: boolean | null
          id?: string
          required_initial_deposit?: number | null
          status?: Database["public"]["Enums"]["account_status"]
          transfers_blocked?: boolean | null
          transfers_blocked_at?: string | null
          transfers_blocked_by?: string | null
          transfers_blocked_message?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_accounts_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activities: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      bill_payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          payee_id: string
          payment_date: string | null
          reference_number: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          payee_id: string
          payment_date?: string | null
          reference_number?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payee_id?: string
          payment_date?: string | null
          reference_number?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "payees"
            referencedColumns: ["id"]
          },
        ]
      }
      check_deposits: {
        Row: {
          account_id: string
          admin_notes: string | null
          amount: number
          back_image_url: string
          check_number: string
          created_at: string
          front_image_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Insert: {
          account_id: string
          admin_notes?: string | null
          amount: number
          back_image_url: string
          check_number: string
          created_at?: string
          front_image_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id: string
        }
        Update: {
          account_id?: string
          admin_notes?: string | null
          amount?: number
          back_image_url?: string
          check_number?: string
          created_at?: string
          front_image_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_deposits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_deposit_config: {
        Row: {
          created_at: string
          crypto_type: string
          enabled: boolean | null
          id: string
          qr_code_url: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          crypto_type: string
          enabled?: boolean | null
          id?: string
          qr_code_url?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          crypto_type?: string
          enabled?: boolean | null
          id?: string
          qr_code_url?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      crypto_deposits: {
        Row: {
          account_id: string
          admin_notes: string | null
          amount: number
          created_at: string
          crypto_type: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"]
          transaction_hash: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          account_id: string
          admin_notes?: string | null
          amount: number
          created_at?: string
          crypto_type: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          transaction_hash: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          account_id?: string
          admin_notes?: string | null
          amount?: number
          created_at?: string
          crypto_type?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["deposit_status"]
          transaction_hash?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_template: string
          id: string
          is_active: boolean | null
          subject_template: string
          template_name: string
          template_variables: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          html_template: string
          id?: string
          is_active?: boolean | null
          subject_template: string
          template_name: string
          template_variables?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          subject_template?: string
          template_name?: string
          template_variables?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          attempts: number | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          verification_code: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          verification_code: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          verification_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      foreign_remittances: {
        Row: {
          account_id: string
          admin_notes: string | null
          amount: number
          bank_address: string | null
          bank_name: string
          completed_at: string | null
          correspondent_bank: string | null
          created_at: string
          currency: string
          from_account_id: string | null
          iban: string | null
          id: string
          priority: string | null
          purpose_of_transfer: string | null
          recipient_account: string
          recipient_address: string | null
          recipient_country: string
          recipient_name: string
          reference_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["remittance_status"]
          swift_code: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          admin_notes?: string | null
          amount: number
          bank_address?: string | null
          bank_name: string
          completed_at?: string | null
          correspondent_bank?: string | null
          created_at?: string
          currency: string
          from_account_id?: string | null
          iban?: string | null
          id?: string
          priority?: string | null
          purpose_of_transfer?: string | null
          recipient_account: string
          recipient_address?: string | null
          recipient_country: string
          recipient_name: string
          reference_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["remittance_status"]
          swift_code?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          admin_notes?: string | null
          amount?: number
          bank_address?: string | null
          bank_name?: string
          completed_at?: string | null
          correspondent_bank?: string | null
          created_at?: string
          currency?: string
          from_account_id?: string | null
          iban?: string | null
          id?: string
          priority?: string | null
          purpose_of_transfer?: string | null
          recipient_account?: string
          recipient_address?: string | null
          recipient_country?: string
          recipient_name?: string
          reference_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["remittance_status"]
          swift_code?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_foreign_remittances_from_account"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreign_remittances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          admin_notes: string | null
          document_type: string
          document_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          uploaded_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["kyc_status"]
        }
        Insert: {
          admin_notes?: string | null
          document_type: string
          document_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          uploaded_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["kyc_status"]
        }
        Update: {
          admin_notes?: string | null
          document_type?: string
          document_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          uploaded_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["kyc_status"]
        }
        Relationships: []
      }
      loan_applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          disbursement_account_id: string | null
          employment_status: string | null
          id: string
          loan_purpose: string | null
          loan_term_months: number | null
          loan_type: string
          monthly_income: number | null
          requested_amount: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          disbursement_account_id?: string | null
          employment_status?: string | null
          id?: string
          loan_purpose?: string | null
          loan_term_months?: number | null
          loan_type: string
          monthly_income?: number | null
          requested_amount: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          disbursement_account_id?: string | null
          employment_status?: string | null
          id?: string
          loan_purpose?: string | null
          loan_term_months?: number | null
          loan_type?: string
          monthly_income?: number | null
          requested_amount?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_disbursement_account_id_fkey"
            columns: ["disbursement_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_interest_rates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          interest_rate: number
          loan_type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          interest_rate: number
          loan_type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          interest_rate?: number
          loan_type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      loan_payments: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string
          due_date: string
          id: string
          late_fee: number | null
          loan_id: string
          payment_date: string | null
          status: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string
          due_date: string
          id?: string
          late_fee?: number | null
          loan_id: string
          payment_date?: string | null
          status?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string
          due_date?: string
          id?: string
          late_fee?: number | null
          loan_id?: string
          payment_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          application_id: string | null
          created_at: string
          disbursement_date: string | null
          id: string
          interest_rate: number
          loan_amount: number
          loan_term_months: number
          loan_type: string | null
          maturity_date: string | null
          monthly_payment: number
          principal_amount: number | null
          remaining_balance: number
          repayment_account_id: string | null
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          disbursement_date?: string | null
          id?: string
          interest_rate: number
          loan_amount: number
          loan_term_months: number
          loan_type?: string | null
          maturity_date?: string | null
          monthly_payment: number
          principal_amount?: number | null
          remaining_balance: number
          repayment_account_id?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          disbursement_date?: string | null
          id?: string
          interest_rate?: number
          loan_amount?: number
          loan_term_months?: number
          loan_type?: string | null
          maturity_date?: string | null
          monthly_payment?: number
          principal_amount?: number | null
          remaining_balance?: number
          repayment_account_id?: string | null
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_repayment_account_id_fkey"
            columns: ["repayment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      next_of_kin: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone_number: string
          relationship: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone_number: string
          relationship: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone_number?: string
          relationship?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_audit: {
        Row: {
          action: string
          created_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      password_reset_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          first_attempt_at: string | null
          id: string
          identifier: string
          identifier_type: string
          last_attempt_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier: string
          identifier_type: string
          last_attempt_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier?: string
          identifier_type?: string
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          attempts: number | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          reset_code: string
          used: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          reset_code: string
          used?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          reset_code?: string
          used?: boolean | null
        }
        Relationships: []
      }
      payees: {
        Row: {
          account_number: string
          bank_name: string | null
          created_at: string | null
          id: string
          payee_name: string
          payee_type: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          bank_name?: string | null
          created_at?: string | null
          id?: string
          payee_name: string
          payee_type?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          bank_name?: string | null
          created_at?: string | null
          id?: string
          payee_name?: string
          payee_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_locked: boolean | null
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
          loan_applications_allowed: boolean | null
          loan_repayment_account_id: string | null
          phone: string | null
          title: string | null
          transfer_code_1_enabled: boolean | null
          transfer_code_1_name: string | null
          transfer_code_1_value: string | null
          transfer_code_2_enabled: boolean | null
          transfer_code_2_name: string | null
          transfer_code_2_value: string | null
          transfer_code_3_enabled: boolean | null
          transfer_code_3_name: string | null
          transfer_code_3_value: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          account_locked?: boolean | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          id: string
          loan_applications_allowed?: boolean | null
          loan_repayment_account_id?: string | null
          phone?: string | null
          title?: string | null
          transfer_code_1_enabled?: boolean | null
          transfer_code_1_name?: string | null
          transfer_code_1_value?: string | null
          transfer_code_2_enabled?: boolean | null
          transfer_code_2_name?: string | null
          transfer_code_2_value?: string | null
          transfer_code_3_enabled?: boolean | null
          transfer_code_3_name?: string | null
          transfer_code_3_value?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_locked?: boolean | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          loan_applications_allowed?: boolean | null
          loan_repayment_account_id?: string | null
          phone?: string | null
          title?: string | null
          transfer_code_1_enabled?: boolean | null
          transfer_code_1_name?: string | null
          transfer_code_1_value?: string | null
          transfer_code_2_enabled?: boolean | null
          transfer_code_2_name?: string | null
          transfer_code_2_value?: string | null
          transfer_code_3_enabled?: boolean | null
          transfer_code_3_name?: string | null
          transfer_code_3_value?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_loan_repayment_account_id_fkey"
            columns: ["loan_repayment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_code_verification_attempts: {
        Row: {
          attempt_time: string
          created_at: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          balance_after: number | null
          bank_name: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          recipient_account: string | null
          recipient_name: string | null
          reference_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          routing_code: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          account_id: string
          amount: number
          balance_after?: number | null
          bank_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          recipient_account?: string | null
          recipient_name?: string | null
          reference_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routing_code?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number | null
          bank_name?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          recipient_account?: string | null
          recipient_name?: string | null
          reference_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routing_code?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_charges: {
        Row: {
          domestic_charge: number
          id: string
          international_charge: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          domestic_charge?: number
          id?: string
          international_charge?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          domestic_charge?: number
          id?: string
          international_charge?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      transfer_limits: {
        Row: {
          account_id: string
          created_at: string | null
          custom_message: string | null
          daily_limit: number
          id: string
          single_transaction_limit: number
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          custom_message?: string | null
          daily_limit?: number
          id?: string
          single_transaction_limit?: number
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          custom_message?: string | null
          daily_limit?: number
          id?: string
          single_transaction_limit?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      transfers: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          from_account_id: string
          id: string
          reference_number: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          to_account_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          from_account_id: string
          id?: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          to_account_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          from_account_id?: string
          id?: string
          reference_number?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          to_account_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security: {
        Row: {
          account_locked: boolean | null
          account_locked_until: string | null
          backup_codes: Json | null
          backup_codes_generated_at: string | null
          created_at: string | null
          email_2fa_code: string | null
          email_2fa_code_expires_at: string | null
          email_2fa_enabled: boolean | null
          email_2fa_last_sent_at: string | null
          failed_verification_attempts: number | null
          id: string
          last_failed_attempt: string | null
          last_login: string | null
          last_login_ip: string | null
          last_updated: string | null
          login_attempts: number | null
          must_change_password: boolean | null
          previous_login_at: string | null
          previous_login_ip: string | null
          security_code_enabled: boolean | null
          security_code_for_transfers: boolean | null
          security_code_hash: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_locked?: boolean | null
          account_locked_until?: string | null
          backup_codes?: Json | null
          backup_codes_generated_at?: string | null
          created_at?: string | null
          email_2fa_code?: string | null
          email_2fa_code_expires_at?: string | null
          email_2fa_enabled?: boolean | null
          email_2fa_last_sent_at?: string | null
          failed_verification_attempts?: number | null
          id?: string
          last_failed_attempt?: string | null
          last_login?: string | null
          last_login_ip?: string | null
          last_updated?: string | null
          login_attempts?: number | null
          must_change_password?: boolean | null
          previous_login_at?: string | null
          previous_login_ip?: string | null
          security_code_enabled?: boolean | null
          security_code_for_transfers?: boolean | null
          security_code_hash?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_locked?: boolean | null
          account_locked_until?: string | null
          backup_codes?: Json | null
          backup_codes_generated_at?: string | null
          created_at?: string | null
          email_2fa_code?: string | null
          email_2fa_code_expires_at?: string | null
          email_2fa_enabled?: boolean | null
          email_2fa_last_sent_at?: string | null
          failed_verification_attempts?: number | null
          id?: string
          last_failed_attempt?: string | null
          last_login?: string | null
          last_login_ip?: string | null
          last_updated?: string | null
          login_attempts?: number | null
          must_change_password?: boolean | null
          previous_login_at?: string | null
          previous_login_ip?: string | null
          security_code_enabled?: boolean | null
          security_code_for_transfers?: boolean | null
          security_code_hash?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          auth_emails_enabled: boolean | null
          bank_address: string | null
          bank_email: string | null
          bank_name: string | null
          bank_phone: string | null
          console_logo_url: string | null
          created_at: string
          email_alerts_enabled: boolean | null
          favicon_url: string | null
          footer_logo_url: string | null
          id: string
          login_alert_email: string | null
          login_alerts_enabled: boolean | null
          logo_url: string | null
          primary_color: string | null
          receipt_accent_color: string | null
          receipt_custom_message: string | null
          receipt_footer_disclaimer: string | null
          receipt_header_color: string | null
          receipt_reference_prefix: string | null
          receipt_show_logo: boolean | null
          receipt_show_watermark: boolean | null
          receipt_title: string | null
          receipt_watermark_text: string | null
          resend_enabled: boolean | null
          secondary_color: string | null
          show_kyc_page: boolean | null
          show_navigation_menu: boolean | null
          smtp_enabled: boolean | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_use_ssl: boolean | null
          smtp_username: string | null
          super_admin_email: string | null
          support_email: string | null
          updated_at: string
          website_visibility: boolean | null
        }
        Insert: {
          auth_emails_enabled?: boolean | null
          bank_address?: string | null
          bank_email?: string | null
          bank_name?: string | null
          bank_phone?: string | null
          console_logo_url?: string | null
          created_at?: string
          email_alerts_enabled?: boolean | null
          favicon_url?: string | null
          footer_logo_url?: string | null
          id?: string
          login_alert_email?: string | null
          login_alerts_enabled?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          receipt_accent_color?: string | null
          receipt_custom_message?: string | null
          receipt_footer_disclaimer?: string | null
          receipt_header_color?: string | null
          receipt_reference_prefix?: string | null
          receipt_show_logo?: boolean | null
          receipt_show_watermark?: boolean | null
          receipt_title?: string | null
          receipt_watermark_text?: string | null
          resend_enabled?: boolean | null
          secondary_color?: string | null
          show_kyc_page?: boolean | null
          show_navigation_menu?: boolean | null
          smtp_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_use_ssl?: boolean | null
          smtp_username?: string | null
          super_admin_email?: string | null
          support_email?: string | null
          updated_at?: string
          website_visibility?: boolean | null
        }
        Update: {
          auth_emails_enabled?: boolean | null
          bank_address?: string | null
          bank_email?: string | null
          bank_name?: string | null
          bank_phone?: string | null
          console_logo_url?: string | null
          created_at?: string
          email_alerts_enabled?: boolean | null
          favicon_url?: string | null
          footer_logo_url?: string | null
          id?: string
          login_alert_email?: string | null
          login_alerts_enabled?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          receipt_accent_color?: string | null
          receipt_custom_message?: string | null
          receipt_footer_disclaimer?: string | null
          receipt_header_color?: string | null
          receipt_reference_prefix?: string | null
          receipt_show_logo?: boolean | null
          receipt_show_watermark?: boolean | null
          receipt_title?: string | null
          receipt_watermark_text?: string | null
          resend_enabled?: boolean | null
          secondary_color?: string | null
          show_kyc_page?: boolean | null
          show_navigation_menu?: boolean | null
          smtp_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_use_ssl?: boolean | null
          smtp_username?: string | null
          super_admin_email?: string | null
          support_email?: string | null
          updated_at?: string
          website_visibility?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_check_deposits_view: {
        Row: {
          account_id: string | null
          accounts: Json | null
          admin_notes: string | null
          amount: number | null
          back_image_url: string | null
          check_number: string | null
          created_at: string | null
          front_image_url: string | null
          id: string | null
          profiles: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_deposits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_crypto_deposits_view: {
        Row: {
          account_id: string | null
          accounts: Json | null
          admin_notes: string | null
          amount: number | null
          created_at: string | null
          crypto_type: string | null
          id: string | null
          profiles: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["deposit_status"] | null
          transaction_hash: string | null
          user_id: string | null
          wallet_address: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_approve_deposit: {
        Args: {
          approve: boolean
          deposit_id: string
          deposit_type: string
          notes?: string
        }
        Returns: Json
      }
      admin_approve_loan_with_disbursement: {
        Args: {
          p_admin_notes?: string
          p_application_id: string
          p_approve: boolean
          p_interest_rate?: number
        }
        Returns: Json
      }
      admin_assign_role: {
        Args: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: Json
      }
      admin_clear_security_lock: { Args: { p_user_id: string }; Returns: Json }
      admin_create_transaction:
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_description?: string
              p_status?: Database["public"]["Enums"]["transaction_status"]
              p_transaction_type: Database["public"]["Enums"]["transaction_type"]
            }
            Returns: Json
          }
        | {
            Args: {
              p_account_id: string
              p_amount: number
              p_description?: string
              p_status?: Database["public"]["Enums"]["transaction_status"]
              p_transaction_date?: string
              p_transaction_type: Database["public"]["Enums"]["transaction_type"]
            }
            Returns: Json
          }
      admin_delete_account: { Args: { p_account_id: string }; Returns: Json }
      admin_delete_loan: { Args: { p_loan_id: string }; Returns: Json }
      admin_delete_transaction: {
        Args: { transaction_id: string }
        Returns: Json
      }
      admin_disable_security_code: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_toggle_account_transfer_block: {
        Args: { p_account_id: string; p_blocked: boolean; p_message?: string }
        Returns: Json
      }
      admin_update_transaction:
        | {
            Args: {
              new_amount?: number
              new_date?: string
              new_description?: string
              transaction_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              new_amount?: number
              new_description?: string
              new_status?: Database["public"]["Enums"]["transaction_status"]
              transaction_id: string
            }
            Returns: Json
          }
      admin_update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: Json
      }
      apply_domestic_transfer_charge: {
        Args: { p_account_id: string; p_reference_number: string }
        Returns: undefined
      }
      apply_international_transfer_charge: {
        Args: { p_account_id: string; p_reference_number: string }
        Returns: undefined
      }
      approve_account_application: {
        Args: { p_admin_notes?: string; p_application_id: string }
        Returns: Json
      }
      approve_external_transfer: {
        Args: {
          p_admin_notes?: string
          p_approve: boolean
          p_transaction_id: string
        }
        Returns: Json
      }
      approve_foreign_remittance: {
        Args: { approve: boolean; notes?: string; remittance_id: string }
        Returns: Json
      }
      check_transfer_limit: {
        Args: { p_account_id: string; p_amount: number }
        Returns: Json
      }
      cleanup_expired_password_resets: { Args: never; Returns: undefined }
      create_kyc_from_application: {
        Args: { p_application_id: string; p_user_id: string }
        Returns: Json
      }
      delete_user_completely: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      generate_account_number:
        | { Args: never; Returns: string }
        | { Args: { account_type: string }; Returns: string }
      generate_application_reference: { Args: never; Returns: string }
      generate_backup_codes: { Args: { p_user_id: string }; Returns: Json }
      generate_custom_statement: {
        Args: { p_account_id: string; p_end_date: string; p_start_date: string }
        Returns: Json
      }
      generate_monthly_statement: {
        Args: { p_account_id: string }
        Returns: Json
      }
      generate_reference_number: { Args: never; Returns: string }
      get_account_transfer_limit: {
        Args: { p_account_id: string }
        Returns: Json
      }
      get_active_template: {
        Args: { p_template_name: string }
        Returns: {
          html_template: string
          id: string
          is_active: boolean
          subject_template: string
          template_name: string
          template_variables: Json
        }[]
      }
      get_admin_notification_counts: { Args: never; Returns: Json }
      get_admin_users_paginated: {
        Args: { page_number?: number; page_size?: number; search_term?: string }
        Returns: Json
      }
      get_current_user_role: { Args: never; Returns: string }
      get_email_templates: { Args: never; Returns: Json }
      get_public_website_settings: {
        Args: never
        Returns: {
          bank_address: string
          bank_email: string
          bank_name: string
          bank_phone: string
          console_logo_url: string
          favicon_url: string
          footer_logo_url: string
          id: string
          logo_url: string
          primary_color: string
          receipt_accent_color: string
          receipt_custom_message: string
          receipt_footer_disclaimer: string
          receipt_header_color: string
          receipt_reference_prefix: string
          receipt_show_logo: boolean
          receipt_show_watermark: boolean
          receipt_title: string
          receipt_watermark_text: string
          secondary_color: string
          show_kyc_page: boolean
          show_navigation_menu: boolean
          support_email: string
          website_visibility: boolean
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_website_settings: {
        Args: never
        Returns: {
          auth_emails_enabled: boolean
          bank_address: string
          bank_name: string
          bank_phone: string
          email_alerts_enabled: boolean
          favicon_url: string
          footer_logo_url: string
          login_alert_email: string
          login_alerts_enabled: boolean
          logo_url: string
          receipt_accent_color: string
          receipt_custom_message: string
          receipt_footer_disclaimer: string
          receipt_header_color: string
          receipt_reference_prefix: string
          receipt_show_logo: boolean
          receipt_show_watermark: boolean
          receipt_title: string
          receipt_watermark_text: string
          resend_enabled: boolean
          show_kyc_page: boolean
          show_navigation_menu: boolean
          smtp_enabled: boolean
          smtp_from_email: string
          smtp_from_name: string
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_use_ssl: boolean
          smtp_username: string
          support_email: string
          website_visibility: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_security_code: { Args: { p_code: string }; Returns: string }
      is_default_admin: { Args: { _user_id: string }; Returns: boolean }
      lookup_intrabank_recipient: {
        Args: { p_account_number: string }
        Returns: Json
      }
      process_bill_payment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_description?: string
          p_payee_id: string
        }
        Returns: Json
      }
      process_external_transfer:
        | {
            Args: {
              p_amount: number
              p_description?: string
              p_from_account_id: string
              p_recipient_account: string
              p_recipient_bank: string
              p_recipient_name: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_description?: string
              p_from_account_id: string
              p_recipient_account: string
              p_recipient_bank: string
              p_recipient_name: string
              p_routing_code?: string
            }
            Returns: Json
          }
      process_internal_transfer: {
        Args: {
          p_amount: number
          p_description?: string
          p_from_account_id: string
          p_to_account_id: string
        }
        Returns: Json
      }
      process_internal_transfer_with_conversion: {
        Args: {
          p_amount: number
          p_converted_amount: number
          p_description?: string
          p_from_account_id: string
          p_from_currency: string
          p_to_account_id: string
          p_to_currency: string
        }
        Returns: Json
      }
      process_international_transfer: {
        Args: {
          p_account_id: string
          p_amount: number
          p_bank_address?: string
          p_bank_name: string
          p_correspondent_bank?: string
          p_currency: string
          p_iban?: string
          p_priority?: string
          p_purpose?: string
          p_recipient_account: string
          p_recipient_address?: string
          p_recipient_country: string
          p_recipient_name: string
          p_swift_code?: string
          p_user_id: string
        }
        Returns: Json
      }
      process_intrabank_transfer: {
        Args: {
          p_amount: number
          p_converted_amount: number
          p_description?: string
          p_from_account_id: string
          p_to_account_id: string
        }
        Returns: Json
      }
      reject_account_application: {
        Args: {
          p_admin_notes?: string
          p_application_id: string
          p_rejection_reason: string
        }
        Returns: Json
      }
      set_account_transfer_limit: {
        Args: {
          p_account_id: string
          p_custom_message?: string
          p_daily_limit: number
          p_single_transaction_limit: number
        }
        Returns: Json
      }
      toggle_security_code: {
        Args: { p_enabled: boolean; p_user_id: string }
        Returns: Json
      }
      update_email_template: {
        Args: { new_body: string; new_subject: string; template_id: string }
        Returns: Json
      }
      update_security_code: {
        Args: { p_new_code: string; p_old_code: string; p_user_id: string }
        Returns: Json
      }
      update_website_settings:
        | {
            Args: {
              p_auth_emails_enabled?: boolean
              p_bank_address?: string
              p_bank_email?: string
              p_bank_name?: string
              p_bank_phone?: string
              p_email_alerts_enabled?: boolean
              p_favicon_url?: string
              p_footer_logo_url?: string
              p_logo_url?: string
              p_primary_color?: string
              p_receipt_accent_color?: string
              p_receipt_custom_message?: string
              p_receipt_footer_disclaimer?: string
              p_receipt_header_color?: string
              p_receipt_reference_prefix?: string
              p_receipt_show_logo?: boolean
              p_receipt_show_watermark?: boolean
              p_receipt_title?: string
              p_receipt_watermark_text?: string
              p_resend_enabled?: boolean
              p_secondary_color?: string
              p_show_kyc_page?: boolean
              p_show_navigation_menu?: boolean
              p_smtp_enabled?: boolean
              p_smtp_from_email?: string
              p_smtp_from_name?: string
              p_smtp_host?: string
              p_smtp_password?: string
              p_smtp_port?: number
              p_smtp_use_ssl?: boolean
              p_smtp_username?: string
              p_support_email?: string
              p_website_visibility?: boolean
            }
            Returns: Json
          }
        | { Args: { settings: Json }; Returns: Json }
      verify_security_code: {
        Args: {
          p_code: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_status:
        | "active"
        | "frozen"
        | "closed"
        | "inactive"
        | "dormant"
        | "awaiting_deposit"
      account_type:
        | "checking"
        | "savings"
        | "business"
        | "premium_checking"
        | "premium_savings"
        | "high_yield_savings"
        | "trust_account"
        | "escrow_account"
        | "investment_account"
        | "business_account"
        | "call_account"
      app_role: "user" | "admin"
      deposit_status: "pending" | "approved" | "rejected"
      kyc_status: "pending" | "approved" | "rejected"
      loan_status:
        | "pending"
        | "approved"
        | "denied"
        | "active"
        | "completed"
        | "defaulted"
      remittance_status: "pending" | "approved" | "rejected" | "completed"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer"
        | "payment"
        | "fee"
        | "interest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: [
        "active",
        "frozen",
        "closed",
        "inactive",
        "dormant",
        "awaiting_deposit",
      ],
      account_type: [
        "checking",
        "savings",
        "business",
        "premium_checking",
        "premium_savings",
        "high_yield_savings",
        "trust_account",
        "escrow_account",
        "investment_account",
        "business_account",
        "call_account",
      ],
      app_role: ["user", "admin"],
      deposit_status: ["pending", "approved", "rejected"],
      kyc_status: ["pending", "approved", "rejected"],
      loan_status: [
        "pending",
        "approved",
        "denied",
        "active",
        "completed",
        "defaulted",
      ],
      remittance_status: ["pending", "approved", "rejected", "completed"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      transaction_status: ["pending", "completed", "failed", "cancelled"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "transfer",
        "payment",
        "fee",
        "interest",
      ],
    },
  },
} as const
