import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { parseDecimalAmount, formatAmount, capitalizeAccountType, formatCurrencyAmount } from "@/lib/utils";
import { TransferReviewModal } from "./TransferReviewModal";
import { TransferProgressModal } from "./TransferProgressModal";
import { TransferConfirmation } from "./TransferConfirmation";
import { TransferLimitExceededModal } from "./TransferLimitExceededModal";
import { AccountBlockedModal } from "./AccountBlockedModal";
import { TransferSecurityCodeModal } from "./TransferSecurityCodeModal";

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

interface ExternalTransferFormProps {
  accounts: Account[];
  onTransferComplete: () => void;
}

export const ExternalTransferForm = ({ accounts, onTransferComplete }: ExternalTransferFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [transferStep, setTransferStep] = useState<"form" | "review" | "progress" | "confirmation">("form");
  const [transferResult, setTransferResult] = useState<any>(null);
  const [hasProcessed, setHasProcessed] = useState(false); // Prevent double processing
  const [formData, setFormData] = useState({
    fromAccount: "",
    amount: "",
    description: "",
    recipientName: "",
    recipientAccount: "",
    bankName: "",
    routingCode: "",
  });

  // Transfer limit state
  const [limitExceededModalOpen, setLimitExceededModalOpen] = useState(false);
  const [limitExceededData, setLimitExceededData] = useState<{
    message: string;
    limit: number;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Account blocked state
  const [accountBlockedModalOpen, setAccountBlockedModalOpen] = useState(false);
  const [blockedAccountMessage, setBlockedAccountMessage] = useState("");

  // Security code for transfers state
  const [securityCodeRequired, setSecurityCodeRequired] = useState(false);
  const [showSecurityCodeModal, setShowSecurityCodeModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchSecurityCodeSetting();
    }
  }, [user?.id]);

  const fetchSecurityCodeSetting = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from("user_security")
        .select("security_code_for_transfers")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setSecurityCodeRequired(data?.security_code_for_transfers || false);
    } catch (error) {
      console.error("Error fetching security code setting:", error);
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    const required = ["fromAccount", "recipientName", "recipientAccount", "bankName", "routingCode", "amount"];

    // Check required fields
    required.forEach((field) => {
      if (!formData[field as keyof typeof formData]) {
        errors[field] = "This field is required";
      }
    });

    // Validate account number length (up to 20 digits)
    if (formData.recipientAccount && formData.recipientAccount.length > 20) {
      errors.recipientAccount = "Account number cannot exceed 20 digits";
    }

    // Validate amount
    const amount = parseFloat(formData.amount);
    if (formData.amount && (isNaN(amount) || amount <= 0)) {
      errors.amount = "Please enter a valid amount greater than 0";
    }

    // Check sufficient balance
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

    // Check if account is blocked for transfers
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

    if (securityCodeRequired && user?.id) {
      setShowSecurityCodeModal(true);
    } else {
      setTransferStep("progress");
    }
  };

  const handleSecurityCodeVerified = () => {
    setShowSecurityCodeModal(false);
    // Just start the progress animation, don't process yet
    setTransferStep("progress");
  };

  const processTransfer = useCallback(async () => {
    setLoading(true);
    // Note: transferStep is already 'progress' from handleReviewConfirm/handleSecurityCodeVerified

    try {
      const amount = parseDecimalAmount(formData.amount);

      // Use secure database function for external transfer
      const { data, error } = await (supabase as any).rpc("process_external_transfer", {
        p_from_account_id: formData.fromAccount,
        p_amount: amount,
        p_recipient_name: formData.recipientName,
        p_recipient_account: formData.recipientAccount,
        p_recipient_bank: formData.bankName,
        p_routing_code: formData.routingCode,
        p_description: formData.description || `External transfer to ${formData.recipientName}`,
      });

      if (error) throw error;

      if (!data.success) {
        toast({
          title: "Transfer Failed",
          description: data.error,
          variant: "destructive",
        });
        setTransferStep("form");
        return;
      }

      // Store transfer result for confirmation page (pending admin approval)
      const fromAccount = accounts.find((acc) => acc.id === formData.fromAccount);

      setTransferResult({
        referenceNumber: data.reference_number || `EXT-${Date.now()}`,
        amount: amount,
        fromAccount: `${capitalizeAccountType(fromAccount?.account_type || '')} - ${fromAccount?.account_number}`,
        recipientName: formData.recipientName,
        recipientAccount: formData.recipientAccount,
        bankName: formData.bankName,
        routingCode: formData.routingCode,
        timestamp: new Date().toLocaleString(),
        status: "pending",
        description: formData.description || undefined,
        message: data.message || "Transfer submitted for admin approval",
      });

      // Send email notification for transfer submission
      try {
        await supabase.functions.invoke('send-transfer-notification', {
          body: {
            user_id: user?.id,
            transfer_type: 'domestic',
            notification_type: 'submitted',
            amount: amount,
            reference_number: data.reference_number || `EXT-${Date.now()}`,
            from_account: `${capitalizeAccountType(fromAccount?.account_type || '')} - ${fromAccount?.account_number}`,
            recipient_name: formData.recipientName,
            recipient_account: formData.recipientAccount,
            recipient_bank: formData.bankName,
            routing_code: formData.routingCode,
            language
          }
        });
        console.log('Transfer submission notification email sent');
      } catch (emailError) {
        console.error('Failed to send transfer notification email:', emailError);
        // Don't fail the transfer if email fails
      }

      // Show account debit toast notification
      toast({
        title: "Account Debited",
        description: `${formatCurrencyAmount(amount, fromAccount?.currency || 'USD')} has been debited from your account pending admin approval.`,
      });

      // Transition to confirmation page
      setTransferStep("confirmation");
    } catch (error) {
      console.error("Error processing external transfer:", error);
      toast({
        title: "Transfer Failed",
        description: "Unable to process transfer. Please try again.",
        variant: "destructive",
      });
      setTransferStep("form");
    } finally {
      setLoading(false);
    }
  }, [formData, accounts, user?.id, language, toast]);

  // Memoize to prevent animation restart on re-render
  const handleProgressComplete = useCallback(async () => {
    // Prevent double processing - only process if not already processed
    if (hasProcessed) return;
    setHasProcessed(true);

    // Now actually process the transfer when progress animation completes
    await processTransfer();
  }, [hasProcessed, processTransfer]);

  const handleProgressCancel = () => {
    // Reset to form without processing
    setTransferStep("form");
    setHasProcessed(false);
  };

  const resetForm = () => {
    setFormData({
      fromAccount: "",
      amount: "",
      description: "",
      recipientName: "",
      recipientAccount: "",
      bankName: "",
      routingCode: "",
    });
    setValidationErrors({});
    setTransferStep("form");
    setTransferResult(null);
    setHasProcessed(false); // Reset processing flag
    onTransferComplete();
  };

  const getReviewData = () => {
    const fromAccount = accounts.find((acc) => acc.id === formData.fromAccount);

    return {
      type: "external" as const,
      fromAccount,
      amount: parseDecimalAmount(formData.amount),
      description: formData.description,
      recipientName: formData.recipientName,
      recipientAccount: formData.recipientAccount,
      bankName: formData.bankName,
      routingCode: formData.routingCode,
    };
  };

  // Show confirmation page
  if (transferStep === "confirmation" && transferResult) {
    return (
      <TransferConfirmation
        transferType="external"
        transferData={transferResult}
        onReturnToTransfers={resetForm}
        onReturnToDashboard={resetForm}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('dashboard.externalTransfer')}
          </CardTitle>
          <CardDescription>{t('dashboard.externalTransferDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromAccountExt">{t('dashboard.fromAccount')}</Label>
              <Select
                value={formData.fromAccount}
                onValueChange={(value) => setFormData({ ...formData, fromAccount: value })}
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
                <Label htmlFor="recipientName">{t('dashboard.recipientName')}</Label>
                <Input
                  id="recipientName"
                  placeholder="John Doe"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className={validationErrors.recipientName ? "border-red-500" : ""}
                />
                {validationErrors.recipientName && (
                  <p className="text-sm text-red-500">{validationErrors.recipientName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientAccount">{t('dashboard.recipientAccountNumber')} ({t('dashboard.recipientAccountNumberDesc')})</Label>
                <Input
                  id="recipientAccount"
                  placeholder="12345678901234567890"
                  maxLength={20}
                  value={formData.recipientAccount}
                  onChange={(e) => setFormData({ ...formData, recipientAccount: e.target.value })}
                  className={validationErrors.recipientAccount ? "border-red-500" : ""}
                />
                {validationErrors.recipientAccount && (
                  <p className="text-sm text-red-500">{validationErrors.recipientAccount}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">{t('dashboard.bankName')}</Label>
                <Input
                  id="bankName"
                  placeholder="Bank of America"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className={validationErrors.bankName ? "border-red-500" : ""}
                />
                {validationErrors.bankName && <p className="text-sm text-red-500">{validationErrors.bankName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="routingCode">{t('dashboard.routingCode')}</Label>
                <Input
                  id="routingCode"
                  placeholder="021000322"
                  value={formData.routingCode}
                  onChange={(e) => setFormData({ ...formData, routingCode: e.target.value })}
                  className={validationErrors.routingCode ? "border-red-500" : ""}
                />
                {validationErrors.routingCode && <p className="text-sm text-red-500">{validationErrors.routingCode}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountExt">{t('dashboard.amount')}</Label>
              <Input
                id="amountExt"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className={validationErrors.amount ? "border-red-500" : ""}
              />
              {validationErrors.amount && <p className="text-sm text-red-500">{validationErrors.amount}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriptionExt">{t('dashboard.descriptionOptional')}</Label>
              <Textarea
                id="descriptionExt"
                placeholder={t('dashboard.whatsThisTransferFor')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">{t('dashboard.manualApprovalRequired')}</p>
                  <p>
                    {t('dashboard.manualApprovalDesc')}
                  </p>
                </div>
              </div>
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
        open={transferStep === "review"}
        onOpenChange={(open) => !open && setTransferStep("form")}
        reviewData={getReviewData()}
        onEdit={() => setTransferStep("form")}
        onConfirm={handleReviewConfirm}
        loading={loading}
      />

      {/* Security Code Modal */}
      {user?.id && (
        <TransferSecurityCodeModal
          open={showSecurityCodeModal}
          onVerified={handleSecurityCodeVerified}
          onCancel={() => setShowSecurityCodeModal(false)}
          userId={user.id}
          transferType="domestic"
        />
      )}

      {/* Progress Modal */}
      <TransferProgressModal
        open={transferStep === "progress"}
        onComplete={handleProgressComplete}
        onCancel={handleProgressCancel}
        transferType="external"
        transferData={{
          amount: parseDecimalAmount(formData.amount),
          recipientName: formData.recipientName,
          bankName: formData.bankName,
        }}
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

      {/* Account Blocked Modal */}
      <AccountBlockedModal
        isOpen={accountBlockedModalOpen}
        onClose={() => setAccountBlockedModalOpen(false)}
        message={blockedAccountMessage}
      />
    </>
  );
};
