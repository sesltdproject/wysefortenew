import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalUsers: number;
  userGrowth: string;
  transactionsToday: number;
  totalBalance: number;
  openTickets: number;
  isLoading: boolean;
}

export const useOptimizedAdminStatistics = (): AdminStats => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    userGrowth: "+0%",
    transactionsToday: 0,
    totalBalance: 0,
    openTickets: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Fetch total users
        const { count: totalUsersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch new users today
        const { count: newUsersToday } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        // Fetch transactions today
        const { count: transactionsTodayCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString())
          .eq('status', 'completed');

        // Fetch total balance across all accounts
        const { data: balanceData } = await supabase
          .from('accounts')
          .select('balance')
          .eq('status', 'active');

        const totalBalance = balanceData?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;

        // Fetch open support tickets
        const { count: openTicketsCount } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']);

        // Calculate growth percentage
        const growth = newUsersToday && totalUsersCount ? 
          Math.round((newUsersToday / Math.max(totalUsersCount - newUsersToday, 1)) * 100) : 0;
        const userGrowth = growth > 0 ? `+${growth}%` : `${growth}%`;

        setStats({
          totalUsers: totalUsersCount || 0,
          userGrowth,
          transactionsToday: transactionsTodayCount || 0,
          totalBalance,
          openTickets: openTicketsCount || 0,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error fetching admin statistics:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStatistics();

    // Set up periodic refresh every 5 minutes for real-time updates
    const interval = setInterval(fetchStatistics, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};