
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAmount, cn, formatCurrencyAmount } from "@/lib/utils";
import { CreditCard, EyeOff, Search, Users, ChevronDown, ChevronUp, Plus, CalendarIcon, DollarSign, Trash2, Ban, Upload, FileText, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TransferLimitDialog } from "../TransferLimitDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
  status: string;
  created_at: string;
  user_id: string;
  hidden: boolean;
  currency: string;
  transfers_blocked?: boolean;
  transfers_blocked_message?: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface GroupedAccount {
  user_id: string;
  user_name: string;
  user_email: string;
  accounts: Account[];
  expanded: boolean;
}

export const AdminAccountsTab = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groupedAccounts, setGroupedAccounts] = useState<GroupedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [accountToHide, setAccountToHide] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Add Transaction state
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionAccount, setTransactionAccount] = useState<Account | null>(null);
  const [transactionType, setTransactionType] = useState<string>("");
  const [transactionAmount, setTransactionAmount] = useState<string>("");
  const [transactionDescription, setTransactionDescription] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [transactionLoading, setTransactionLoading] = useState(false);

  // Transfer Limit state
  const [transferLimitDialogOpen, setTransferLimitDialogOpen] = useState(false);
  const [transferLimitAccount, setTransferLimitAccount] = useState<Account | null>(null);

  // Delete Account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Block Transfers state
  const [blockTransfersDialogOpen, setBlockTransfersDialogOpen] = useState(false);
  const [accountToBlock, setAccountToBlock] = useState<Account | null>(null);
  const [blockTransfersMessage, setBlockTransfersMessage] = useState("");
  const [blockTransfersLoading, setBlockTransfersLoading] = useState(false);
  const BLOCK_MESSAGE_MAX_LENGTH = 500;

  // Bulk Import state
  const [bulkImportMode, setBulkImportMode] = useState<"single" | "bulk">("single");
  const [bulkImportData, setBulkImportData] = useState("");
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<Array<{
    type: string;
    amount: number;
    description: string;
    date: string;
    valid: boolean;
    error?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transfer Charges state
  const [transferChargesDialogOpen, setTransferChargesDialogOpen] = useState(false);
  const [domesticCharge, setDomesticCharge] = useState("25");
  const [internationalCharge, setInternationalCharge] = useState("50");
  const [transferChargesLoading, setTransferChargesLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      setAccountsLoading(true);
      
      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (accountsData) {
        // Fetch profiles separately
        const userIds = [...new Set(accountsData.map(a => a.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const accountsWithProfiles = accountsData.map(account => ({
          ...account,
          profiles: profilesData?.find(p => p.id === account.user_id) || { full_name: 'Unknown', email: 'Unknown' }
        }));

        setAccounts(accountsWithProfiles as any);
        const grouped = groupAccountsByUser(accountsWithProfiles as any);
        setGroupedAccounts(grouped);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts.",
        variant: "destructive",
      });
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransferCharges();
  }, []);

  const fetchTransferCharges = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('transfer_charges')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transfer charges:', error);
        return;
      }

      if (data) {
        setDomesticCharge(data.domestic_charge?.toString() || "25");
        setInternationalCharge(data.international_charge?.toString() || "50");
      }
    } catch (error) {
      console.error('Error fetching transfer charges:', error);
    }
  };

  const saveTransferCharges = async () => {
    setTransferChargesLoading(true);
    try {
      const domesticValue = parseFloat(domesticCharge);
      const internationalValue = parseFloat(internationalCharge);

      if (isNaN(domesticValue) || domesticValue < 0) {
        toast({
          title: "Error",
          description: "Domestic charge must be a valid positive number",
          variant: "destructive",
        });
        return;
      }

      if (isNaN(internationalValue) || internationalValue < 0) {
        toast({
          title: "Error",
          description: "International charge must be a valid positive number",
          variant: "destructive",
        });
        return;
      }

      // Upsert the transfer charges
      const { error } = await (supabase as any)
        .from('transfer_charges')
        .upsert({
          domestic_charge: domesticValue,
          international_charge: internationalValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transfer charges updated successfully",
      });
      setTransferChargesDialogOpen(false);
    } catch (error) {
      console.error('Error saving transfer charges:', error);
      toast({
        title: "Error",
        description: "Failed to save transfer charges",
        variant: "destructive",
      });
    } finally {
      setTransferChargesLoading(false);
    }
  };

  const groupAccountsByUser = (accounts: Account[]): GroupedAccount[] => {
    const groups = accounts.reduce((acc, account) => {
      if (!acc[account.user_id]) {
        acc[account.user_id] = {
          user_id: account.user_id,
          user_name: account.profiles.full_name,
          user_email: account.profiles.email,
          accounts: [],
          expanded: false,
        };
      }
      acc[account.user_id].accounts.push(account);
      return acc;
    }, {} as Record<string, GroupedAccount>);
    
    return Object.values(groups).sort((a, b) => a.user_name.localeCompare(b.user_name));
  };

  const toggleUserExpansion = (userId: string) => {
    setGroupedAccounts(prev => prev.map(group => 
      group.user_id === userId 
        ? { ...group, expanded: !group.expanded }
        : group
    ));
  };

  const filteredGroups = groupedAccounts.filter(group => {
    const searchLower = searchTerm.toLowerCase();
    return (
      group.user_name.toLowerCase().includes(searchLower) ||
      group.user_email.toLowerCase().includes(searchLower) ||
      group.accounts.some(account => 
        account.account_number.toLowerCase().includes(searchLower) ||
        account.account_type.toLowerCase().includes(searchLower)
      )
    );
  });

  const handleAccountStatusUpdate = async (accountId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ status: newStatus as 'active' | 'frozen' | 'closed' })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account status updated successfully",
      });

      fetchAccounts();
      setStatusDialogOpen(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error('Error updating account status:', error);
      toast({
        title: "Error",
        description: "Failed to update account status",
        variant: "destructive",
      });
    }
  };

  const handleHideAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ hidden: true } as any)
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account hidden successfully",
      });

      fetchAccounts();
      setHideDialogOpen(false);
      setAccountToHide(null);
    } catch (error) {
      console.error('Error hiding account:', error);
      toast({
        title: "Error",
        description: "Failed to hide account",
        variant: "destructive",
      });
    }
  };

  const handleUnhideAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ hidden: false } as any)
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account unhidden successfully",
      });

      fetchAccounts();
    } catch (error) {
      console.error('Error unhiding account:', error);
      toast({
        title: "Error",
        description: "Failed to unhide account",
        variant: "destructive",
      });
    }
  };

  const handleAddTransaction = async () => {
    if (!transactionAccount || !transactionType || !transactionAmount || !transactionDescription) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setTransactionLoading(true);
    try {
      // Map transaction type and determine amount sign
      const finalAmount = transactionType === 'deposit' ? amount : -amount;
      
      const { data, error } = await supabase.rpc('admin_create_transaction' as any, {
        p_account_id: transactionAccount.id,
        p_transaction_type: transactionType as 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'fee' | 'interest',
        p_amount: finalAmount,
        p_description: transactionDescription,
        p_status: 'completed',
        p_transaction_date: transactionDate.toISOString()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string; transaction_id?: string; new_balance?: number; reference_number?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed');
      }

      // Send transaction email alert to user
      try {
        console.log('Sending transaction email alert...');
        await supabase.functions.invoke('send-transaction-email', {
          body: {
            user_id: transactionAccount.user_id,
            transaction_type: transactionType,
            amount: amount,
            description: transactionDescription,
            account_number: transactionAccount.account_number,
            reference_number: result.reference_number || `TXN-${Date.now()}`,
            new_balance: result.new_balance || transactionAccount.balance + finalAmount
          }
        });
        console.log('Transaction email alert sent successfully');
      } catch (emailError) {
        console.error('Failed to send transaction email alert:', emailError);
        // Don't fail the transaction if email fails
      }

      toast({
        title: "Success",
        description: result.message || "Transaction processed successfully",
      });

      // Reset form and close dialog
      setTransactionDialogOpen(false);
      setTransactionAccount(null);
      setTransactionType("");
      setTransactionAmount("");
      setTransactionDescription("");
      setTransactionDate(new Date());
      
      // Refresh accounts to show updated balance
      fetchAccounts();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process transaction",
        variant: "destructive",
      });
    } finally {
      setTransactionLoading(false);
    }
  };

  // Parse bulk import data
  const parseBulkImportData = (data: string) => {
    const transactions: Array<{
      type: string;
      amount: number;
      description: string;
      date: string;
      valid: boolean;
      error?: string;
    }> = [];

    // Split by semicolons and filter empty entries
    const entries = data.split(';').map(e => e.trim()).filter(e => e.length > 0);

    for (const entry of entries) {
      // Split by comma - handle quoted values
      const parts = entry.split(',').map(p => p.trim());
      
      if (parts.length < 4) {
        transactions.push({
          type: parts[0] || '',
          amount: 0,
          description: parts[2] || '',
          date: parts[3] || '',
          valid: false,
          error: 'Incomplete data: requires type, amount, description, date'
        });
        continue;
      }

      const [typeRaw, amountStr, description, dateStr] = parts;
      const type = typeRaw.toLowerCase();
      const amount = parseFloat(amountStr);

      // Validate type
      const validTypes = ['credit', 'debit', 'deposit', 'withdrawal'];
      const normalizedType = (type === 'credit' || type === 'deposit') ? 'deposit' : 
                             (type === 'debit' || type === 'withdrawal') ? 'withdrawal' : type;

      if (!validTypes.includes(type)) {
        transactions.push({
          type: typeRaw,
          amount: amount || 0,
          description,
          date: dateStr,
          valid: false,
          error: 'Invalid type: must be credit, debit, deposit, or withdrawal'
        });
        continue;
      }

      if (isNaN(amount) || amount <= 0) {
        transactions.push({
          type: normalizedType,
          amount: 0,
          description,
          date: dateStr,
          valid: false,
          error: 'Invalid amount: must be a positive number'
        });
        continue;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) {
        transactions.push({
          type: normalizedType,
          amount,
          description,
          date: dateStr,
          valid: false,
          error: 'Invalid date format: must be YYYY-MM-DD'
        });
        continue;
      }

      // Check if date is valid
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        transactions.push({
          type: normalizedType,
          amount,
          description,
          date: dateStr,
          valid: false,
          error: 'Invalid date'
        });
        continue;
      }

      transactions.push({
        type: normalizedType,
        amount,
        description,
        date: dateStr,
        valid: true
      });
    }

    setParsedTransactions(transactions);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.txt'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or TXT file only",
        variant: "destructive",
      });
      return;
    }

    setBulkImportFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      // For CSV files, convert newlines to semicolons (each line is a transaction)
      let processedData = text;
      if (fileExtension === '.csv') {
        // Split by newlines, filter empty lines, rejoin with semicolons
        processedData = text.split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join(';');
      }
      
      setBulkImportData(processedData);
      parseBulkImportData(processedData);
    };
    reader.readAsText(file);
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    const validTransactions = parsedTransactions.filter(t => t.valid);
    
    if (validTransactions.length === 0) {
      toast({
        title: "No valid transactions",
        description: "Please check your data and try again",
        variant: "destructive",
      });
      return;
    }

    if (!transactionAccount) return;

    setBulkImportLoading(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const tx of validTransactions) {
      try {
        const finalAmount = tx.type === 'deposit' ? tx.amount : -tx.amount;
        const txDate = new Date(tx.date);
        
        const { data, error } = await supabase.rpc('admin_create_transaction' as any, {
          p_account_id: transactionAccount.id,
          p_transaction_type: tx.type as 'deposit' | 'withdrawal',
          p_amount: finalAmount,
          p_description: tx.description,
          p_status: 'completed',
          p_transaction_date: txDate.toISOString()
        });

        if (error) throw error;

        const result = data as { success: boolean; error?: string; reference_number?: string; new_balance?: number };
        if (!result.success) {
          throw new Error(result.error || 'Transaction failed');
        }

        // Send transaction email alert for each transaction
        try {
          await supabase.functions.invoke('send-transaction-email', {
            body: {
              user_id: transactionAccount.user_id,
              transaction_type: tx.type,
              amount: tx.amount,
              description: tx.description,
              account_number: transactionAccount.account_number,
              reference_number: result.reference_number || `TXN-${Date.now()}`,
              new_balance: result.new_balance || transactionAccount.balance + finalAmount
            }
          });
        } catch (emailError) {
          console.error('Failed to send transaction email alert:', emailError);
        }

        successCount++;
      } catch (error) {
        failCount++;
        errors.push(`${tx.description}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setBulkImportLoading(false);

    if (successCount > 0) {
      toast({
        title: "Bulk Import Complete",
        description: `Successfully imported ${successCount} transaction(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      
      // Reset form
      setBulkImportData("");
      setBulkImportFile(null);
      setParsedTransactions([]);
      setBulkImportMode("single");
      setTransactionDialogOpen(false);
      fetchAccounts();
    } else {
      toast({
        title: "Import Failed",
        description: "All transactions failed to import",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_delete_account' as any, {
        p_account_id: accountToDelete.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string; deleted?: any };

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: result.message || "Account and all related data deleted successfully",
      });

      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleTransferBlock = async (block: boolean) => {
    if (!accountToBlock) return;

    // If blocking, validate message
    if (block && !blockTransfersMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a block message",
        variant: "destructive",
      });
      return;
    }

    setBlockTransfersLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_toggle_account_transfer_block' as any, {
        p_account_id: accountToBlock.id,
        p_blocked: block,
        p_message: block ? blockTransfersMessage : null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to update transfer block status');
      }

      toast({
        title: block ? "Transfers Blocked" : "Transfers Unblocked",
        description: block 
          ? "Transfers from this account have been blocked" 
          : "Transfers from this account are now allowed",
      });

      setBlockTransfersDialogOpen(false);
      setAccountToBlock(null);
      setBlockTransfersMessage("");
      fetchAccounts();
    } catch (error) {
      console.error('Error toggling transfer block:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update transfer block status",
        variant: "destructive",
      });
    } finally {
      setBlockTransfersLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'open':
      case 'in_progress':
      case 'awaiting_deposit':
        return 'bg-yellow-100 text-yellow-800';
      case 'frozen':
      case 'dormant':
      case 'locked':
      case 'rejected':
      case 'failed':
      case 'closed':
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Account Management
        </CardTitle>
        <CardDescription>
          View and manage all user accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search Bar and Transfer Charges Button */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, account number, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                fetchTransferCharges();
                setTransferChargesDialogOpen(true);
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Transfer Charges
            </Button>
          </div>

          {accountsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <Card key={group.user_id} className="border">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleUserExpansion(group.user_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">{group.user_name}</CardTitle>
                          <CardDescription>{group.user_email}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {group.accounts.length} account{group.accounts.length !== 1 ? 's' : ''}
                        </Badge>
                        {group.expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {group.expanded && (
                    <CardContent className="pt-0">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account Number</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.accounts.map((account) => (
                              <TableRow key={account.id}>
                                <TableCell className="font-mono text-sm">
                                  <div className="flex items-center gap-2">
                                    {account.account_number}
                                    {account.hidden && (
                                      <Badge variant="secondary" className="text-xs">
                                        Hidden
                                      </Badge>
                                    )}
                                    {account.transfers_blocked && (
                                      <Badge variant="destructive" className="text-xs">
                                        Transfers Blocked
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                 <TableCell className="capitalize">
                                   <div className="flex items-center gap-2">
                                     <span>{account.account_type}</span>
                                     <Badge variant="outline" className="text-xs">
                                       {account.currency || 'USD'}
                                     </Badge>
                                   </div>
                                 </TableCell>
                                 <TableCell className="font-medium">
                                   {formatCurrencyAmount(account.balance, account.currency || 'USD')}
                                 </TableCell>
                                 <TableCell>
                                   <Badge className={getStatusColor(account.status)}>
                                     {account.status === 'awaiting_deposit' ? 'awaiting initial deposit' : account.status}
                                   </Badge>
                                 </TableCell>
                                <TableCell>
                                  {new Date(account.created_at).toLocaleDateString()}
                                </TableCell>
                                 <TableCell>
                                   <div className="flex gap-2 flex-wrap">
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => {
                                         setSelectedAccount(account);
                                         setStatusDialogOpen(true);
                                       }}
                                     >
                                       Change Status
                                     </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setTransactionAccount(account);
                                          setTransactionDialogOpen(true);
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Transaction
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setTransferLimitAccount(account);
                                          setTransferLimitDialogOpen(true);
                                        }}
                                      >
                                        <DollarSign className="h-4 w-4 mr-1" />
                                        Set Transfer Limit
                                      </Button>
                                       {account.hidden ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleUnhideAccount(account.id)}
                                        >
                                          <EyeOff className="h-4 w-4" />
                                          Unhide
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setAccountToHide(account);
                                            setHideDialogOpen(true);
                                          }}
                                        >
                                          <EyeOff className="h-4 w-4" />
                                          Hide
                                        </Button>
                                      )}
                                      <Button
                                        variant={account.transfers_blocked ? "outline" : "secondary"}
                                        size="sm"
                                        onClick={() => {
                                          setAccountToBlock(account);
                                          setBlockTransfersMessage(account.transfers_blocked_message || "");
                                          setBlockTransfersDialogOpen(true);
                                        }}
                                      >
                                        <Ban className="h-4 w-4 mr-1" />
                                        {account.transfers_blocked ? "Unblock Transfers" : "Block Transfers"}
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          setAccountToDelete(account);
                                          setDeleteDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                      </Button>
                                   </div>
                                 </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              
              {filteredGroups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No accounts found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Account Status</DialogTitle>
            <DialogDescription>
              Update the status for account {selectedAccount?.account_number}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => selectedAccount && handleAccountStatusUpdate(selectedAccount.id, 'active')}
            >
              Active
            </Button>
            <Button 
              variant="outline" 
              onClick={() => selectedAccount && handleAccountStatusUpdate(selectedAccount.id, 'inactive')}
            >
              Inactive
            </Button>
            <Button 
              variant="outline" 
              onClick={() => selectedAccount && handleAccountStatusUpdate(selectedAccount.id, 'dormant')}
            >
              Dormant
            </Button>
            <Button 
              variant="outline" 
              onClick={() => selectedAccount && handleAccountStatusUpdate(selectedAccount.id, 'frozen')}
            >
              Frozen
            </Button>
            <Button 
              variant="outline" 
              onClick={() => selectedAccount && handleAccountStatusUpdate(selectedAccount.id, 'closed')}
            >
              Closed
            </Button>
            <Button 
              variant="outline" 
              onClick={() => selectedAccount && handleAccountStatusUpdate(selectedAccount.id, 'awaiting_deposit')}
              disabled={selectedAccount && selectedAccount.balance > 0}
              className={selectedAccount && selectedAccount.balance > 0 ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Awaiting Initial Deposit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hide Confirmation Dialog */}
      <Dialog open={hideDialogOpen} onOpenChange={setHideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to hide account {accountToHide?.account_number}? The user will no longer see this account in their dashboard, but it will remain accessible to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setHideDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => accountToHide && handleHideAccount(accountToHide.id)}
            >
              Hide Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setTransactionDialogOpen(false);
          setTransactionType("");
          setTransactionAmount("");
          setTransactionDescription("");
          setTransactionDate(new Date());
          setBulkImportMode("single");
          setBulkImportData("");
          setBulkImportFile(null);
          setParsedTransactions([]);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Create transactions for account {transactionAccount?.account_number}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={bulkImportMode} onValueChange={(v) => setBulkImportMode(v as "single" | "bulk")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Single Transaction</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
            </TabsList>
            
            <TabsContent value="single" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="transaction-type">Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter transaction description..."
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-date">Transaction Date</Label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={transactionDate ? format(transactionDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (!isNaN(date.getTime())) {
                      setTransactionDate(date);
                    }
                  }}
                  placeholder="YYYY-MM-DD"
                  max={format(new Date(), "yyyy-MM-dd")}
                />
                <p className="text-xs text-muted-foreground">
                  Format: YYYY-MM-DD (e.g., {format(new Date(), "yyyy-MM-dd")})
                </p>
              </div>
              
              <div className="flex gap-2 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTransactionDialogOpen(false);
                    setTransactionType("");
                    setTransactionAmount("");
                    setTransactionDescription("");
                    setTransactionDate(new Date());
                  }}
                  disabled={transactionLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddTransaction}
                  disabled={transactionLoading || !transactionType || !transactionAmount || !transactionDescription}
                >
                  {transactionLoading ? "Processing..." : "Add Transaction"}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="bulk" className="space-y-4 mt-4">
              {/* Instructions */}
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Format:</strong> type,amount,description,date<br />
                  <strong>Separate transactions with semicolons (;)</strong><br /><br />
                  <span className="text-muted-foreground">
                    • Type: "credit" or "debit" (or "deposit"/"withdrawal")<br />
                    • Amount: Number (e.g., 1500.00)<br />
                    • Description: Transaction description<br />
                    • Date: YYYY-MM-DD format<br /><br />
                    <strong>Example:</strong><br />
                    credit,1500.00,Salary deposit,2026-01-15;debit,50.00,ATM withdrawal,2026-01-16
                  </span>
                </AlertDescription>
              </Alert>
              
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload File (CSV or TXT)</Label>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  {bulkImportFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBulkImportFile(null);
                        setBulkImportData("");
                        setParsedTransactions([]);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {bulkImportFile && (
                  <p className="text-xs text-muted-foreground">
                    Loaded: {bulkImportFile.name}
                  </p>
                )}
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or paste data below</span>
                </div>
              </div>
              
              {/* Text Area */}
              <div className="space-y-2">
                <Textarea
                  placeholder="credit,1500.00,Salary deposit,2026-01-15;debit,50.00,ATM withdrawal,2026-01-16"
                  value={bulkImportData}
                  onChange={(e) => {
                    setBulkImportData(e.target.value);
                    parseBulkImportData(e.target.value);
                  }}
                  rows={4}
                />
              </div>
              
              {/* Preview Table */}
              {parsedTransactions.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview: {parsedTransactions.filter(t => t.valid).length} valid / {parsedTransactions.length} total</Label>
                  <div className="rounded-md border max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Type</TableHead>
                          <TableHead className="w-[100px]">Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead className="w-[50px]">Valid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedTransactions.map((tx, idx) => (
                          <TableRow key={idx} className={tx.valid ? "" : "bg-destructive/10"}>
                            <TableCell className="capitalize text-xs">{tx.type}</TableCell>
                            <TableCell className="text-xs">{tx.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate" title={tx.description}>
                              {tx.description}
                            </TableCell>
                            <TableCell className="text-xs">{tx.date}</TableCell>
                            <TableCell>
                              {tx.valid ? (
                                <Badge variant="secondary" className="text-xs">✓</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs" title={tx.error}>✗</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {parsedTransactions.some(t => !t.valid) && (
                    <p className="text-xs text-destructive">
                      <AlertCircle className="inline h-3 w-3 mr-1" />
                      Some transactions have errors and will be skipped
                    </p>
                  )}
                </div>
              )}
              
              <div className="flex gap-2 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setTransactionDialogOpen(false);
                    setBulkImportMode("single");
                    setBulkImportData("");
                    setBulkImportFile(null);
                    setParsedTransactions([]);
                  }}
                  disabled={bulkImportLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkImport}
                  disabled={bulkImportLoading || parsedTransactions.filter(t => t.valid).length === 0}
                >
                  {bulkImportLoading ? "Importing..." : `Import ${parsedTransactions.filter(t => t.valid).length} Transaction(s)`}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Transfer Limit Dialog */}
      <TransferLimitDialog
        isOpen={transferLimitDialogOpen}
        onClose={() => {
          setTransferLimitDialogOpen(false);
          setTransferLimitAccount(null);
        }}
        accountId={transferLimitAccount?.id || ''}
        accountNumber={transferLimitAccount?.account_number || ''}
        onSuccess={() => {
          // Optionally refresh accounts or show success message
        }}
      />

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete account <strong>{accountToDelete?.account_number}</strong>?
              <br /><br />
              <span className="text-destructive font-medium">
                This action is irreversible and will delete:
              </span>
              <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground">
                <li>All transactions for this account</li>
                <li>All transfers involving this account</li>
                <li>All check deposits for this account</li>
                <li>All crypto deposits for this account</li>
                <li>All account statements</li>
                <li>All foreign remittances</li>
                <li>All bill payments</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setAccountToDelete(null);
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Transfers Dialog */}
      <Dialog open={blockTransfersDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setBlockTransfersDialogOpen(false);
          setAccountToBlock(null);
          setBlockTransfersMessage("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              {accountToBlock?.transfers_blocked ? "Unblock Transfers" : "Block Transfers"}
            </DialogTitle>
            <DialogDescription>
              {accountToBlock?.transfers_blocked 
                ? `Allow transfers from account ${accountToBlock?.account_number}`
                : `Block all transfers from account ${accountToBlock?.account_number}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {accountToBlock?.transfers_blocked ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-950/20 dark:border-green-900/50">
                <p className="text-sm text-green-800 dark:text-green-400">
                  Unblocking this account will allow the user to make transfers again.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setBlockTransfersDialogOpen(false);
                    setAccountToBlock(null);
                    setBlockTransfersMessage("");
                  }}
                  disabled={blockTransfersLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleToggleTransferBlock(false)}
                  disabled={blockTransfersLoading}
                >
                  {blockTransfersLoading ? "Processing..." : "Unblock Transfers"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Warning: This will prevent all transfers from this account.
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="block-message">Block Message *</Label>
                  <span className={cn(
                    "text-xs",
                    blockTransfersMessage.length > BLOCK_MESSAGE_MAX_LENGTH ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {blockTransfersMessage.length}/{BLOCK_MESSAGE_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  id="block-message"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter the message to display when a transfer is attempted from this account..."
                  value={blockTransfersMessage}
                  onChange={(e) => setBlockTransfersMessage(e.target.value.slice(0, BLOCK_MESSAGE_MAX_LENGTH))}
                  maxLength={BLOCK_MESSAGE_MAX_LENGTH}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be shown to the user when they attempt a transfer. Maximum {BLOCK_MESSAGE_MAX_LENGTH} characters.
                </p>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setBlockTransfersDialogOpen(false);
                    setAccountToBlock(null);
                    setBlockTransfersMessage("");
                  }}
                  disabled={blockTransfersLoading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleToggleTransferBlock(true)}
                  disabled={blockTransfersLoading || !blockTransfersMessage.trim()}
                >
                  {blockTransfersLoading ? "Processing..." : "Block Transfers"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Charges Dialog */}
      <Dialog open={transferChargesDialogOpen} onOpenChange={setTransferChargesDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transfer Charges Configuration
            </DialogTitle>
            <DialogDescription>
              Set the transfer fees that are automatically deducted when admin approves transfers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="domesticCharge">Domestic Charges (Other Banks)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="domesticCharge"
                  type="number"
                  step="0.01"
                  min="0"
                  value={domesticCharge}
                  onChange={(e) => setDomesticCharge(e.target.value)}
                  className="pl-10"
                  placeholder="25.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Fee charged when an external (other bank) transfer is approved.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="internationalCharge">International Wire Charges</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="internationalCharge"
                  type="number"
                  step="0.01"
                  min="0"
                  value={internationalCharge}
                  onChange={(e) => setInternationalCharge(e.target.value)}
                  className="pl-10"
                  placeholder="50.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Fee charged when an international wire transfer is approved.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setTransferChargesDialogOpen(false)}
              disabled={transferChargesLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveTransferCharges}
              disabled={transferChargesLoading}
            >
              {transferChargesLoading ? "Saving..." : "Save Charges"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
