-- Create the admin_stats_view materialized view that the AdminStatistics component needs

CREATE MATERIALIZED VIEW admin_stats_view AS
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE created_at::date = CURRENT_DATE) as new_users_today,
  (SELECT COUNT(*) FROM transactions WHERE created_at::date = CURRENT_DATE) as transactions_today,
  (SELECT COALESCE(SUM(balance), 0) FROM accounts) as total_balance,
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets;

-- Grant access to the view for authenticated users (admins)
GRANT SELECT ON admin_stats_view TO authenticated;

-- Create index for faster refresh
CREATE UNIQUE INDEX idx_admin_stats_view_refresh ON admin_stats_view (total_users);