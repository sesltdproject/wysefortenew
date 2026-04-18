-- Restore access to admin_stats_view for authenticated users (admins)
-- The previous migration removed access to this view, causing the admin statistics cards to not load

GRANT SELECT ON admin_stats_view TO authenticated;