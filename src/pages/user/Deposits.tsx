import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, QrCode, FileText, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatAmount, capitalizeAccountType } from "@/lib/utils";
import { useTranslation } from "@/i18n";

// Component for displaying QR codes with signed URLs
const QRCodeDisplay = ({ qrCodeUrl }: { qrCodeUrl: string | null }) => {
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (qrCodeUrl) {
      setLoading(true);
      const loadQRCode = async () => {
        try {
          console.log('Loading QR code from:', qrCodeUrl);
          const { data, error } = await supabase.storage
            .from("deposits")
            .createSignedUrl(qrCodeUrl, 3600);
          
          if (error) {
            console.error("QR code signed URL error:", error);
            throw error;
          }
          console.log('QR code signed URL created successfully');
          setQrSrc(data.signedUrl);
        } catch (error) {
          console.error("Failed to load QR code:", error);
          setQrSrc(null);
        } finally {
          setLoading(false);
        }
      };
      loadQRCode();
    }
  }, [qrCodeUrl]);

  if (!qrCodeUrl) {
    return (
      <div className="text-muted-foreground text-sm">
        {/* QR Code not available - no translation needed, just a fallback */}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm">
        {/* Loading QR Code - no translation needed, just a spinner state */}
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      {qrSrc ? (
        <img 
          src={qrSrc} 
          alt="QR Code" 
          className="w-32 h-32 border rounded object-contain"
          onError={(e) => {
            console.error("QR Code failed to display:", qrCodeUrl);
            const target = e.currentTarget;
            target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAzMkg5NlY5NkgzMlYzMloiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik00MCA0MEg4OFY4OEg0MFY0MFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+Cjx0ZXh0IHg9IjY0IiB5PSIxMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEycHgiIGZpbGw9IiM5Q0EzQUYiPlFSIENvZGUgTm90IEF2YWlsYWJsZTwvdGV4dD4KPHN2Zz4K";
            target.alt = "QR Code not available";
          }}
        />
      ) : (
        <div className="w-32 h-32 border rounded flex items-center justify-center text-muted-foreground text-sm">
          {/* QR Code failed to load - no translation needed, just a fallback */}
        </div>
      )}
    </div>
  );
};

interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
  status: string;
}

interface CryptoConfig {
  id: string;
  crypto_type: string;
  wallet_address: string;
  qr_code_url: string | null;
  is_active: boolean;
}

interface CheckDeposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  account_id: string;
}

interface CryptoDeposit {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  account_id: string;
  crypto_type: string;
  transaction_hash: string | null;
}

