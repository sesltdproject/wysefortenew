import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmount } from "@/lib/utils";
import { Activity, RefreshCw, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { EditTransactionModal } from "@/components/admin/EditTransactionModal";

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  status: string;
  created_at: string;
  user_name: string;
  account_number: string;
  reference_number: string;
  account_id: string;
  user_email: string;
}

export const AdminTransactionsTab = () => {
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    // Check if user is authenticated (admin validated server-side)
    if (!user || !profile) {
      setError('Authentication required');
      toast({
        title: "Access Denied",
        description: "You need to be logged in to view transactions.",
        variant: "destructive",
      });
      return;
    }

    try {
      setTransactionsLoading(true);
      setError(null);
      
      console.log('Fetching transactions for admin:', profile.full_name);
      
      // First, try a simple query to test basic access
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('id, amount, transaction_type, description, status, created_at, reference_number, account_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionError) {
        console.error('Transaction query error:', transactionError);
        throw new Error(`Transaction fetch failed: ${transactionError.message}`);
      }

      console.log('Successfully fetched', transactionData?.length || 0, 'transactions');

      if (!transactionData || transactionData.length === 0) {
        setTransactions([]);
        return;
      }

      // Get unique account IDs
      const accountIds = [...new Set(transactionData.map(t => t.account_id).filter(Boolean))];
      
      // Fetch account details separately
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id, account_number, user_id')
        .in('id', accountIds);

      if (accountError) {
        console.warn('Account fetch error:', accountError);
      }

      // Get unique user IDs from accounts
      const userIds = [...new Set(accountData?.map(a => a.user_id).filter(Boolean) || [])];
      
      // Fetch profile details separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profileError) {
        console.warn('Profile fetch error:', profileError);
      }

      // Combine the data
      const processedTransactions = transactionData.map(t => {
        const account = accountData?.find(a => a.id === t.account_id);
        const userProfile = profileData?.find(p => p.id === account?.user_id);
        
        return {
          ...t,
          user_name: userProfile?.full_name || 'Unknown User',
          user_email: userProfile?.email || '',
          account_number: account?.account_number || 'Unknown Account'
        };
      });
      
      console.log('Processed transactions:', processedTransactions.length);
      setTransactions(processedTransactions);
      
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      const errorMessage = error?.message || 'Failed to load transactions';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleRetry = () => {
    fetchTransactions();
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, profile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'open':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'frozen':
      case 'rejected':
      case 'failed':
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Transaction Management
        </CardTitle>
        <CardDescription>
          Monitor all system transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-md bg-destructive/5">
              <div className="text-sm text-destructive">{error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          )}
          
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 && !error ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.user_name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {transaction.account_number}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${formatAmount(transaction.amount)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.reference_number}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTransaction(transaction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onTransactionUpdated={() => {
            setEditingTransaction(null);
            fetchTransactions();
          }}
        />
      )}
    </Card>
  );
};
