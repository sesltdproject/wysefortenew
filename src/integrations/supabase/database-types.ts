// Temporary type definitions to match actual database schema
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          created_at: string;
          updated_at: string;
          account_locked: boolean;
          phone?: string;
          address?: string;
          date_of_birth?: string;
          avatar_url?: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: string;
          account_locked?: boolean;
          phone?: string;
          address?: string;
          date_of_birth?: string;
          avatar_url?: string;
        };
        Update: {
          email?: string;
          full_name?: string;
          role?: string;
          account_locked?: boolean;
          phone?: string;
          address?: string;
          date_of_birth?: string;
          avatar_url?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          account_number: string;
          account_type: string;
          balance: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_number: string;
          account_type: string;
          balance?: number;
          status?: string;
        };
        Update: {
          balance?: number;
          status?: string;
          account_type?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          account_id: string;
          transaction_type: string;
          amount: number;
          description?: string;
          status: string;
          created_at: string;
          updated_at: string;
          reference_number?: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          transaction_type: string;
          amount: number;
          description?: string;
          status?: string;
          reference_number?: string;
        };
        Update: {
          status?: string;
          description?: string;
        };
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          message: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          message: string;
          status?: string;
        };
        Update: {
          status?: string;
          admin_response?: string;
        };
      };
      kyc_documents: {
        Row: {
          id: string;
          user_id: string;
          document_type: string;
          document_url: string;
          verification_status: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_type: string;
          document_url: string;
          verification_status?: string;
        };
        Update: {
          verification_status?: string;
        };
      };
      loan_applications: {
        Row: {
          id: string;
          user_id: string;
          loan_type: string;
          requested_amount: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          loan_type: string;
          requested_amount: number;
          status?: string;
        };
        Update: {
          status?: string;
        };
      };
      website_settings: {
        Row: {
          id: string;
          bank_name: string;
          bank_address: string;
          bank_phone: string;
          contact_email: string;
          logo_url?: string;
          favicon_url?: string;
          email_alerts_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bank_name: string;
          bank_address: string;
          bank_phone: string;
          contact_email: string;
          logo_url?: string;
          favicon_url?: string;
          email_alerts_enabled?: boolean;
        };
        Update: {
          bank_name?: string;
          bank_address?: string;
          bank_phone?: string;
          contact_email?: string;
          logo_url?: string;
          favicon_url?: string;
          email_alerts_enabled?: boolean;
        };
      };
      check_deposits: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          amount: number;
          status: string;
          created_at: string;
          updated_at: string;
          front_image_url?: string;
          back_image_url?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          amount: number;
          status?: string;
          front_image_url?: string;
          back_image_url?: string;
        };
        Update: {
          status?: string;
        };
      };
      crypto_deposits: {
        Row: {
          id: string;
          user_id: string;
          account_id: string;
          amount: number;
          crypto_type: string;
          status: string;
          created_at: string;
          updated_at: string;
          wallet_address_used: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id: string;
          amount: number;
          crypto_type: string;
          status?: string;
          wallet_address_used: string;
        };
        Update: {
          status?: string;
        };
      };
      crypto_deposit_config: {
        Row: {
          id: string;
          crypto_type: string;
          wallet_address: string;
          qr_code_url?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          crypto_type: string;
          wallet_address: string;
          qr_code_url?: string;
          is_active?: boolean;
        };
        Update: {
          wallet_address?: string;
          qr_code_url?: string;
          is_active?: boolean;
        };
      };
      foreign_remittances: {
        Row: {
          id: string;
          user_id: string;
          from_account_id: string;
          amount: number;
          recipient_name: string;
          status: string;
          created_at: string;
          updated_at: string;
          reference_number?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_account_id: string;
          amount: number;
          recipient_name: string;
          status?: string;
          reference_number?: string;
        };
        Update: {
          status?: string;
        };
      };
    };
    Views: {
      admin_stats_view?: {
        Row: {
          total_users: number;
          new_users_today: number;
          transactions_today: number;
          total_balance: number;
          open_tickets: number;
        };
      };
    };
    Functions: {
      get_website_settings: {
        Args: {};
        Returns: {
          bank_name: string;
          bank_address: string;
          bank_phone: string;
          contact_email: string;
          logo_url: string | null;
          favicon_url: string | null;
          email_alerts_enabled: boolean;
        }[];
      };
      update_website_settings: {
        Args: {
          p_bank_name?: string;
          p_bank_address?: string;
          p_bank_phone?: string;
          p_contact_email?: string;
          p_logo_url?: string;
          p_favicon_url?: string;
          p_email_alerts_enabled?: boolean;
        };
        Returns: {
          success: boolean;
          error?: string;
          message?: string;
        };
      };
      get_admin_notification_counts: {
        Args: {};
        Returns: any;
      };
      admin_approve_deposit: {
        Args: {
          p_deposit_type: string;
          p_deposit_id: string;
          p_status: string;
          p_notes?: string;
        };
        Returns: {
          success: boolean;
          error?: string;
          message?: string;
        };
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};