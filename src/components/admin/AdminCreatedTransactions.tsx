import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings, Edit, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/utils";
import { EditTransactionModal } from "./EditTransactionModal";

interface AdminTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  status: string;
  created_at: string;
  reference_number: string;
  account_id: string;
  user_name: string;
  account_number: string;
  user_email: string;
}

export const AdminCreatedTransactions = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<AdminTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<AdminTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAdminTransactions = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching admin-created transactions...');
      
      // Step 1: Fetch transactions created by admin
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('id, amount, transaction_type, description, status, created_at, reference_number, account_id')
        .not('created_by', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionError) {
        console.error('Transaction query error:', transactionError);
        throw transactionError;
      }

      console.log('Fetched', transactionData?.length || 0, 'admin transactions');

      if (!transactionData || transactionData.length === 0) {
        setTransactions([]);
        return;
      }

      // Step 2: Get unique account IDs
      const accountIds = [...new Set(transactionData.map(t => t.account_id).filter(Boolean))];
      
      // Step 3: Fetch account details separately
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id, account_number, user_id')
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

      // Step 6: Combine the data
      const processedTransactions: AdminTransaction[] = transactionData.map(t => {
        const account = accountData?.find(a => a.id === t.account_id);
        const userProfile = profileData?.find(p => p.id === account?.user_id);
        
        return {
          id: t.id,
          amount: t.amount,
          transaction_type: t.transaction_type,
          description: t.description,
          status: t.status,
          created_at: t.created_at,
          reference_number: t.reference_number,
          account_id: t.account_id,
          user_name: userProfile?.full_name || 'Unknown User',
          account_number: account?.account_number || 'Unknown Account',
          user_email: userProfile?.email || ''
        };
      });

      console.log('Processed', processedTransactions.length, 'admin transactions');
      setTransactions(processedTransactions);
    } catch (error) {
      console.error('Error fetching admin transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load admin transactions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminTransactions();

    // Subscribe to transaction changes for real-time updates
    const channel = supabase
      .channel('admin-created-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Admin transaction change detected:', payload);
          fetchAdminTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEditTransaction = (transaction: AdminTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;

    try {
      setIsDeleting(true);
      
      const { data, error } = await supabase.rpc('admin_delete_transaction', {
        transaction_id: deletingTransaction.id
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Success",
          description: "Transaction deleted successfully",
        });
        fetchAdminTransactions(); // Refresh the list
      } else {
        throw new Error(result?.error || 'Failed to delete transaction');
      }
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingTransaction(null);
    }
  };

  const handleTransactionUpdated = () => {
    fetchAdminTransactions(); // Refresh the list after update
    setEditingTransaction(null);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit': return 'bg-green-100 text-green-800';
      case 'withdrawal': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Card className="shadow-banking">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Admin Transactions</span>
          </CardTitle>
          <CardDescription>
            Transactions created by administrators with edit and delete capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAdminTransactions}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
              
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{transaction.user_name}</p>
                            <p className="text-xs text-muted-foreground">{transaction.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {transaction.account_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(transaction.transaction_type)}>
                            {transaction.transaction_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${formatAmount(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.reference_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingTransaction(transaction)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No admin transactions found
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onTransactionUpdated={handleTransactionUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action will:
              <br />• Remove the transaction from the system
              <br />• Update the account balance accordingly
              <br />• Cannot be undone
              <br /><br />
              <strong>Amount:</strong> ${formatAmount(deletingTransaction?.amount || 0)}
              <br />
              <strong>Type:</strong> {deletingTransaction?.transaction_type}
              <br />
              <strong>Description:</strong> {deletingTransaction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Transaction"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};