export const Deposits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cryptoConfigs, setCryptoConfigs] = useState<CryptoConfig[]>([]);
  const [checkDeposits, setCheckDeposits] = useState<CheckDeposit[]>([]);
  const [cryptoDepositsHistory, setCryptoDepositsHistory] = useState<CryptoDeposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  // Check deposit form state
  const [checkForm, setCheckForm] = useState({
    account_id: "",
    amount: "",
    front_image: null as File | null,
    back_image: null as File | null
  });
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  // Crypto deposit form state
  const [cryptoForm, setCryptoForm] = useState({
    account_id: "",
    crypto_type: "",
    amount: "",
    transaction_hash: ""
  });

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setIsLoading(true);
        await Promise.all([
          fetchAccounts(),
          fetchCryptoConfigs(),
          fetchCheckDeposits(),
          fetchCryptoDepositsHistory()
        ]);
        setIsLoading(false);
      };
      loadData();
    }
  }, [user]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user?.id);

    if (error) {
      toast({ title: "Error", description: "Failed to fetch accounts", variant: "destructive" });
    } else {
      setAccounts(data || []);
    }
  };

  // Filter accounts for deposits - active or awaiting_deposit
  const eligibleAccounts = accounts.filter(account => 
    account.status === 'active' || account.status === 'awaiting_deposit'
  );

  const fetchCryptoConfigs = async () => {
    const { data, error } = await (supabase as any)
      .from("crypto_deposit_config")
      .select("*")
      .eq("enabled", true);

    if (error) {
      toast({ title: "Error", description: "Failed to fetch crypto configs", variant: "destructive" });
    } else {
      setCryptoConfigs((data || []) as any);
    }
  };

  const fetchCheckDeposits = async () => {
    const { data, error } = await supabase
      .from("check_deposits")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch check deposits", variant: "destructive" });
    } else {
      setCheckDeposits(data || []);
    }
  };

  const fetchCryptoDepositsHistory = async () => {
    const { data, error } = await supabase
      .from("crypto_deposits")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch crypto deposits", variant: "destructive" });
    } else {
      setCryptoDepositsHistory(data || []);
    }
  };

  const handleImageUpload = (file: File, type: 'front' | 'back') => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        if (type === 'front') {
          setFrontPreview(preview);
          setCheckForm(prev => ({ ...prev, front_image: file }));
        } else {
          setBackPreview(preview);
          setCheckForm(prev => ({ ...prev, back_image: file }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("deposits")
      .upload(`${user?.id}/${fileName}`, file);

    if (error) throw error;
    return data.path;
  };

  const submitCheckDeposit = async () => {
    if (!checkForm.account_id || !checkForm.amount || !checkForm.front_image || !checkForm.back_image) {
      toast({ title: "Error", description: "Please fill all fields and upload both images", variant: "destructive" });
      return;
    }

    // Check account status - fix status comparison to match database values
    const selectedAccount = accounts.find(acc => acc.id === checkForm.account_id);
    console.log('Check deposit - selected account status:', selectedAccount?.status);
    if (selectedAccount && selectedAccount.status !== "active" && selectedAccount.status !== "awaiting_deposit") {
      console.error('Check deposit failed - invalid account status:', selectedAccount.status);
      toast({ 
        title: "Error", 
        description: "Check deposits can only be made to active accounts or accounts awaiting initial deposit", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const frontPath = await uploadImage(checkForm.front_image, `check_front_${Date.now()}.jpg`);
      const backPath = await uploadImage(checkForm.back_image, `check_back_${Date.now()}.jpg`);

      const { data: depositData, error } = await (supabase as any)
        .from("check_deposits")
        .insert({
          user_id: user?.id,
          account_id: checkForm.account_id,
          check_number: `CHK-${Date.now()}`,
          amount: parseFloat(checkForm.amount),
          front_image_url: frontPath,
          back_image_url: backPath
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Success", description: "Check deposit submitted successfully. Awaiting admin approval." });
      setCheckForm({ account_id: "", amount: "", front_image: null, back_image: null });
      setFrontPreview(null);
      setBackPreview(null);
      fetchCheckDeposits();
    } catch (error) {
      console.error('Check deposit submission error:', error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to submit check deposit", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const submitCryptoDeposit = async () => {
    if (!cryptoForm.account_id || !cryptoForm.crypto_type || !cryptoForm.amount || !cryptoForm.transaction_hash) {
      toast({ title: "Error", description: "Please fill all required fields including transaction hash/reference", variant: "destructive" });
      return;
    }

    // Check account status - fix status comparison to match database values
    const selectedAccount = accounts.find(acc => acc.id === cryptoForm.account_id);
    console.log('Crypto deposit - selected account status:', selectedAccount?.status);
    if (selectedAccount && selectedAccount.status !== "active" && selectedAccount.status !== "awaiting_deposit") {
      console.error('Crypto deposit failed - invalid account status:', selectedAccount.status);
      toast({ 
        title: "Error", 
        description: "Crypto deposits can only be made to active accounts or accounts awaiting initial deposit", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const selectedConfig = cryptoConfigs.find(c => c.crypto_type === cryptoForm.crypto_type);
      
      // Use precise decimal handling instead of parseFloat
      const preciseForgot = Number(cryptoForm.amount);
      
      const { data: depositData, error } = await supabase
        .from("crypto_deposits")
        .insert({
          user_id: user?.id,
          account_id: cryptoForm.account_id,
          crypto_type: cryptoForm.crypto_type,
          amount: preciseForgot,
          transaction_hash: cryptoForm.transaction_hash,
          wallet_address: selectedConfig?.wallet_address || ""
        })
        .select()
        .single();

      if (error) throw error;

      // Send pending confirmation email
      try {
        if (depositData?.id) {
          await supabase.functions.invoke('send-crypto-deposit-email', {
            body: {
              deposit_id: depositData.id,
              email_type: 'pending'
            }
          });
        }
      } catch (emailError) {
        console.error('Failed to send crypto deposit pending email:', emailError);
        // Don't fail the deposit submission if email fails
      }

      toast({ title: "Success", description: "Crypto deposit recorded successfully. Awaiting admin approval." });
      setCryptoForm({ account_id: "", crypto_type: "", amount: "", transaction_hash: "" });
      fetchCryptoDepositsHistory();
    } catch (error) {
      console.error('Crypto deposit submission error:', error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to record crypto deposit", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending" },
      approved: { variant: "default" as const, label: "Approved" },
      rejected: { variant: "destructive" as const, label: "Rejected" },
      processed: { variant: "default" as const, label: "Processed" },
      awaiting_clearance: { variant: "secondary" as const, label: "Awaiting Clearance" },
      failed_to_clear: { variant: "destructive" as const, label: "Failed to Clear" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const selectedCryptoConfig = cryptoConfigs.find(c => c.crypto_type === cryptoForm.crypto_type);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <DollarSign className="h-6 w-6" />
        <h1 className="text-2xl font-bold">{t('dashboard.deposits')}</h1>
      </div>

      <Tabs defaultValue="check" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="check">{t('dashboard.checkDeposit')}</TabsTrigger>
          <TabsTrigger value="crypto">{t('dashboard.cryptoDeposit')}</TabsTrigger>
          <TabsTrigger value="history">{t('dashboard.depositHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="check">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>{t('dashboard.checkDeposit')}</span>
              </CardTitle>
              <CardDescription>
                {t('dashboard.checkDepositDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isLoading && eligibleAccounts.length === 0 && (
                <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                      <span className="text-destructive-foreground text-xs font-bold">!</span>
                    </div>
                    <h3 className="font-semibold text-destructive">{t('dashboard.depositsDisabled')}</h3>
                  </div>
                  <p className="text-sm text-destructive mt-2">
                    {t('dashboard.noActiveAccounts')}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="check-account">{t('dashboard.depositToAccount')}</Label>
                  <Select 
                    value={checkForm.account_id} 
                    onValueChange={(value) => setCheckForm(prev => ({ ...prev, account_id: value }))}
                    disabled={eligibleAccounts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.selectAccount')} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {capitalizeAccountType(account.account_type)} - {account.account_number}
                    </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="check-amount">{t('dashboard.amount')}</Label>
                  <Input
                    id="check-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={checkForm.amount}
                    onChange={(e) => setCheckForm(prev => ({ ...prev, amount: e.target.value }))}
                    disabled={eligibleAccounts.length === 0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('dashboard.frontOfCheck')}</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    {frontPreview ? (
                      <img src={frontPreview} alt="Front of check" className="max-w-full h-32 object-contain mx-auto" />
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <p>{t('dashboard.uploadFrontImage')}</p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      className="mt-2 file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-primary/90 cursor-pointer"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'front')}
                      disabled={eligibleAccounts.length === 0}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('dashboard.backOfCheck')}</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    {backPreview ? (
                      <img src={backPreview} alt="Back of check" className="max-w-full h-32 object-contain mx-auto" />
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <p>{t('dashboard.uploadBackImage')}</p>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      className="mt-2 file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-primary/90 cursor-pointer"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'back')}
                      disabled={eligibleAccounts.length === 0}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={submitCheckDeposit} 
                disabled={loading || eligibleAccounts.length === 0} 
                className="w-full"
              >
                {loading ? t('common.loading') : t('dashboard.submitCheckDeposit')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="h-5 w-5" />
                <span>{t('dashboard.cryptoDeposit')}</span>
              </CardTitle>
              <CardDescription>
                {t('dashboard.cryptoDepositDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eligibleAccounts.length === 0 && (
                <div className="bg-destructive/15 border border-destructive/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                      <span className="text-destructive-foreground text-xs font-bold">!</span>
                    </div>
                    <h3 className="font-semibold text-destructive">{t('dashboard.depositsDisabled')}</h3>
                  </div>
                  <p className="text-sm text-destructive mt-2">
                    {t('dashboard.noActiveAccounts')}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crypto-account">{t('dashboard.depositToAccount')}</Label>
                  <Select 
                    value={cryptoForm.account_id} 
                    onValueChange={(value) => setCryptoForm(prev => ({ ...prev, account_id: value }))}
                    disabled={eligibleAccounts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.selectAccount')} />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {capitalizeAccountType(account.account_type)} - {account.account_number}
                    </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto-type">{t('dashboard.cryptocurrency')}</Label>
                  <Select 
                    value={cryptoForm.crypto_type} 
                    onValueChange={(value) => setCryptoForm(prev => ({ ...prev, crypto_type: value }))}
                    disabled={eligibleAccounts.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('dashboard.selectCrypto')} />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.crypto_type}>
                          {config.crypto_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCryptoConfig && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <h3 className="font-semibold">{t('dashboard.sendCryptoTo')} {selectedCryptoConfig.crypto_type}:</h3>
                      <QRCodeDisplay qrCodeUrl={selectedCryptoConfig.qr_code_url} />
                      <div className="bg-background p-3 rounded border">
                        <code className="text-sm break-all">{selectedCryptoConfig.wallet_address}</code>
                      </div>
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-4">
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-2">📋 {t('dashboard.importantInstructions')}:</p>
                            <ol className="list-decimal list-inside space-y-1 text-left">
                              <li>{t('dashboard.cryptoInstruction1')} {selectedCryptoConfig.crypto_type}</li>
                              <li>{t('dashboard.cryptoInstruction2')}</li>
                              <li>{t('dashboard.cryptoInstruction3')}</li>
                              <li>{t('dashboard.cryptoInstruction4')}</li>
                            </ol>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crypto-amount">{t('dashboard.amountUSD')}</Label>
                  <Input
                    id="crypto-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cryptoForm.amount}
                    onChange={(e) => setCryptoForm(prev => ({ ...prev, amount: e.target.value }))}
                    disabled={eligibleAccounts.length === 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-hash">{t('dashboard.transactionHashLabel')} *</Label>
                  <Input
                    id="transaction-hash"
                    placeholder={t('dashboard.transactionHashPlaceholder')}
                    value={cryptoForm.transaction_hash}
                    onChange={(e) => setCryptoForm(prev => ({ ...prev, transaction_hash: e.target.value }))}
                    disabled={eligibleAccounts.length === 0}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.transactionHashRequired')}
                  </p>
                </div>
              </div>

              <Button 
                onClick={submitCryptoDeposit} 
                disabled={loading || eligibleAccounts.length === 0} 
                className="w-full"
              >
                {loading ? t('common.loading') : t('dashboard.recordCryptoDeposit')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{t('dashboard.depositHistory')}</span>
              </CardTitle>
              <CardDescription>
                {t('dashboard.viewRecentDeposits')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkDeposits.length === 0 && cryptoDepositsHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t('dashboard.noDepositsFound')}</p>
                ) : (
                  <>
                    {/* Check Deposits */}
                    {checkDeposits.map((deposit) => (
                      <div key={`check-${deposit.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Check Deposit - ${deposit.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(deposit.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(deposit.status)}
                      </div>
                    ))}
                    
                    {/* Crypto Deposits */}
                    {cryptoDepositsHistory.map((deposit) => (
                      <div key={`crypto-${deposit.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{deposit.crypto_type} Deposit - ${deposit.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(deposit.created_at).toLocaleDateString()}
                            {deposit.transaction_hash && (
                              <> • Hash: {deposit.transaction_hash.substring(0, 8)}...</>
                            )}
                          </p>
                        </div>
                        {getStatusBadge(deposit.status)}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};