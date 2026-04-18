-- Create materialized view for admin statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_stats_view AS
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role = 'user') as total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'user' AND created_at >= CURRENT_DATE - INTERVAL '1 day') as new_users_today,
  (SELECT COUNT(*) FROM transactions WHERE created_at::date = CURRENT_DATE) as transactions_today,
  (SELECT COALESCE(SUM(balance), 0) FROM accounts) as total_balance,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets,
  (SELECT COUNT(*) FROM foreign_remittances WHERE status = 'pending') as pending_transfers,
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending') as pending_loans,
  (SELECT COUNT(*) FROM kyc_documents WHERE verification_status = 'pending') as pending_kyc;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS admin_stats_view_idx ON admin_stats_view ((1));

-- Function to refresh admin stats
CREATE OR REPLACE FUNCTION refresh_admin_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_stats_view;
END;
$$;

-- Create optimized function for admin notification counts
CREATE OR REPLACE FUNCTION get_admin_notification_counts()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'supportTickets', (SELECT COUNT(*) FROM support_tickets WHERE status = 'open'),
    'pendingTransfers', (SELECT COUNT(*) FROM foreign_remittances WHERE status = 'pending'),
    'pendingLoans', (SELECT COUNT(*) FROM loan_applications WHERE status = 'pending'),
    'pendingKYC', (SELECT COUNT(*) FROM kyc_documents WHERE verification_status = 'pending')
  );
$$;

-- Create function for user management with pagination
CREATE OR REPLACE FUNCTION get_admin_users_paginated(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50,
  p_search text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  WITH user_accounts AS (
    SELECT 
      p.id,
      p.email,
      p.full_name,
      p.role,
      p.created_at,
      p.account_locked,
      p.phone,
      p.address,
      p.date_of_birth,
      COUNT(a.id) as account_count,
      COALESCE(SUM(a.balance), 0) as total_balance,
      CASE WHEN p.account_locked THEN 'frozen' ELSE 'active' END as status
    FROM profiles p
    LEFT JOIN accounts a ON p.id = a.user_id
    WHERE (p_search IS NULL OR 
           p.full_name ILIKE '%' || p_search || '%' OR 
           p.email ILIKE '%' || p_search || '%')
    GROUP BY p.id, p.email, p.full_name, p.role, p.created_at, p.account_locked, p.phone, p.address, p.date_of_birth
    ORDER BY p.created_at DESC
    OFFSET p_offset
    LIMIT p_limit
  )
  SELECT json_build_object(
    'users', json_agg(user_accounts),
    'total_count', (
      SELECT COUNT(*) 
      FROM profiles p 
      WHERE (p_search IS NULL OR 
             p.full_name ILIKE '%' || p_search || '%' OR 
             p.email ILIKE '%' || p_search || '%')
    )
  ) INTO v_result
  FROM user_accounts;
  
  RETURN v_result;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_account_locked ON profiles(account_locked);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id_balance ON accounts(user_id, balance);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_foreign_remittances_status ON foreign_remittances(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(verification_status);