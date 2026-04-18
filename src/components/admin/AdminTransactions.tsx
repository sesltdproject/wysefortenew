import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAmount } from "@/lib/utils";
import { AdminCreatedTransactions } from "./AdminCreatedTransactions";

interface Transaction {
  id: string;
  account_id?: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
  type?: string;
  user_name?: string;
  user_email?: string;
  account_number?: string;
  account_type?: string;
}

export const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        
        console.log('Fetching all transactions...');
        
        // Step 1: Fetch all transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('id, account_id, transaction_type, amount, description, created_at, status, reference_number')
          .order('created_at', { ascending: false })
          .limit(50);

        if (transactionsError) {
          console.error('Transaction query error:', transactionsError);
          throw transactionsError;
        }

        console.log('Fetched', transactionsData?.length || 0, 'transactions');

        // Step 2: Get unique account IDs
        const accountIds = [...new Set(transactionsData?.map(t => t.account_id).filter(Boolean) || [])];
        
        // Step 3: Fetch account details separately
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('id, account_number, account_type, user_id')
          .in('id', accountIds);

        if (accountError) {
          console.error('Account fetch error:', accountError);
          throw accountError;
        }

        // Step 4: Get unique user IDs from accounts
        const userIds = [...new Set(accountData?.map(a => a.user_id).filter(Boolean) || [])];
        
        // Step 5: Fetch profile details separately
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          throw profileError;
        }

        // Fetch foreign remittances (only pending ones)
        const { data: remittancesData, error: remittancesError } = await supabase
          .from('foreign_remittances')
          .select('id, user_id, account_id, amount, recipient_name, created_at, status')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(25);

        if (remittancesError) {
          console.error('Remittances fetch error:', remittancesError);
          throw remittancesError;
        }

        // Step 6: Combine the data for regular transactions
        const regularTransactions: Transaction[] = (transactionsData || []).map(t => {
          const account = accountData?.find(a => a.id === t.account_id);
          const userProfile = profileData?.find(p => p.id === account?.user_id);
          
          return {
            id: t.id,
            account_id: t.account_id,
            transaction_type: t.transaction_type || 'transaction',
            amount: t.amount,
            description: t.description,
            created_at: t.created_at,
            status: t.status,
            type: t.transaction_type || 'transaction',
            user_name: userProfile?.full_name || 'Unknown',
            user_email: userProfile?.email || '',
            account_number: account?.account_number,
            account_type: account?.account_type
          };
        });

        // Format remittance transactions
        const remittanceTransactions: Transaction[] = (remittancesData || []).map(r => {
          const account = accountData?.find(a => a.id === r.account_id);
          const userProfile = profileData?.find(p => p.id === r.user_id);
          
          return {
            id: r.id,
            account_id: r.account_id,
            transaction_type: 'international_transfer',
            amount: r.amount,
            description: `International Transfer to ${r.recipient_name}`,
            created_at: r.created_at,
            status: r.status,
            type: 'international_transfer',
            user_name: userProfile?.full_name || 'Unknown',
            user_email: userProfile?.email || '',
            account_number: account?.account_number || 'N/A',
            account_type: account?.account_type || 'International'
          };
        });

        // Combine all transactions
        const allTransactions = [
          ...regularTransactions, 
          ...remittanceTransactions
        ]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 50);

        console.log('Processed', allTransactions.length, 'total transactions');
        setTransactions(allTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();

    // Subscribe to transaction changes for real-time updates
    const channel = supabase
      .channel('admin-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction change detected:', payload);
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit': return 'bg-green-100 text-green-800';
      case 'withdrawal': return 'bg-red-100 text-red-800';
      case 'transfer': return 'bg-blue-100 text-blue-800';
      case 'international_transfer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">All Transactions</span>
            <span className="sm:hidden">All</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Transactions</span>
            <span className="sm:hidden">Admin</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card className="shadow-banking">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>All Transactions</span>
              </CardTitle>
              <CardDescription>
                Complete transaction history across all accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Account</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-center p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-sm">{transaction.user_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{transaction.user_email}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium text-sm capitalize">{transaction.account_type}</p>
                              <p className="text-xs text-muted-foreground">{transaction.account_number}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={getTypeColor(transaction.type || transaction.transaction_type)}>
                              {(transaction.type || transaction.transaction_type)?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm max-w-xs truncate">
                            {transaction.description}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            ${formatAmount(transaction.amount || 0)}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={getStatusColor(transaction.status)}>
                              {transaction.status?.toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="admin" className="space-y-4">
          <AdminCreatedTransactions />
        </TabsContent>
      </Tabs>
    </div>
  );
};