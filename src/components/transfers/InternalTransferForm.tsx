import { useState } from "react";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseDecimalAmount, formatAmount, capitalizeAccountType, formatCurrencyAmount, getCurrencySymbol } from "@/lib/utils";
import { TransferReviewModal } from "./TransferReviewModal";
import { TransferProgressModal } from "./TransferProgressModal";
import { TransferConfirmation } from "./TransferConfirmation";
import { AccountBlockedModal } from "./AccountBlockedModal";
import { ExchangeRateModal, getExchangeRate, convertAmount } from "./ExchangeRateModal";
import { TransferLimitExceededModal } from "./TransferLimitExceededModal";


interface Account {
  id: string;
  account_type: string;
  account_number: string;
  balance: number;
  status: string;
  currency: string;
  transfers_blocked?: boolean;
  transfers_blocked_message?: string | null;
  hidden?: boolean;
}

interface InternalTransferFormProps {
  accounts: Account[];
  onTransferComplete: () => void;
}

export const InternalTransferForm = ({ accounts, onTransferComplete }: InternalTransferFormProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [transferStep, setTransferStep] = useState<'form' | 'review' | 'exchange' | 'progress' | 'confirmation'>('form');
  const [transferResult, setTransferResult] = useState<any>(null);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    description: ""
  });
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Account blocked state
  const [accountBlockedModalOpen, setAccountBlockedModalOpen] = useState(false);
  const [blockedAccountMessage, setBlockedAccountMessage] = useState("");
  
  // Transfer limit state
  const [limitExceededModalOpen, setLimitExceededModalOpen] = useState(false);
  const [limitExceededData, setLimitExceededData] = useState<{ message: string; limit: number } | null>(null);

  // Exchange rate state
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeData, setExchangeData] = useState<{
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    exchangeRate: number;
  } | null>(null);

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.fromAccount) errors.fromAccount = 'Please select a source account';
    if (!formData.toAccount) errors.toAccount = 'Please select a destination account';
    if (!formData.amount) errors.amount = 'Please enter an amount';
    
    const amount = parseFloat(formData.amount);
    if (formData.amount && (isNaN(amount) || amount <= 0)) {
      errors.amount = 'Please enter a valid amount greater than 0';
    }

    if (formData.fromAccount === formData.toAccount && formData.fromAccount) {
      errors.toAccount = 'Cannot transfer to the same account';
    }

    const selectedAccount = accounts.find(acc => acc.id === formData.fromAccount);
    if (selectedAccount && amount > selectedAccount.balance) {
      errors.amount = 'Your account balance is insufficient for this transfer';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const fromAccount = accounts.find(acc => acc.id === formData.fromAccount);
    if (fromAccount?.transfers_blocked) {
      setBlockedAccountMessage(fromAccount.transfers_blocked_message || "This account has been blocked for transfers. Please contact support.");
      setAccountBlockedModalOpen(true);
      return;
    }
    
    setTransferStep('review');
  };

  const handleReviewConfirm = async () => {
    // Check transfer limit before proceeding
    const amount = parseDecimalAmount(formData.amount);
    const { data: limitCheck, error: limitError } = await (supabase as any).rpc("check_transfer_limit", {
      p_account_id: formData.fromAccount,
      p_amount: amount,
    });

    if (!limitError && limitCheck && !(limitCheck as any).allowed) {
      setLimitExceededData({
        message: (limitCheck as any).message,
        limit: (limitCheck as any).limit,
      });
      setLimitExceededModalOpen(true);
      return;
    }

    const fromAccount = accounts.find(acc => acc.id === formData.fromAccount);
    const toAccount = accounts.find(acc => acc.id === formData.toAccount);
    const fromCurrency = fromAccount?.currency || 'USD';
    const toCurrency = toAccount?.currency || 'USD';
    
    // Check if currencies are different - show exchange rate popup
    if (fromCurrency !== toCurrency) {
      const exchangeRate = getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = convertAmount(amount, fromCurrency, toCurrency);
      
      setExchangeData({
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: convertedAmount,
        exchangeRate
      });
      setTransferStep('exchange');
      setShowExchangeModal(true);
    } else {
      // Same currency - proceed directly to progress
      setTransferStep('progress');
    }
  };

  const handleExchangeConfirm = () => {
    setShowExchangeModal(false);
    setTransferStep('progress');
  };

  const processTransfer = async () => {
    setLoading(true);
    
    try {
      const amount = parseDecimalAmount(formData.amount);

      const fromAccount = accounts.find(acc => acc.id === formData.fromAccount);
      const toAccount = accounts.find(acc => acc.id === formData.toAccount);
      const fromCurrency = fromAccount?.currency || 'USD';
      const toCurrency = toAccount?.currency || 'USD';
      
      // Calculate converted amount if currencies differ
      const finalAmount = fromCurrency !== toCurrency 
        ? convertAmount(amount, fromCurrency, toCurrency)
        : amount;
      
      // Use secure database function for internal transfer with currency conversion
      const { data, error } = await (supabase as any)
        .rpc('process_internal_transfer_with_conversion', {
          p_from_account_id: formData.fromAccount,
          p_to_account_id: formData.toAccount,
          p_amount: amount,
          p_converted_amount: finalAmount,
          p_from_currency: fromCurrency,
          p_to_currency: toCurrency,
          p_description: formData.description || 'Internal transfer'
        });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Transfer Failed",
          description: data.error,
          variant: "destructive",
        });
        setTransferStep('form');
        return;
      }

      setTransferResult({
        referenceNumber: data.transfer_id || `INT-${Date.now()}`,
        amount: amount,
        convertedAmount: fromCurrency !== toCurrency ? finalAmount : undefined,
        fromCurrency,
        toCurrency: fromCurrency !== toCurrency ? toCurrency : undefined,
        fromAccount: `${capitalizeAccountType(fromAccount?.account_type || '')} - ${fromAccount?.account_number}`,
        toAccount: `${capitalizeAccountType(toAccount?.account_type || '')} - ${toAccount?.account_number}`,
        timestamp: new Date().toLocaleString(),
        status: 'completed'
      });

    } catch (error) {
      console.error('Error processing transfer:', error);
      toast({
        title: "Transfer Failed",
        description: "Unable to process transfer. Please try again.",
        variant: "destructive",
      });
      setTransferStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressComplete = async () => {
    if (hasProcessed) return;
    setHasProcessed(true);
    await processTransfer();
    setTransferStep('confirmation');
  };

  const resetForm = () => {
    setFormData({
      fromAccount: "",
      toAccount: "",
      amount: "",
      description: ""
    });
    setValidationErrors({});
    setTransferStep('form');
    setTransferResult(null);
    setHasProcessed(false);
    setExchangeData(null);
    onTransferComplete();
  };

  const getReviewData = () => {
    const fromAccount = accounts.find(acc => acc.id === formData.fromAccount);
    const toAccount = accounts.find(acc => acc.id === formData.toAccount);
    
    return {
      type: 'internal' as const,
      fromAccount,
      toAccount,
      amount: parseDecimalAmount(formData.amount),
      description: formData.description
    };
  };

  // Show confirmation page
  if (transferStep === 'confirmation' && transferResult) {
    return (
      <TransferConfirmation
        transferType="internal"
        transferData={transferResult}
        onReturnToTransfers={resetForm}
        onReturnToDashboard={resetForm}
      />
    );
  }

  const fromAccount = accounts.find(acc => acc.id === formData.fromAccount);
  const toAccount = accounts.find(acc => acc.id === formData.toAccount);
  const showCurrencyWarning = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            {t('dashboard.internalTransfer')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.internalTransferDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromAccount">{t('dashboard.fromAccount')}</Label>
                <Select value={formData.fromAccount} onValueChange={(value) => 
                  setFormData({...formData, fromAccount: value})
                }>
                  <SelectTrigger className={validationErrors.fromAccount ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('dashboard.selectSourceAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => !acc.hidden).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {capitalizeAccountType(account.account_type)} - {account.account_number} ({formatCurrencyAmount(account.balance, account.currency || 'USD')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.fromAccount && (
                  <p className="text-sm text-red-500">{validationErrors.fromAccount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="toAccount">{t('dashboard.toAccount')}</Label>
                <Select value={formData.toAccount} onValueChange={(value) => 
                  setFormData({...formData, toAccount: value})
                }>
                  <SelectTrigger className={validationErrors.toAccount ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('dashboard.selectDestinationAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(acc => acc.id !== formData.fromAccount && !acc.hidden)
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {capitalizeAccountType(account.account_type)} - {account.account_number} ({account.currency || 'USD'})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {validationErrors.toAccount && (
                  <p className="text-sm text-red-500">{validationErrors.toAccount}</p>
                )}
                {showCurrencyWarning && (
                  <p className="text-sm text-amber-600">
                    {t('dashboard.currencyConversionApply')} ({fromAccount.currency} → {toAccount.currency})
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{t('dashboard.amount')} ({getCurrencySymbol(fromAccount?.currency || 'USD')})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className={validationErrors.amount ? 'border-red-500' : ''}
              />
              {validationErrors.amount && (
                <p className="text-sm text-red-500">{validationErrors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('dashboard.descriptionOptional')}</Label>
              <Textarea
                id="description"
                placeholder={t('dashboard.whatsThisTransferFor')}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {t('dashboard.reviewTransfer')}
              </div>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <TransferReviewModal
        open={transferStep === 'review'}
        onOpenChange={(open) => !open && setTransferStep('form')}
        reviewData={getReviewData()}
        onEdit={() => setTransferStep('form')}
        onConfirm={handleReviewConfirm}
        loading={loading}
      />

      {/* Exchange Rate Modal */}
      {exchangeData && (
        <ExchangeRateModal
          open={showExchangeModal}
          onOpenChange={setShowExchangeModal}
          fromCurrency={exchangeData.fromCurrency}
          toCurrency={exchangeData.toCurrency}
          fromAmount={exchangeData.fromAmount}
          toAmount={exchangeData.toAmount}
          exchangeRate={exchangeData.exchangeRate}
          onConfirm={handleExchangeConfirm}
          onCancel={() => {
            setShowExchangeModal(false);
            setTransferStep('review');
          }}
          loading={loading}
        />
      )}

      {/* Progress Modal */}
      <TransferProgressModal
        open={transferStep === 'progress'}
        onComplete={handleProgressComplete}
        transferType="internal"
        transferData={{
          amount: parseDecimalAmount(formData.amount),
          fromAccountType: accounts.find(acc => acc.id === formData.fromAccount)?.account_type,
          toAccountType: accounts.find(acc => acc.id === formData.toAccount)?.account_type
        }}
      />

      {/* Account Blocked Modal */}
      <AccountBlockedModal
        isOpen={accountBlockedModalOpen}
        onClose={() => setAccountBlockedModalOpen(false)}
        message={blockedAccountMessage}
      />

      {/* Transfer Limit Exceeded Modal */}
      {limitExceededData && (
        <TransferLimitExceededModal
          isOpen={limitExceededModalOpen}
          onClose={() => {
            setLimitExceededModalOpen(false);
            setLimitExceededData(null);
          }}
          message={limitExceededData.message}
          limit={limitExceededData.limit}
        />
      )}
    </>
  );
};
