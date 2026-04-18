import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminNotificationCount {
  supportTickets: number;
  pendingTransfers: number;
  pendingExternalTransfers: number;
  pendingLoans: number;
  pendingKYC: number;
  pendingCheckDeposits: number;
  pendingCryptoDeposits: number;
  pendingApplications: number;
  unreadSupportMessages: number;
  sampleCheckDeposit?: {
    amount: number;
    user_name: string;
    user_email: string;
  };
  sampleCryptoDeposit?: {
    amount: number;
    crypto_type: string;
    user_name: string;
    user_email: string;
  };
  total: number;
}

export const useOptimizedAdminNotifications = () => {
  const { user, profile } = useAuth();
  const [counts, setCounts] = useState<AdminNotificationCount>({
    supportTickets: 0,
    pendingTransfers: 0,
    pendingExternalTransfers: 0,
    pendingLoans: 0,
    pendingKYC: 0,
    pendingCheckDeposits: 0,
    pendingCryptoDeposits: 0,
    pendingApplications: 0,
    unreadSupportMessages: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    // Admin status verified server-side via RLS

    try {
      // Use optimized database function for single query
      const { data: countsData } = await supabase.rpc('get_admin_notification_counts');

      if (countsData && typeof countsData === 'object') {
        const counts = countsData as any;
        const newCounts = {
          supportTickets: counts.supportTickets || 0,
          pendingTransfers: counts.pendingTransfers || 0,
          pendingExternalTransfers: counts.pendingExternalTransfers || 0,
          pendingLoans: counts.pendingLoans || 0,
          pendingKYC: counts.pendingKYC || 0,
          pendingCheckDeposits: counts.pendingCheckDeposits || 0,
          pendingCryptoDeposits: counts.pendingCryptoDeposits || 0,
          pendingApplications: counts.pendingApplications || 0,
          unreadSupportMessages: counts.unreadSupportMessages || 0,
          sampleCheckDeposit: counts.sampleCheckDeposit,
          sampleCryptoDeposit: counts.sampleCryptoDeposit,
          total: (counts.supportTickets || 0) + (counts.pendingTransfers || 0) + 
                 (counts.pendingExternalTransfers || 0) + (counts.pendingLoans || 0) + 
                 (counts.pendingKYC || 0) + (counts.pendingCheckDeposits || 0) + 
                 (counts.pendingCryptoDeposits || 0) + (counts.pendingApplications || 0) +
                 (counts.unreadSupportMessages || 0)
        };

        setCounts(newCounts);
      }
    } catch (error) {
      console.error('Error fetching admin notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Single consolidated real-time subscription for better performance
    if (user) {
      // Admin access validated server-side via RLS
      const channel = supabase
        .channel('admin-notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        }, fetchCounts)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'foreign_remittances',
          filter: 'status=eq.pending'
        }, fetchCounts)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'loan_applications',
          filter: 'status=eq.pending'
        }, fetchCounts)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'kyc_documents',
          filter: 'verification_status=eq.pending'
        }, fetchCounts)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'check_deposits',
          filter: 'status=eq.pending'
        }, fetchCounts)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'crypto_deposits',
          filter: 'status=eq.pending'
        }, fetchCounts)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'account_applications',
          filter: 'status=eq.pending'
        }, fetchCounts)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: 'status=eq.pending'
        }, fetchCounts)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages'
        }, fetchCounts)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, fetchCounts)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    counts,
    loading,
    refresh: fetchCounts
  };
};