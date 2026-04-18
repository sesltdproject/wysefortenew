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

export const useAdminStatistics = (): AdminStats => {
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
        // Get total users and calculate growth (excluding admin accounts)
        const { data: allUsers } = await (supabase as any)
          .from('profiles')
          .select('created_at');

        const totalUsers = allUsers?.length || 0;
        
        // Calculate users from yesterday for growth percentage
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const usersYesterday = allUsers?.filter((user: any) => 
          new Date(user.created_at) < yesterday
        ).length || 0;
        
        const growth = usersYesterday > 0 ? 
          Math.round(((totalUsers - usersYesterday) / usersYesterday) * 100) : 0;
        const userGrowth = growth > 0 ? `+${growth}%` : `${growth}%`;

        // Get today's transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: todayTransactions } = await supabase
          .from('transactions')
          .select('id')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        const transactionsToday = todayTransactions?.length || 0;

        // Get total bank balance (sum of all account balances)
        const { data: accounts } = await supabase
          .from('accounts')
          .select('balance');

        const totalBalance = accounts?.reduce((sum, account) => 
          sum + (account.balance || 0), 0) || 0;

        // Get open support tickets
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('status', 'open');

        const openTickets = tickets?.length || 0;

        setStats({
          totalUsers,
          userGrowth,
          transactionsToday,
          totalBalance,
          openTickets,
          isLoading: false,
        });

      } catch (error) {
        console.error('Error fetching admin statistics:', error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStatistics();
  }, []);

  return stats;
};