import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, CreditCard, Trash2, Edit, DollarSign } from "lucide-react";
import { parseDecimalAmount, capitalizeAccountType } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface Payee {
  id: string;
  payee_name: string;
  account_number: string;
  bank_name: string | null;
  payee_type: string | null;
}

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
  status: string;
}

interface BillPayment {
  id: string;
  amount: number;
  description: string;
  payment_date: string;
  status: string;
  reference_number: string;
  payee: {
    payee_name: string;
    account_number: string;
  };
}

export const PayBills = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayee, setSelectedPayee] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [newPayeeName, setNewPayeeName] = useState("");
  const [newPayeeAccount, setNewPayeeAccount] = useState("");
  const [newPayeeBank, setNewPayeeBank] = useState("");
  const [isAddingPayee, setIsAddingPayee] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [payeesResult, accountsResult, paymentsResult] = await Promise.all([
        (supabase as any).from('payees').select('*').eq('user_id', user?.id),
        supabase.from('accounts').select('*').eq('user_id', user?.id).eq('status', 'active'),
        (supabase as any)
          .from('bill_payments')
          .select(`
            *,
            payee:payees(payee_name, account_number)
          `)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (payeesResult.error) throw payeesResult.error;
      if (accountsResult.error) throw accountsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      setPayees((payeesResult.data || []) as any);
      setAccounts(accountsResult.data || []);
      setBillPayments((paymentsResult.data || []) as any);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load bill payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayee = async () => {
    if (!newPayeeName || !newPayeeAccount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await (supabase as any).from('payees').insert({
        user_id: user?.id,
        payee_name: newPayeeName,
        account_number: newPayeeAccount,
        bank_name: newPayeeBank || null,
        payee_type: 'individual'
      });

      if (error) throw error;

      setNewPayeeName("");
      setNewPayeeAccount("");
      setNewPayeeBank("");
      setIsAddingPayee(false);
      await fetchData();

      toast({
        title: "Success",
        description: "Payee added successfully",
      });
    } catch (error) {
      console.error('Error adding payee:', error);
      toast({
        title: "Error",
        description: "Failed to add payee",
        variant: "destructive",
      });
    }
  };

  const processPayment = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to process payments",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPayee || !selectedAccount || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const paymentAmount = parseDecimalAmount(amount);
    if (paymentAmount <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log('Processing bill payment with params:', {
        p_payee_id: selectedPayee,
        p_account_id: selectedAccount,
        p_amount: paymentAmount,
        p_description: description || null
      });

      // Use secure database function for bill payment
      const { data, error } = await (supabase as any)
        .rpc('process_bill_payment', {
          p_payee_id: selectedPayee,
          p_account_id: selectedAccount,
          p_amount: paymentAmount,
          p_description: description || null
        });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      if (!data) {
        console.error('No data returned from RPC');
        throw new Error('No response received from payment processing');
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        console.error('Payment processing failed:', result.error);
        toast({
          title: "Payment Failed",
          description: result.error || "Payment processing failed. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setSelectedPayee("");
      setSelectedAccount("");
      setAmount("");
      setDescription("");
      await fetchData();

      toast({
        title: "Success",
        description: "Payment processed successfully",
      });
    } catch (error: any) {
      console.error('Error processing payment:', error);
      
      // Show more specific error message
      let errorMessage = "Failed to process payment";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code) {
        errorMessage = `Error code: ${error.code}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">{t('dashboard.payBills')}</h2>
          <p className="text-muted-foreground">{t('dashboard.payBillsDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t('dashboard.makePayment')}
            </CardTitle>
            <CardDescription>{t('dashboard.makePaymentDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payee">{t('dashboard.selectPayee')}</Label>
              <Select value={selectedPayee} onValueChange={setSelectedPayee}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.choosePayee')} />
                </SelectTrigger>
                <SelectContent>
                  {payees.map((payee) => (
                    <SelectItem key={payee.id} value={payee.id}>
                      {payee.payee_name} - {payee.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">{t('dashboard.fromAccount')}</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.chooseAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {capitalizeAccountType(account.account_type)} - {account.account_number} (${account.balance.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{t('dashboard.amount')}</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('dashboard.descriptionOptional')}</Label>
              <Textarea
                id="description"
                placeholder={t('dashboard.paymentDescription')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button 
              onClick={processPayment} 
              disabled={isProcessingPayment}
              className="w-full"
            >
              {isProcessingPayment ? t('dashboard.processing') : t('dashboard.processPayment')}
            </Button>
          </CardContent>
        </Card>

        {/* Manage Payees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('dashboard.managePayees')}</span>
              <Dialog open={isAddingPayee} onOpenChange={setIsAddingPayee}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dashboard.addPayee')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('dashboard.addNewPayee')}</DialogTitle>
                    <DialogDescription>
                      {t('dashboard.addNewPayeeDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPayeeName">Payee Name</Label>
                      <Input
                        id="newPayeeName"
                        placeholder="Enter payee name"
                        value={newPayeeName}
                        onChange={(e) => setNewPayeeName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPayeeAccount">Account Number</Label>
                      <Input
                        id="newPayeeAccount"
                        placeholder="Enter account number"
                        value={newPayeeAccount}
                        onChange={(e) => setNewPayeeAccount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPayeeBank">Bank Name (Optional)</Label>
                      <Input
                        id="newPayeeBank"
                        placeholder="Enter bank name"
                        value={newPayeeBank}
                        onChange={(e) => setNewPayeeBank(e.target.value)}
                      />
                    </div>
                    <Button onClick={addPayee} className="w-full">
                      Add Payee
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>{t('dashboard.yourSavedPayees')}</CardDescription>
          </CardHeader>
          <CardContent>
            {payees.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No payees found. Add a payee to start making payments.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {payees.map((payee) => (
                  <div key={payee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{payee.payee_name}</p>
                      <p className="text-sm text-muted-foreground">{payee.account_number}</p>
                      {payee.bank_name && (
                        <p className="text-xs text-muted-foreground">{payee.bank_name}</p>
                      )}
                    </div>
                    <Badge variant="secondary">{payee.payee_type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('dashboard.recentPayments')}
          </CardTitle>
          <CardDescription>{t('dashboard.recentPaymentsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {billPayments.length === 0 ? (
            <Alert>
              <AlertDescription>
                No bill payments found.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {billPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{payment.payee.payee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.description || "Bill Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString()} • {payment.reference_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">-${payment.amount.toFixed(2)}</p>
                    <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
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