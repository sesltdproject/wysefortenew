import { useState, useEffect } from "react";

interface AdminStats {
  totalUsers: number;
  userGrowth: string;
  transactionsToday: number;
  totalBalance: number;
  openTickets: number;
  isLoading: boolean;
}

export const useFallbackAdminStatistics = (): AdminStats => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    userGrowth: "+0%",
    transactionsToday: 0,
    totalBalance: 0,
    openTickets: 0,
    isLoading: true,
  });

  useEffect(() => {
    // Simulate loading and provide fallback data
    const timer = setTimeout(() => {
      setStats({
        totalUsers: 0,
        userGrowth: "+0%",
        transactionsToday: 0,
        totalBalance: 0,
        openTickets: 0,
        isLoading: false,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return stats;
};