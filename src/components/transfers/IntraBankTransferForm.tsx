import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseDecimalAmount, formatCurrencyAmount, capitalizeAccountType, getCurrencySymbol } from "@/lib/utils";
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
interface IntraBankTransferFormProps {
  accounts: Account[];
  onTransferComplete: () => void;
}
export const IntraBankTransferForm = ({ accounts, onTransferComplete }: IntraBankTransferFormProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [transferStep, setTransferStep] = useState<"form" | "review" | "exchange" | "progress" | "confirmation">(
    "form",
  );
  const [transferResult, setTransferResult] = useState<any>(null);
  const [hasProcessed, setHasProcessed] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fromAccount: "",
    recipientAccountNumber: "",
    amount: "",
    description: "",
  });

  // Recipient validation state
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [recipientAccountId, setRecipientAccountId] = useState<string | null>(null);
  const [recipientCurrency, setRecipientCurrency] = useState<string | null>(null);
  const [validatingRecipient, setValidatingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

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

  // Validate recipient account when account number changes
  useEffect(() => {
    const validateRecipientAccount = async () => {
      if (!formData.recipientAccountNumber || formData.recipientAccountNumber.length < 5) {
        setRecipientName(null);
        setRecipientAccountId(null);
        setRecipientCurrency(null);
        setRecipientError(null);
        return;
      }
      setValidatingRecipient(true);
      setRecipientError(null);
      try {
        // Use the secure RPC function to look up recipient (bypasses RLS safely)
        const { data, error } = await supabase.rpc('lookup_intrabank_recipient', {
          p_account_number: formData.recipientAccountNumber
        });
        
        if (error) throw error;
        
        // Cast the JSON response to the expected shape
        const result = data as { success: boolean; error?: string; full_name?: string; account_id?: string; currency?: string };
        
        if (!result.success) {
          setRecipientName(null);
          setRecipientAccountId(null);
          setRecipientCurrency(null);
          setRecipientError(result.error || "Account not found");
          return;
        }
        
        setRecipientName(result.full_name || null);
        setRecipientAccountId(result.account_id || null);
        setRecipientCurrency(result.currency || "USD");
        setRecipientError(null);
      } catch (error) {
        console.error("Error validating recipient:", error);
        setRecipientName(null);
        setRecipientAccountId(null);
        setRecipientCurrency(null);
        setRecipientError("Error validating account");
      } finally {
        setValidatingRecipient(false);
      }
    };
    const debounceTimer = setTimeout(validateRecipientAccount, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.recipientAccountNumber]);
  const validateForm = () => {
    const errors: {
      [key: string]: string;
    } = {};
    if (!formData.fromAccount) errors.fromAccount = "Please select a source account";
    if (!formData.recipientAccountNumber) errors.recipientAccountNumber = "Please enter recipient account number";
    if (!recipientName) errors.recipientAccountNumber = recipientError || "Invalid account number";
    if (!formData.amount) errors.amount = "Please enter an amount";
    const amount = parseFloat(formData.amount);
    if (formData.amount && (isNaN(amount) || amount <= 0)) {
      errors.amount = "Please enter a valid amount greater than 0";
    }
    const selectedAccount = accounts.find((acc) => acc.id === formData.fromAccount);
    if (selectedAccount && amount > selectedAccount.balance) {
      errors.amount = "Your account balance is insufficient for this transfer";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const fromAccount = accounts.find((acc) => acc.id === formData.fromAccount);
    if (fromAccount?.transfers_blocked) {
      setBlockedAccountMessage(
        fromAccount.transfers_blocked_message || "This account has been blocked for transfers. Please contact support.",
      );
      setAccountBlockedModalOpen(true);
      return;
    }
    setTransferStep("review");
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

    const fromAccount = accounts.find((acc) => acc.id === formData.fromAccount);
    const fromCurrency = fromAccount?.currency || "USD";
    const toCurrency = recipientCurrency || "USD";

    // Check if currencies are different
    if (fromCurrency !== toCurrency) {
      const exchangeRate = getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = convertAmount(amount, fromCurrency, toCurrency);
      setExchangeData({
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: convertedAmount,
        exchangeRate,
      });
      setTransferStep("exchange");
      setShowExchangeModal(true);
    } else {
      setTransferStep("progress");
    }
  };
  const handleExchangeConfirm = () => {
    setShowExchangeModal(false);
    setTransferStep("progress");
  };
  const processTransfer = useCallback(async (): Promise<boolean> => {
    const amount = parseDecimalAmount(formData.amount);
    const fromAccount = accounts.find((acc) => acc.id === formData.fromAccount);
    const fromCurrency = fromAccount?.currency || "USD";
    const toCurrency = recipientCurrency || fromCurrency;

    // Determine the final amount (use converted amount if cross-currency)
    let finalAmount = amount;
    if (exchangeData && fromCurrency !== toCurrency) {
      finalAmount = exchangeData.toAmount;
    }

    setLoading(true);
    try {
      // Validate we have a recipient account ID
      if (!recipientAccountId) {
        toast({
          title: "Transfer Failed",
          description: "Recipient account not found. Please verify the account number.",
          variant: "destructive",
        });
        return false;
      }

      const { data, error } = await supabase.rpc("process_intrabank_transfer", {
        p_from_account_id: formData.fromAccount,
        p_to_account_id: recipientAccountId,
        p_amount: amount,
        p_converted_amount: finalAmount,
        p_description: formData.description || `Transfer to ${recipientName}`,
      });

      if (error) throw error;

      // Cast the JSON response to the expected shape
      const result = data as { 
        success: boolean; 
        error?: string; 
        reference_number?: string;
        transfer_id?: string;
        from_currency?: string;
        to_currency?: string;
        amount?: number;
        converted_amount?: number;
        // Email notification fields
        from_user_id?: string;
        to_user_id?: string;
        from_balance_after?: number;
        to_balance_after?: number;
        from_account_number?: string;
        to_account_number?: string;
        from_name?: string;
        to_name?: string;
      };

      if (!result.success) {
        toast({
          title: "Transfer Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
        return false;
      }

      setTransferResult({
        referenceNumber: result.reference_number || `CIB-${Date.now()}`,
        amount: amount,
        convertedAmount: fromCurrency !== toCurrency ? finalAmount : undefined,
        fromCurrency,
        toCurrency: fromCurrency !== toCurrency ? toCurrency : undefined,
        fromAccount: `${capitalizeAccountType(fromAccount?.account_type || "")} - ${fromAccount?.account_number}`,
        recipientName: recipientName,
        recipientAccount: formData.recipientAccountNumber,
        timestamp: new Date().toLocaleString(),
        status: "completed",
        description: formData.description || undefined,
      });

      // Send email notifications (don't block on failure)
      sendTransferEmailNotifications({
        result,
        amount,
        finalAmount,
        fromCurrency,
        toCurrency,
        fromAccountNumber: fromAccount?.account_number || "",
        description: formData.description,
        recipientName: recipientName || "",
      });

      toast({
        title: "Transfer Successful",
        description: `Transfer to ${recipientName} completed successfully.`,
      });

      return true;
    } catch (error) {
      console.error("Error processing transfer:", error);
      toast({
        title: "Transfer Failed",
        description: "Unable to process transfer. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [formData, accounts, recipientAccountId, recipientCurrency, recipientName, exchangeData, toast]);

  // Send debit/credit email notifications after successful transfer
  const sendTransferEmailNotifications = async (params: {
    result: {
      from_user_id?: string;
      to_user_id?: string;
      from_balance_after?: number;
      to_balance_after?: number;
      from_account_number?: string;
      to_account_number?: string;
      from_name?: string;
      to_name?: string;
      reference_number?: string;
    };
    amount: number;
    finalAmount: number;
    fromCurrency: string;
    toCurrency: string;
    fromAccountNumber: string;
    description: string;
    recipientName: string;
  }) => {
    const { result, amount, finalAmount, fromCurrency, toCurrency, fromAccountNumber, description, recipientName } = params;

    // Send DEBIT alert to sender
    if (result.from_user_id) {
      try {
        await supabase.functions.invoke('send-transaction-email', {
          body: {
            user_id: result.from_user_id,
            transaction_type: 'withdrawal',
            amount: amount,
            description: description || `Transfer to ${recipientName}`,
            account_number: fromAccountNumber,
            reference_number: result.reference_number,
            new_balance: result.from_balance_after,
            currency: fromCurrency
          }
        });
        console.log('Debit alert sent to sender');
      } catch (emailError) {
        console.error('Failed to send debit alert:', emailError);
        // Don't fail the transfer if email fails
      }
    }

    // Send CREDIT alert to recipient
    if (result.to_user_id) {
      try {
        await supabase.functions.invoke('send-transaction-email', {
          body: {
            user_id: result.to_user_id,
            transaction_type: 'deposit',
            amount: fromCurrency !== toCurrency ? finalAmount : amount,
            description: `Transfer from ${result.from_name || 'sender'}`,
            account_number: result.to_account_number,
            reference_number: result.reference_number,
            new_balance: result.to_balance_after,
            currency: toCurrency
          }
        });
        console.log('Credit alert sent to recipient');
      } catch (emailError) {
        console.error('Failed to send credit alert:', emailError);
        // Don't fail the transfer if email fails
      }
    }
  };

  const handleProgressComplete = useCallback(async () => {
    if (hasProcessed) return;
    setHasProcessed(true);
    
    const success = await processTransfer();
    
    if (success) {
      setTransferStep("confirmation");
    } else {
      // Transfer failed - return to form so user can retry
      setTransferStep("form");
      setHasProcessed(false);
    }
  }, [hasProcessed, processTransfer]);

  const handleProgressCancel = () => {
    setTransferStep("form");
    setHasProcessed(false);
  };
  const resetForm = () => {
    setFormData({
      fromAccount: "",
      recipientAccountNumber: "",
      amount: "",
      description: "",
    });
    setRecipientName(null);
    setRecipientAccountId(null);
    setRecipientCurrency(null);
    setRecipientError(null);
    setValidationErrors({});
    setTransferStep("form");
    setTransferResult(null);
    setHasProcessed(false);
    setExchangeData(null);
    onTransferComplete();
  };
  const getReviewData = () => {
    const fromAccount = accounts.find((acc) => acc.id === formData.fromAccount);
    return {
      type: "internal" as const,
      fromAccount,
      amount: parseDecimalAmount(formData.amount),
      description: formData.description,
      recipientName: recipientName || undefined,
      recipientAccount: formData.recipientAccountNumber,
    };
  };

  // Show confirmation page
  if (transferStep === "confirmation" && transferResult) {
    return (
      <TransferConfirmation
        transferType="internal"
        transferData={transferResult}
        onReturnToTransfers={resetForm}
        onReturnToDashboard={resetForm}
      />
    );
  }
  const fromAccount = accounts.find((acc) => acc.id === formData.fromAccount);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{t('dashboard.sameBankTransfer')}</CardTitle>
          <CardDescription>{t('dashboard.sameBankTransferDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromAccountCIB">{t('dashboard.fromAccount')}</Label>
              <Select
                value={formData.fromAccount}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    fromAccount: value,
                  })
                }
              >
                <SelectTrigger className={validationErrors.fromAccount ? "border-red-500" : ""}>
                  <SelectValue placeholder={t('dashboard.selectSourceAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((acc) => !acc.hidden)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {capitalizeAccountType(account.account_type)} - {account.account_number} (
                        {formatCurrencyAmount(account.balance, account.currency || "USD")})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {validationErrors.fromAccount && <p className="text-sm text-red-500">{validationErrors.fromAccount}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientAccountNumber">{t('dashboard.recipientAccountLabel')}</Label>
                <div className="relative">
                  <Input
                    id="recipientAccountNumber"
                    placeholder={t('dashboard.enterAccountNumber')}
                    value={formData.recipientAccountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recipientAccountNumber: e.target.value,
                      })
                    }
                    className={
                      validationErrors.recipientAccountNumber || recipientError
                        ? "border-red-500 pr-10"
                        : recipientName
                          ? "border-green-500 pr-10"
                          : ""
                    }
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {validatingRecipient && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!validatingRecipient && recipientName && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {!validatingRecipient && recipientError && <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {validationErrors.recipientAccountNumber && (
                  <p className="text-sm text-red-500">{validationErrors.recipientAccountNumber}</p>
                )}
                {recipientError && !validationErrors.recipientAccountNumber && (
                  <p className="text-sm text-red-500">{recipientError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientName">{t('dashboard.accountHolderName')}</Label>
                <Input
                  id="recipientName"
                  value={recipientName || ""}
                  disabled
                  placeholder="Will be auto-populated"
                  className="bg-muted"
                />
                {recipientName && recipientCurrency && fromAccount && recipientCurrency !== fromAccount.currency && (
                  <p className="text-sm text-amber-600">
                    Currency conversion will apply ({fromAccount.currency} → {recipientCurrency})
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountCIB">{t('dashboard.amount')} ({getCurrencySymbol(fromAccount?.currency || "USD")})</Label>
              <Input
                id="amountCIB"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: e.target.value,
                  })
                }
                className={validationErrors.amount ? "border-red-500" : ""}
              />
              {validationErrors.amount && <p className="text-sm text-red-500">{validationErrors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriptionCIB">{t('dashboard.descriptionOptional')}</Label>
              <Textarea
                id="descriptionCIB"
                placeholder={t('dashboard.whatsThisTransferFor')}
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <Button type="submit" disabled={loading || validatingRecipient || !recipientName} className="w-full">
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
        open={transferStep === "review"}
        onOpenChange={(open) => !open && setTransferStep("form")}
        reviewData={getReviewData()}
        onEdit={() => setTransferStep("form")}
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
            setTransferStep("review");
          }}
          loading={loading}
        />
      )}

      {/* Progress Modal */}
      <TransferProgressModal
        open={transferStep === "progress"}
        onComplete={handleProgressComplete}
        onCancel={handleProgressCancel}
        transferType="internal"
        transferData={{
          amount: parseDecimalAmount(formData.amount),
          recipientName: recipientName || undefined,
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
