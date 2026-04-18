import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Send, History, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { capitalizeAccountType, formatCurrencyAmount } from "@/lib/utils";
import { TransferReviewModal } from "./TransferReviewModal";
import { TransferProgressModal } from "./TransferProgressModal";
import { TransferConfirmation } from "./TransferConfirmation";
import { TransferLimitExceededModal } from "./TransferLimitExceededModal";
import { AccountBlockedModal } from "./AccountBlockedModal";
import { TransferSecurityCodeModal } from "./TransferSecurityCodeModal";
import { ALLOWED_COUNTRIES, TRANSFER_CURRENCIES } from "@/lib/countries";
import { useTranslation } from "@/i18n";

interface Account {
  id: string;
  account_type: string;
  account_number: string;
  balance: number;
  status: string;
  currency: string;
  transfers_blocked?: boolean;
  transfers_blocked_message?: string | null;
}

interface InternationalTransfer {
  id: string;
  user_id: string;
  from_account_id: string;
  swift_code: string;
  iban?: string;
  correspondent_bank?: string;
  bank_name: string;
  bank_address: string;
  recipient_name: string;
  recipient_address: string;
  amount: number;
  reference_number: string;
  purpose_of_transfer: string;
  priority: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

export const InternationalTransfer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<InternationalTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferStep, setTransferStep] = useState<'form' | 'review' | 'progress' | 'confirmation'>('form');
  const [transferResult, setTransferResult] = useState<any>(null);
  const [hasProcessed, setHasProcessed] = useState(false); // Prevent double processing
  const [formData, setFormData] = useState({
    fromAccount: "",
    swiftCode: "",
    iban: "",
    correspondentBank: "",
    bankName: "",
    bankAddress: "",
    recipientName: "",
    recipientAddress: "",
    recipientAccountNumber: "",
    recipientCountry: "",
    transferCurrency: "",
    amount: "",
    purposeOfTransfer: "",
    priority: "normal"
  });
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Transfer limit state
  const [limitExceededModalOpen, setLimitExceededModalOpen] = useState(false);
  const [limitExceededData, setLimitExceededData] = useState<{
    message: string;
    limit: number;
  } | null>(null);

  // Account blocked state
  const [accountBlockedModalOpen, setAccountBlockedModalOpen] = useState(false);
  const [blockedAccountMessage, setBlockedAccountMessage] = useState("");

  // Security code for transfers state
  const [securityCodeRequired, setSecurityCodeRequired] = useState(false);
  const [showSecurityCodeModal, setShowSecurityCodeModal] = useState(false);

  // Ref to track current form data for async callbacks (prevents stale closure issues)
  const formDataRef = useRef(formData);
  // Ref to track current accounts for async callbacks (prevents stale closure issues)
  const accountsRef = useRef(accounts);
  
  // Keep refs in sync with state
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  
  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchTransfers();
      fetchSecurityCodeSetting();
    }
  }, [user]);

  const fetchSecurityCodeSetting = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('user_security')
        .select('security_code_for_transfers')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSecurityCodeRequired(data?.security_code_for_transfers || false);
    } catch (error) {
      console.error('Error fetching security code setting:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .eq('hidden', false);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch accounts",
        variant: "destructive",
      });
    }
  };

  const fetchTransfers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('foreign_remittances')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers((data || []) as any);
    } catch (error) {
      console.error('Error fetching international transfers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transfer history",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Auto-convert SWIFT code to uppercase and remove non-alphanumeric characters
    if (field === 'swiftCode') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    const required = ['fromAccount', 'swiftCode', 'bankName', 'bankAddress', 'recipientName', 'recipientAddress', 'recipientAccountNumber', 'recipientCountry', 'transferCurrency', 'amount', 'purposeOfTransfer'];
    
    // Check required fields
    required.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        errors[field] = 'This field is required';
      }
    });

    // Validate amount
    const amount = parseFloat(formData.amount);
    if (formData.amount && (isNaN(amount) || amount <= 0)) {
      errors.amount = 'Please enter a valid amount greater than 0';
    }

    // Check sufficient balance
    const selectedAccount = accounts.find(acc => acc.id === formData.fromAccount);
    if (selectedAccount && amount > selectedAccount.balance) {
      errors.amount = 'Your account balance is insufficient for this transfer';
    }

    // Validate SWIFT code format (8 or 11 alphanumeric characters)
    if (formData.swiftCode) {
      const swiftUpper = formData.swiftCode.toUpperCase();
      const swiftLength = swiftUpper.length;
      
      // SWIFT must be 8 or 11 characters
      if (swiftLength !== 8 && swiftLength !== 11) {
        errors.swiftCode = 'SWIFT/BIC code must be 8 or 11 characters';
      }
      // First 6 characters must be letters (Bank code + Country code)
      else if (!/^[A-Z]{6}/.test(swiftUpper)) {
        errors.swiftCode = 'First 6 characters must be letters (Bank + Country code)';
      }
      // Remaining characters must be alphanumeric
      else if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swiftUpper)) {
        errors.swiftCode = 'Invalid SWIFT/BIC code format';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Check if account is blocked for transfers
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
    const amount = parseFloat(formData.amount);
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
      setTransferStep('progress');
    }
  };

  const handleSecurityCodeVerified = () => {
    setShowSecurityCodeModal(false);
    // Just start the progress animation, don't process yet
    setTransferStep('progress');
  };

  const processTransfer = async (): Promise<boolean> => {
    setLoading(true);
    // Note: transferStep is already 'progress' from handleReviewConfirm/handleSecurityCodeVerified
    
    // Use ref to get current form data - prevents stale closure issues with async callbacks
    const currentFormData = formDataRef.current;
    
    try {
      const amount = parseFloat(currentFormData.amount);

      console.log('Processing international transfer:', {
        user_id: user?.id,
        from_account_id: currentFormData.fromAccount,
        amount: amount,
        recipient_name: currentFormData.recipientName
      });

      // Call the secure database function to process the transfer
      const { data, error } = await (supabase as any)
        .rpc('process_international_transfer', {
          p_user_id: user?.id,
          p_account_id: currentFormData.fromAccount,
          p_amount: parseFloat(currentFormData.amount),
          p_recipient_name: currentFormData.recipientName,
          p_recipient_account: currentFormData.recipientAccountNumber,
          p_bank_name: currentFormData.bankName,
          p_recipient_country: currentFormData.recipientCountry,
          p_currency: currentFormData.transferCurrency,
          p_purpose: currentFormData.purposeOfTransfer || null,
          p_swift_code: currentFormData.swiftCode || null,
          p_iban: currentFormData.iban || null,
          p_correspondent_bank: currentFormData.correspondentBank || null,
          p_bank_address: currentFormData.bankAddress || null,
          p_recipient_address: currentFormData.recipientAddress || null,
          p_priority: currentFormData.priority || 'normal'
        });

      if (error) {
        console.error('Transfer processing error:', error);
        throw new Error(error.message || 'Failed to process transfer');
      }

      // Type guard for the response data
      const responseData = data as any;
      if (!responseData?.success) {
        throw new Error(responseData?.error || 'Transfer failed');
      }

      console.log('Transfer created successfully - amount debited from account:', data);

      // Use ref to get current accounts (prevents stale closure issues)
      const currentAccounts = accountsRef.current;
      const fromAccount = currentAccounts.find(acc => acc.id === currentFormData.fromAccount);
      
      // Validate fromAccount exists - throw error if not found to prevent N/A in receipt
      if (!fromAccount) {
        console.error('Source account not found after transfer - accounts ref:', currentAccounts, 'looking for:', currentFormData.fromAccount);
        throw new Error('Source account not found. Please refresh and try again.');
      }
      
      // Build from_account string - fromAccount is now guaranteed to exist
      const fromAccountDisplay = `${capitalizeAccountType(fromAccount.account_type)} - ${fromAccount.account_number}`;

      // Fetch user profile for sender name
      let senderName = '';
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user?.id)
          .single();
        senderName = profileData?.full_name || '';
      } catch (err) {
        console.error('Error fetching profile for receipt:', err);
      }
      
      setTransferResult({
        referenceNumber: responseData.reference_number,
        amount: parseFloat(currentFormData.amount),
        fromAccount: fromAccountDisplay,
        recipientName: currentFormData.recipientName,
        recipientAccount: currentFormData.recipientAccountNumber,
        bankName: currentFormData.bankName,
        bankAddress: currentFormData.bankAddress || undefined,
        correspondentBank: currentFormData.correspondentBank || undefined,
        swiftCode: currentFormData.swiftCode || undefined,
        iban: currentFormData.iban || undefined,
        recipientAddress: currentFormData.recipientAddress || undefined,
        recipientCountry: currentFormData.recipientCountry,
        description: currentFormData.purposeOfTransfer || undefined,
        currency: currentFormData.transferCurrency,
        timestamp: new Date().toLocaleString(),
        status: 'submitted',
        priority: currentFormData.priority,
        // Sender details for PDF receipt - fromAccount is guaranteed to exist at this point
        senderName: senderName,
        senderAccountNumber: fromAccount.account_number,
        senderAccountType: capitalizeAccountType(fromAccount.account_type),
      });

      // Send email notification for transfer submission
      try {
        await supabase.functions.invoke('send-transfer-notification', {
          body: {
            user_id: user?.id,
            transfer_type: 'international',
            notification_type: 'submitted',
            amount: parseFloat(currentFormData.amount),
            reference_number: responseData.reference_number,
            from_account: fromAccountDisplay,
            recipient_name: currentFormData.recipientName,
            recipient_account: currentFormData.recipientAccountNumber,
            recipient_bank: currentFormData.bankName,
            swift_code: currentFormData.swiftCode || undefined,
            language
          }
        });
        console.log('International transfer submission notification email sent');
      } catch (emailError) {
        console.error('Failed to send transfer notification email:', emailError);
        // Don't fail the transfer if email fails
      }

      // Show success message confirming debit
      toast({
        title: "Transfer Submitted Successfully",
        description: `${formatCurrencyAmount(parseFloat(currentFormData.amount), fromAccount?.currency || 'USD')} has been debited from your account and is pending approval.`,
        variant: "default",
      });

      // Refresh data to show updated balance and transfer history
      console.log('Refreshing accounts and transfers data...');
      await fetchAccounts();
      await fetchTransfers();
      
      return true; // Success
    } catch (error) {
      console.error('Error submitting international transfer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit transfer request",
        variant: "destructive",
      });
      setTransferStep('form');
      return false; // Failed
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fromAccount: "",
      swiftCode: "",
      iban: "",
      correspondentBank: "",
      bankName: "",
      bankAddress: "",
      recipientName: "",
      recipientAddress: "",
      recipientAccountNumber: "",
      recipientCountry: "",
      transferCurrency: "",
      amount: "",
      purposeOfTransfer: "",
      priority: "normal"
    });
    setValidationErrors({});
    setTransferStep('form');
    setTransferResult(null);
    setHasProcessed(false); // Reset processing flag
  };

  // Use a ref for processTransfer to avoid stale closures in the callback
  const processTransferRef = useRef(processTransfer);
  useEffect(() => {
    processTransferRef.current = processTransfer;
  }, [processTransfer]);

  // Memoize to prevent animation restart on re-render
  const handleProgressComplete = useCallback(async () => {
    // Prevent double processing - only process if not already processed
    if (hasProcessed) {
      console.log('Transfer already processed, skipping duplicate call');
      return;
    }
    setHasProcessed(true);
    
    // Now actually process the transfer when progress animation completes
    const success = await processTransferRef.current();
    
    // Only move to confirmation step if transfer succeeded
    // If it failed, processTransfer already set transferStep to 'form'
    if (success) {
      setTransferStep('confirmation');
    }
  }, [hasProcessed]);

  const handleProgressCancel = () => {
    // Reset to form without processing
    setTransferStep('form');
    setHasProcessed(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return '🔴';
      case 'high': return '🟡';
      case 'normal': return '🟢';
      default: return '🟢';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Globe className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-primary">{t('dashboard.internationalTransferTitle')}</h2>
          <p className="text-muted-foreground">{t('dashboard.internationalTransferDesc')}</p>
        </div>
      </div>

      {/* Conditionally render: Form/History Tabs OR Confirmation */}
      {transferStep === 'confirmation' && transferResult ? (
        <TransferConfirmation
          transferType="international"
          transferData={transferResult}
          onReturnToTransfers={resetForm}
          onReturnToDashboard={() => window.location.href = '/dashboard'}
        />
      ) : (
        <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {t('dashboard.createTransfer')}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t('dashboard.transferHistory')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.newInternationalTransfer')}</CardTitle>
              <CardDescription>
                {t('dashboard.newInternationalTransferDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Account Selection */}
                <div className="space-y-2">
                  <Label htmlFor="fromAccount">{t('dashboard.fromAccount')} *</Label>
                  <Select
                    value={formData.fromAccount}
                    onValueChange={(value) => handleInputChange('fromAccount', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.selectAccountToTransfer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {capitalizeAccountType(account.account_type)} - {account.account_number} 
                          ({t('dashboard.balance')}: {formatCurrencyAmount(account.balance, account.currency || 'USD')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hint when no account selected */}
                {!formData.fromAccount && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{t('dashboard.selectSourceAccountToContinue') || 'Please select a source account to continue'}</span>
                  </div>
                )}

                {/* Bank Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="swiftCode">{t('dashboard.swiftBicCode')} *</Label>
                    <Input
                      id="swiftCode"
                      value={formData.swiftCode}
                      onChange={(e) => handleInputChange('swiftCode', e.target.value)}
                      placeholder="e.g., CHASUS33 or CHASUS33XXX"
                      className={validationErrors.swiftCode ? 'border-red-500' : ''}
                      maxLength={11}
                      disabled={!formData.fromAccount}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.swiftCodeFormat')}
                    </p>
                    {validationErrors.swiftCode && (
                      <p className="text-sm text-red-500">{validationErrors.swiftCode}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iban">{t('dashboard.ibanIfApplicable')}</Label>
                    <Input
                      id="iban"
                      value={formData.iban}
                      onChange={(e) => handleInputChange('iban', e.target.value)}
                      placeholder="e.g., GB29 NWBK 6016 1331 9268 19"
                      disabled={!formData.fromAccount}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="correspondentBank">{t('dashboard.correspondentBank')}</Label>
                  <Textarea
                    id="correspondentBank"
                    value={formData.correspondentBank}
                    onChange={(e) => handleInputChange('correspondentBank', e.target.value)}
                    placeholder={t('dashboard.correspondentBankPlaceholder')}
                    rows={3}
                    disabled={!formData.fromAccount}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">{t('dashboard.recipientBankName')} *</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => handleInputChange('bankName', e.target.value)}
                      placeholder={t('dashboard.recipientBankNamePlaceholder')}
                      className={validationErrors.bankName ? 'border-red-500' : ''}
                      disabled={!formData.fromAccount}
                    />
                    {validationErrors.bankName && (
                      <p className="text-sm text-red-500">{validationErrors.bankName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAddress">{t('dashboard.bankAddress')} *</Label>
                    <Input
                      id="bankAddress"
                      value={formData.bankAddress}
                      onChange={(e) => handleInputChange('bankAddress', e.target.value)}
                      placeholder={t('dashboard.bankAddressPlaceholder')}
                      className={validationErrors.bankAddress ? 'border-red-500' : ''}
                      disabled={!formData.fromAccount}
                    />
                    {validationErrors.bankAddress && (
                      <p className="text-sm text-red-500">{validationErrors.bankAddress}</p>
                    )}
                  </div>
                </div>

                {/* Recipient Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">{t('dashboard.recipientName')} *</Label>
                    <Input
                      id="recipientName"
                      value={formData.recipientName}
                      onChange={(e) => handleInputChange('recipientName', e.target.value)}
                      placeholder={t('dashboard.recipientNamePlaceholder')}
                      className={validationErrors.recipientName ? 'border-red-500' : ''}
                      disabled={!formData.fromAccount}
                    />
                    {validationErrors.recipientName && (
                      <p className="text-sm text-red-500">{validationErrors.recipientName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipientAddress">{t('dashboard.recipientAddress')} *</Label>
                    <Input
                      id="recipientAddress"
                      value={formData.recipientAddress}
                      onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
                      placeholder={t('dashboard.recipientAddressPlaceholder')}
                      className={validationErrors.recipientAddress ? 'border-red-500' : ''}
                      disabled={!formData.fromAccount}
                    />
                    {validationErrors.recipientAddress && (
                      <p className="text-sm text-red-500">{validationErrors.recipientAddress}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientAccountNumber">{t('dashboard.recipientAccountNumber')} *</Label>
                  <Input
                    id="recipientAccountNumber"
                    value={formData.recipientAccountNumber}
                    onChange={(e) => handleInputChange('recipientAccountNumber', e.target.value)}
                    placeholder={t('dashboard.recipientAccountNumberPlaceholder')}
                    className={validationErrors.recipientAccountNumber ? 'border-red-500' : ''}
                    disabled={!formData.fromAccount}
                  />
                  {validationErrors.recipientAccountNumber && (
                    <p className="text-sm text-red-500">{validationErrors.recipientAccountNumber}</p>
                  )}
                </div>

                {/* Recipient Country and Transfer Currency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientCountry">{t('dashboard.recipientCountry')} *</Label>
                    <Select
                      value={formData.recipientCountry}
                      onValueChange={(value) => handleInputChange('recipientCountry', value)}
                      disabled={!formData.fromAccount}
                    >
                      <SelectTrigger className={validationErrors.recipientCountry ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t('dashboard.selectCountry')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {ALLOWED_COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.recipientCountry && (
                      <p className="text-sm text-red-500">{validationErrors.recipientCountry}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transferCurrency">{t('dashboard.transferCurrency')} *</Label>
                    <Select
                      value={formData.transferCurrency}
                      onValueChange={(value) => handleInputChange('transferCurrency', value)}
                      disabled={!formData.fromAccount}
                    >
                      <SelectTrigger className={validationErrors.transferCurrency ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t('dashboard.selectCurrency')} />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSFER_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.transferCurrency && (
                      <p className="text-sm text-red-500">{validationErrors.transferCurrency}</p>
                    )}
                  </div>
                </div>

                {/* Transfer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t('dashboard.amount')} *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="0.00"
                      className={validationErrors.amount ? 'border-red-500' : ''}
                      disabled={!formData.fromAccount}
                    />
                    {validationErrors.amount && (
                      <p className="text-sm text-red-500">{validationErrors.amount}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">{t('dashboard.transferPriority')}</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => handleInputChange('priority', value)}
                      disabled={!formData.fromAccount}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">{t('dashboard.normalPriority')}</SelectItem>
                        <SelectItem value="high">{t('dashboard.highPriority')}</SelectItem>
                        <SelectItem value="urgent">{t('dashboard.urgentPriority')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purposeOfTransfer">{t('dashboard.purposeOfTransfer')} *</Label>
                  <Textarea
                    id="purposeOfTransfer"
                    value={formData.purposeOfTransfer}
                    onChange={(e) => handleInputChange('purposeOfTransfer', e.target.value)}
                    placeholder={t('dashboard.purposeOfTransferPlaceholder')}
                    rows={3}
                    className={validationErrors.purposeOfTransfer ? 'border-red-500' : ''}
                    disabled={!formData.fromAccount}
                  />
                  {validationErrors.purposeOfTransfer && (
                    <p className="text-sm text-red-500">{validationErrors.purposeOfTransfer}</p>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">{t('dashboard.importantInformation')}:</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        <li>{t('dashboard.intlTransferNote1')}</li>
                        <li>{t('dashboard.intlTransferNote2')}</li>
                        <li>{t('dashboard.intlTransferNote3')}</li>
                        <li>{t('dashboard.intlTransferNote4')}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading || !formData.fromAccount}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('dashboard.reviewTransfer')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.internationalTransferHistory')}</CardTitle>
              <CardDescription>
                {t('dashboard.internationalTransferHistoryDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t('dashboard.noInternationalTransfers')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transfers.map((transfer) => (
                    <div key={transfer.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getPriorityIcon(transfer.priority)}</span>
                          <div>
                            <p className="font-medium">{transfer.recipient_name}</p>
                            <p className="text-sm text-muted-foreground">{transfer.bank_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${transfer.amount.toFixed(2)}</p>
                          <Badge className={getStatusColor(transfer.status)}>
                            {transfer.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t('dashboard.reference')}</p>
                          <p className="font-medium">{transfer.reference_number}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('dashboard.swiftBicCode')}</p>
                          <p className="font-medium">{transfer.swift_code}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('dashboard.transferPriority')}</p>
                          <p className="font-medium capitalize">{transfer.priority}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('dashboard.created')}</p>
                          <p className="font-medium">
                            {new Date(transfer.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground text-sm">Purpose</p>
                        <p className="text-sm">{transfer.purpose_of_transfer}</p>
                      </div>
                      
                      {transfer.admin_notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">Admin Notes:</span> {transfer.admin_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      )}

      {/* Review Modal */}
      <TransferReviewModal
        open={transferStep === 'review'}
        onOpenChange={(open) => !open && setTransferStep('form')}
        reviewData={{
          type: 'international',
          fromAccount: accounts.find(acc => acc.id === formData.fromAccount),
          amount: parseFloat(formData.amount),
          description: formData.purposeOfTransfer,
          recipientName: formData.recipientName,
          recipientAccount: formData.recipientAccountNumber,
          recipientAddress: formData.recipientAddress,
          bankName: formData.bankName,
          bankAddress: formData.bankAddress,
          swiftCode: formData.swiftCode,
          iban: formData.iban,
          correspondentBank: formData.correspondentBank,
          purposeOfTransfer: formData.purposeOfTransfer,
          priority: formData.priority
        }}
        onEdit={() => setTransferStep('form')}
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
          transferType="international"
        />
      )}

      {/* Progress Modal */}
      <TransferProgressModal
        open={transferStep === 'progress'}
        onComplete={handleProgressComplete}
        onCancel={handleProgressCancel}
        transferType="international"
        transferData={{
          amount: parseFloat(formData.amount),
          recipientName: formData.recipientName,
          bankName: formData.bankName
        }}
        userId={user?.id}
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
    </div>
  );
};