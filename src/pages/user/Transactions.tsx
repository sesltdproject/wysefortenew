import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Download, ArrowUpDown, DollarSign, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyAmount, formatAccountType } from "@/lib/utils";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { generateTransferReceipt } from "@/lib/transferReceiptGenerator";
import { useTranslation } from "@/i18n";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  reference_number: string;
  status: string;
  recipient_account?: string;
  recipient_name?: string;
  created_at: string;
  account: {
    account_number: string;
    account_type: string;
    currency: string;
  };
}

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  currency: string;
}

export const Transactions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useWebsiteSettings();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Verify user authentication
      if (!user?.id) {
        console.error('No authenticated user found');
        toast({
          title: "Authentication Error",
          description: "Please log in to view transactions.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Fetching transactions for user:', user.id);
      
      // Step 1: Get user's accounts with proper error handling - filter out hidden accounts
      const { data: fetchedAccounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, account_number, account_type, currency')
        .eq('user_id', user.id)
        .eq('hidden', false);

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
        throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
      }

      if (!fetchedAccounts || fetchedAccounts.length === 0) {
        console.log('No accounts found for user');
        setTransactions([]);
        setAccounts([]);
        return;
      }

      setAccounts(fetchedAccounts);
      console.log('Found accounts:', fetchedAccounts.length);
      const accountIds = fetchedAccounts.map(acc => acc.id);
      const accountMap = new Map(fetchedAccounts.map(acc => [acc.id, acc]));
        
      // Step 2: Fetch regular transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .in('account_id', accountIds)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
      }

      console.log('Found regular transactions:', transactionsData?.length || 0);

      // Note: International transfers already appear in transactions table
      // (created by process_international_transfer function), so no need to fetch foreign_remittances separately

      // Step 3: Format transactions with account info
      const allTransactions = (transactionsData || []).map(transaction => ({
        ...transaction,
        account: accountMap.get(transaction.account_id) || { 
          account_number: 'Unknown', 
          account_type: 'Unknown',
          currency: 'USD'
        }
      }));

      console.log('Total transactions loaded:', allTransactions.length);
      setTransactions(allTransactions);
      
      // Set default account to the one with most recent transaction
      if (allTransactions.length > 0 && filterAccount === "all") {
        const mostRecentAccountId = (allTransactions[0] as any).account_id;
        if (mostRecentAccountId) {
          setFilterAccount(mostRecentAccountId);
        }
      }

      // Subscribe to transaction changes for real-time updates
      const channel = supabase
        .channel('user-transactions-page-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `account_id=in.(${accountIds.join(',')})`
          },
          (payload) => {
            console.log('Transaction change detected on Transactions page:', payload);
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };

    } catch (error) {
      console.error('Error in fetchTransactions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to load transactions: ${errorMessage}`,
        variant: "destructive",
      });
      setTransactions([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || transaction.transaction_type === filterType;
    const matchesStatus = filterStatus === "all" || transaction.status === filterStatus;
    
    // Get account_id from the transaction (it's nested in account object or directly on transaction)
    const transactionAccountId = (transaction as any).account_id || accounts.find(acc => acc.account_number === transaction.account.account_number)?.id;
    const matchesAccount = filterAccount === "all" || transactionAccountId === filterAccount;
    
    return matchesSearch && matchesType && matchesStatus && matchesAccount;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved': 
        return 'bg-green-100 text-green-800';
      case 'pending': 
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'cancelled':
      case 'failed': 
        return 'bg-red-100 text-red-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Completed';
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '↓';
      case 'withdrawal': return '↑';
      case 'transfer': return '↔';
      case 'payment': return '💳';
      default: return '•';
    }
  };

  const formatTransactionAmount = (amount: number, type: string, currency: string = 'USD') => {
    const isCredit = amount > 0;
    const prefix = isCredit ? '+' : '-';
    const color = isCredit ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{prefix}{formatCurrencyAmount(Math.abs(amount), currency)}</span>;
  };

  const isDownloadableTransaction = (transaction: Transaction) => {
    // External transfers and international transfers (shown as withdrawals with recipient info)
    const hasRecipient = transaction.recipient_name && transaction.recipient_account;
    const isExternalOrInternational = (transaction.transaction_type === 'withdrawal' || transaction.transaction_type === 'transfer') && hasRecipient;
    return isExternalOrInternational;
  };

  const handleDownloadReceipt = async (transaction: Transaction) => {
    if (!settings) {
      toast({
        title: "Error",
        description: "Unable to load bank settings",
        variant: "destructive",
      });
      return;
    }

    setDownloadingId(transaction.id);
    try {
      const isInternational = transaction.description?.includes('International Transfer');
      await generateTransferReceipt(
        {
          referenceNumber: transaction.reference_number,
          amount: Math.abs(transaction.amount),
          fromAccount: `${formatAccountType(transaction.account.account_type)} - ****${transaction.account.account_number.slice(-4)}`,
          recipientName: transaction.recipient_name,
          recipientAccount: transaction.recipient_account,
          bankName: isInternational ? 'International Bank' : 'External Bank',
          timestamp: new Date(transaction.created_at).toLocaleString(),
          status: transaction.status,
          description: transaction.description || undefined,
          transactionType: isInternational ? 'international' : 'external',
        },
        {
          bankName: settings.bankName,
          bankAddress: settings.bankAddress,
          bankPhone: settings.bankPhone,
          contactEmail: settings.contactEmail,
          logoUrl: settings.consoleLogoUrl || settings.logoUrl,
          receiptHeaderColor: settings.receiptHeaderColor,
          receiptAccentColor: settings.receiptAccentColor,
          receiptTitle: settings.receiptTitle,
          receiptShowLogo: settings.receiptShowLogo,
          receiptShowWatermark: settings.receiptShowWatermark,
          receiptWatermarkText: settings.receiptWatermarkText,
          receiptFooterDisclaimer: settings.receiptFooterDisclaimer,
          receiptCustomMessage: settings.receiptCustomMessage,
          receiptReferencePrefix: settings.receiptReferencePrefix,
        }
      );
      toast({
        title: "Receipt Downloaded",
        description: "Transfer receipt has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate the transfer receipt",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Type', 'Amount', 'Description', 'Reference', 'Status', 'Recipient'],
      ...filteredTransactions.map(t => [
        new Date(t.created_at).toLocaleDateString(),
        t.transaction_type,
        t.amount,
        t.description || '',
        t.reference_number,
        t.status,
        t.recipient_name || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Your transaction history has been downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t('dashboard.transactionHistory')}</h1>
          <p className="text-muted-foreground">{t('dashboard.transactionHistoryDesc')}</p>
        </div>
        <Button onClick={exportTransactions} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          {t('dashboard.exportCsv')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.filterTransactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('dashboard.searchTransactions')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.selectAccount')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allAccounts')}</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {formatAccountType(account.account_type)} - ****{account.account_number.slice(-4)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.transactionType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allTypes')}</SelectItem>
                <SelectItem value="deposit">{t('dashboard.deposits')}</SelectItem>
                <SelectItem value="withdrawal">{t('dashboard.withdrawals')}</SelectItem>
                <SelectItem value="transfer">{t('dashboard.transfers')}</SelectItem>
                <SelectItem value="payment">{t('dashboard.payments')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('dashboard.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.allStatus')}</SelectItem>
                <SelectItem value="completed">{t('dashboard.completed')}</SelectItem>
                <SelectItem value="pending">{t('dashboard.pending')}</SelectItem>
                <SelectItem value="failed">{t('dashboard.failed')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setFilterType("all");
              setFilterStatus("all");
              setFilterAccount("all");
            }}>
              {t('dashboard.clearFilters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Transactions ({filteredTransactions.length})
          </CardTitle>
          <CardDescription>
            {filteredTransactions.length} of {transactions.length} transactions shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterType !== "all" || filterStatus !== "all" 
                ? "No transactions match your filters"
                : "No transactions found"
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0">
                      {getTypeIcon(transaction.transaction_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {transaction.transaction_type === 'transfer' && 
                         transaction.recipient_name && 
                         !transaction.description?.startsWith('International Transfer')
                          ? `External Transfer - ${transaction.description || 'Transaction'}`
                          : transaction.description || 'Transaction'
                        }
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
                        <span>{transaction.reference_number}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">Account: {transaction.account.account_number}</span>
                        {transaction.recipient_name && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span>To: {transaction.recipient_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-between sm:justify-end pl-11 sm:pl-0 flex-shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="font-semibold">
                        {formatTransactionAmount(transaction.amount, transaction.transaction_type, transaction.account.currency)}
                      </div>
                      <Badge className={getStatusColor(transaction.status)}>
                        {getStatusLabel(transaction.status)}
                      </Badge>
                    </div>
                    {isDownloadableTransaction(transaction) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadReceipt(transaction)}
                        disabled={downloadingId === transaction.id}
                        title="Download Receipt"
                        className="h-8 w-8"
                      >
                        {downloadingId === transaction.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};