-- Update the admin_stats_view to exclude admin accounts from user count
DROP MATERIALIZED VIEW IF EXISTS admin_stats_view;

CREATE MATERIALIZED VIEW admin_stats_view AS
SELECT 
  -- Count total users excluding admin accounts
  (SELECT COUNT(*) FROM profiles WHERE role != 'admin') as total_users,
  
  -- Count new users today excluding admin accounts
  (SELECT COUNT(*) FROM profiles 
   WHERE role != 'admin' 
   AND created_at >= CURRENT_DATE) as new_users_today,
   
  -- Count transactions today
  (SELECT COUNT(*) FROM transactions 
   WHERE created_at >= CURRENT_DATE) as transactions_today,
   
  -- Sum of all account balances
  (SELECT COALESCE(SUM(balance), 0) FROM accounts) as total_balance,
  
  -- Count open support tickets
  (SELECT COUNT(*) FROM support_tickets WHERE status = 'open') as open_tickets;