import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminNotificationCount {
  supportTickets: number;
  pendingTransfers: number;
  pendingLoans: number;
  pendingKYC: number;
  total: number;
}

export const useAdminNotifications = () => {
  const { user, profile } = useAuth();
  const [counts, setCounts] = useState<AdminNotificationCount>({
    supportTickets: 0,
    pendingTransfers: 0,
    pendingLoans: 0,
    pendingKYC: 0,
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
      // Get open support tickets count
      const { count: supportCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Get pending foreign remittances count
      const { count: transferCount } = await supabase
        .from('foreign_remittances')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get pending loan applications count
      const { count: loanCount } = await supabase
        .from('loan_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get pending KYC documents count
      const { count: kycCount } = await supabase
        .from('kyc_documents')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      const newCounts = {
        supportTickets: supportCount || 0,
        pendingTransfers: transferCount || 0,
        pendingLoans: loanCount || 0,
        pendingKYC: kycCount || 0,
        total: (supportCount || 0) + (transferCount || 0) + (loanCount || 0) + (kycCount || 0)
      };

      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching admin notification counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Set up real-time subscriptions for all relevant tables
    if (user) {
      // Admin access validated server-side via RLS
      const channels = [
        supabase
          .channel('admin-support-tickets')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'support_tickets'
          }, fetchCounts)
          .subscribe(),

        supabase
          .channel('admin-foreign-remittances')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'foreign_remittances'
          }, fetchCounts)
          .subscribe(),

        supabase
          .channel('admin-loan-applications')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'loan_applications'
          }, fetchCounts)
          .subscribe(),

        supabase
          .channel('admin-kyc-documents')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'kyc_documents'
          }, fetchCounts)
          .subscribe()
      ];

      return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
      };
    }
  }, [user]);

  return {
    counts,
    loading,
    refresh: fetchCounts
  };
};