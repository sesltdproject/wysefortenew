import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { InternationalTransfer } from "@/components/transfers/InternationalTransfer";
import { InternalTransferForm } from "@/components/transfers/InternalTransferForm";
import { ExternalTransferForm } from "@/components/transfers/ExternalTransferForm";
import { IntraBankTransferForm } from "@/components/transfers/IntraBankTransferForm";
import { TransferHistory } from "@/components/transfers/TransferHistory";
import type { Account, Transfer } from "@/components/transfers/types";
import { useTranslation } from "@/i18n";

export const Transfers = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchTransfers();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .eq('hidden', false);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchTransfers = async () => {
    try {
      const { data: userAccounts } = await (supabase as any)
        .from('accounts')
        .select('id')
        .eq('user_id', user?.id)
        .eq('hidden', false);

      if (userAccounts && userAccounts.length > 0) {
        const accountIds = userAccounts.map((acc: any) => acc.id);
        
        // Fetch internal transfers
        const { data: transfersData, error: transfersError } = await (supabase as any)
          .from('transfers')
          .select('*')
          .or(`from_account_id.in.(${accountIds.join(',')}),to_account_id.in.(${accountIds.join(',')})`)
          .order('created_at', { ascending: false });

        if (transfersError) throw transfersError;

        // Fetch international transfers (foreign remittances)
        const { data: remittancesData, error: remittancesError } = await (supabase as any)
          .from('foreign_remittances')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (remittancesError) throw remittancesError;

        // Combine and format transfers
        const allTransfers = [
          ...(transfersData || []),
          ...(remittancesData || []).map((remittance: any) => ({
            id: remittance.id,
            from_account_id: remittance.from_account_id,
            to_account_id: null,
            amount: remittance.amount,
            description: `International Transfer to ${remittance.recipient_name}`,
            status: remittance.status,
            reference_number: remittance.reference_number,
            created_at: remittance.created_at
          }))
        ].sort((a, b) => {
          // Sort pending transfers first, then by creation date (newest first)
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (b.status === 'pending' && a.status !== 'pending') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setTransfers(allTransfers);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const handleTransferComplete = () => {
    fetchAccounts();
    fetchTransfers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{t('dashboard.moneyTransfers')}</h1>
        <p className="text-muted-foreground">{t('dashboard.moneyTransfersDesc')}</p>
      </div>

      <Tabs defaultValue="transfer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transfer">{t('dashboard.domesticTransfer')}</TabsTrigger>
          <TabsTrigger value="foreign">{t('dashboard.internationalTransfer')}</TabsTrigger>
          <TabsTrigger value="history">{t('dashboard.transferHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer" className="space-y-6">
          <Tabs defaultValue="internal" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="internal">{t('dashboard.betweenMyAccounts')}</TabsTrigger>
              <TabsTrigger value="intrabank">{t('dashboard.sameBankTransfer')}</TabsTrigger>
              <TabsTrigger value="external">{t('dashboard.otherBanks')}</TabsTrigger>
            </TabsList>

            <TabsContent value="internal">
              <InternalTransferForm 
                accounts={accounts} 
                onTransferComplete={handleTransferComplete} 
              />
            </TabsContent>

            <TabsContent value="intrabank">
              <IntraBankTransferForm 
                accounts={accounts} 
                onTransferComplete={handleTransferComplete} 
              />
            </TabsContent>

            <TabsContent value="external">
              <ExternalTransferForm 
                accounts={accounts} 
                onTransferComplete={handleTransferComplete} 
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="foreign">
          <InternationalTransfer />
        </TabsContent>

        <TabsContent value="history">
          <TransferHistory transfers={transfers} />
        </TabsContent>
      </Tabs>
    </div>
  );
};