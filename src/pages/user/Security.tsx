import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Key, AlertTriangle, CheckCircle, Lock, Download, Smartphone, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSecurityCode } from "@/hooks/useSecurityCode";
import { useTranslation } from "@/i18n";

interface SecuritySettings {
  two_factor_enabled: boolean;
  email_2fa_enabled: boolean;
  last_login: string;
  login_attempts: number;
  account_locked: boolean;
}


export const Security = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    two_factor_enabled: false,
    email_2fa_enabled: false,
    last_login: '',
    login_attempts: 0,
    account_locked: false
  });
  const [email2faLoading, setEmail2faLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Security Code states
  const { 
    loading: securityCodeLoading,
    fetchSecuritySettings: fetchSecCodeSettings,
    toggleSecurityCode,
    toggleSecurityCodeForTransfers,
    updateSecurityCode,
    generateBackupCodes,
    downloadBackupCodes
  } = useSecurityCode();
  
  const [securityCodeSettings, setSecurityCodeSettings] = useState({
    enabled: false,
    forTransfers: false,
    lastUpdated: null as string | null
  });
  const [showEmail2FAConfirmDialog, setShowEmail2FAConfirmDialog] = useState(false);
  const [showSecurityCodeConfirmDialog, setShowSecurityCodeConfirmDialog] = useState(false);
  const [securityCodeForm, setSecurityCodeForm] = useState({
    oldCode: '',
    newCode: '',
    confirmCode: ''
  });
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSecuritySettings();
      loadSecurityCodeSettings();
    }
  }, [user]);

  const loadSecurityCodeSettings = async () => {
    if (!user?.id) return;
    
    const settings = await fetchSecCodeSettings(user.id);
    if (settings) {
      setSecurityCodeSettings({
        enabled: settings.securityCodeEnabled,
        forTransfers: settings.securityCodeForTransfers,
        lastUpdated: settings.lastUpdated
      });
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_security')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no record exists, create one
      if (!data) {
        const { error: insertError } = await (supabase as any)
          .from('user_security')
          .insert({
            user_id: user?.id,
            two_factor_enabled: false,
            security_code_enabled: false,
            account_locked: false,
            login_attempts: 0
          });

        if (insertError) throw insertError;
        
        // Fetch again after creation
        const { data: newData } = await (supabase as any)
          .from('user_security')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle();
          
        if (newData) {
          setSecuritySettings({
            two_factor_enabled: newData.two_factor_enabled || false,
            email_2fa_enabled: newData.email_2fa_enabled || false,
            last_login: newData.last_login || '',
            login_attempts: newData.login_attempts || 0,
            account_locked: newData.account_locked || false
          });
        }
      } else {
        setSecuritySettings({
          two_factor_enabled: data.two_factor_enabled || false,
          email_2fa_enabled: data.email_2fa_enabled || false,
          last_login: data.last_login || '',
          login_attempts: data.login_attempts || 0,
          account_locked: data.account_locked || false
        });
      }
    } catch (error) {
      console.error('Error fetching security settings:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('user_security')
        .upsert({
          user_id: user?.id,
          two_factor_enabled: enabled
        });

      if (error) throw error;

      setSecuritySettings(prev => ({
        ...prev,
        two_factor_enabled: enabled
      }));

      toast({
        title: enabled ? "Two-Factor Authentication Enabled" : "Two-Factor Authentication Disabled",
        description: enabled 
          ? "Your account is now more secure with 2FA enabled." 
          : "Two-factor authentication has been disabled.",
      });
    } catch (error) {
      console.error('Error updating 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to update two-factor authentication settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Email 2FA toggle handler
  const handleEmail2FAToggle = async (enabled: boolean) => {
    if (!user?.id) return;
    
    // If enabling Email 2FA and security code is enabled, show confirmation dialog
    if (enabled && securityCodeSettings.enabled) {
      setShowEmail2FAConfirmDialog(true);
      return;
    }
    
    // If disabling or security code not enabled, proceed normally
    await performEmail2FAToggle(enabled);
  };

  const performEmail2FAToggle = async (enabled: boolean) => {
    if (!user?.id) return;
    
    setEmail2faLoading(true);
    try {
      const { error } = await supabase
        .from('user_security')
        .upsert({
          user_id: user.id,
          email_2fa_enabled: enabled
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setSecuritySettings(prev => ({
        ...prev,
        email_2fa_enabled: enabled
      }));

      toast({
        title: enabled ? "Email 2FA Enabled" : "Email 2FA Disabled",
        description: enabled 
          ? "You will receive a verification code via email when logging in." 
          : "Email two-factor authentication has been disabled.",
      });
    } catch (error) {
      console.error('Error updating email 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to update email 2FA settings.",
        variant: "destructive",
      });
    } finally {
      setEmail2faLoading(false);
    }
  };

  const handleConfirmEmail2FA = async () => {
    setShowEmail2FAConfirmDialog(false);
    
    // First disable security code for authentication
    if (user?.id) {
      await toggleSecurityCode(user.id, false);
      setSecurityCodeSettings(prev => ({ ...prev, enabled: false }));
    }
    
    // Then enable email 2FA
    await performEmail2FAToggle(true);
  };

  // Security Code handlers
  const handleSecurityCodeToggle = async (enabled: boolean) => {
    if (!user?.id) return;

    // If enabling Security Code and Email 2FA is enabled, show confirmation dialog
    if (enabled && securitySettings.email_2fa_enabled) {
      setShowSecurityCodeConfirmDialog(true);
      return;
    }

    // If disabling or Email 2FA not enabled, proceed normally
    await performSecurityCodeToggle(enabled);
  };

  const performSecurityCodeToggle = async (enabled: boolean) => {
    if (!user?.id) return;

    const result = await toggleSecurityCode(user.id, enabled);
    if (result.success) {
      setSecurityCodeSettings(prev => ({ ...prev, enabled }));
      loadSecurityCodeSettings();
    }
  };

  const handleConfirmSecurityCode = async () => {
    setShowSecurityCodeConfirmDialog(false);
    
    // First disable Email 2FA
    await performEmail2FAToggle(false);
    
    // Then enable Security Code
    await performSecurityCodeToggle(true);
  };

  const handleTransfersSecurityCodeToggle = async (enabled: boolean) => {
    if (!user?.id) return;

    const result = await toggleSecurityCodeForTransfers(user.id, enabled);
    if (result.success) {
      setSecurityCodeSettings(prev => ({ ...prev, forTransfers: enabled }));
    }
  };

  const handleUpdateSecurityCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (securityCodeForm.newCode !== securityCodeForm.confirmCode) {
      toast({
        title: "Error",
        description: "Security codes do not match.",
        variant: "destructive",
      });
      return;
    }

    if (securityCodeForm.newCode.length !== 6) {
      toast({
        title: "Error",
        description: "Security code must be exactly 6 digits.",
        variant: "destructive",
      });
      return;
    }

    const result = await updateSecurityCode(
      user.id, 
      securityCodeSettings.enabled ? securityCodeForm.oldCode : null, 
      securityCodeForm.newCode
    );

    if (result.success) {
      setSecurityCodeForm({ oldCode: '', newCode: '', confirmCode: '' });
      loadSecurityCodeSettings();
    }
  };

  const handleGenerateBackupCodes = async () => {
    if (!user?.id) return;

    const result = await generateBackupCodes(user.id);
    if (result.success && result.codes) {
      setBackupCodes(result.codes);
      setShowBackupCodes(true);
    }
  };

  const handleDownloadBackupCodes = () => {
    downloadBackupCodes(backupCodes);
    setShowBackupCodes(false);
    setBackupCodes([]);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{t('dashboard.securitySettings')}</h1>
        <p className="text-muted-foreground">{t('dashboard.securitySettingsDesc')}</p>
      </div>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="password">{t('dashboard.password')}</TabsTrigger>
          <TabsTrigger value="two-factor">{t('dashboard.twoFactorAuth')}</TabsTrigger>
          <TabsTrigger value="security-code">{t('dashboard.securityCode')}</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('dashboard.changePassword')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.changePasswordDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">{t('dashboard.currentPassword')}</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder={t('dashboard.enterCurrentPassword')}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('dashboard.newPassword')}</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder={t('dashboard.enterNewPassword')}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.passwordRequirements')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('dashboard.confirmNewPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t('dashboard.confirmNewPasswordPlaceholder')}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('dashboard.updating')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t('dashboard.updatePassword')}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="two-factor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('dashboard.twoFactorAuthentication')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.twoFactorAuthDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email 2FA */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">{t('dashboard.emailAuthenticationTitle')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.emailAuthenticationDesc')}
                  </p>
                </div>
                <Switch
                  checked={securitySettings.email_2fa_enabled}
                  onCheckedChange={handleEmail2FAToggle}
                  disabled={email2faLoading}
                />
              </div>

              {securitySettings.email_2fa_enabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">{t('dashboard.email2faActive')}</p>
                      <p>{t('dashboard.email2faActiveDesc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS 2FA */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">{t('dashboard.smsAuthentication')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.smsAuthenticationDesc')}
                  </p>
                </div>
                <Switch
                  checked={securitySettings.two_factor_enabled}
                  onCheckedChange={handleTwoFactorToggle}
                  disabled={loading}
                />
              </div>

              {securitySettings.two_factor_enabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">{t('dashboard.sms2faActive')}</p>
                      <p>{t('dashboard.sms2faActiveDesc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {!securitySettings.two_factor_enabled && !securitySettings.email_2fa_enabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">{t('dashboard.twoFactorDisabled')}</p>
                      <p>{t('dashboard.twoFactorDisabledDesc')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.securityRecommendations')}</CardTitle>
              <CardDescription>
                {t('dashboard.securityRecommendationsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{t('dashboard.strongPassword')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.strongPasswordDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{t('dashboard.regularUpdates')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.regularUpdatesDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{t('dashboard.secureConnections')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.secureConnectionsDesc')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security-code" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {t('dashboard.securityCodeSettings')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.securityCodeSettingsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium">{t('dashboard.securityCodeAuth')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.securityCodeAuthDesc')}
                  </p>
                  {securityCodeSettings.lastUpdated && (
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.lastUpdated')}: {new Date(securityCodeSettings.lastUpdated).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Switch
                  checked={securityCodeSettings.enabled}
                  onCheckedChange={handleSecurityCodeToggle}
                  disabled={securityCodeLoading}
                />
              </div>

              {securityCodeSettings.enabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">{t('dashboard.securityCodeActive')}</p>
                      <p>{t('dashboard.securityCodeActiveDesc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Code for Transfers Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">{t('dashboard.useCodeForTransfers')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.useCodeForTransfersDesc')}
                  </p>
                </div>
                <Switch
                  checked={securityCodeSettings.forTransfers}
                  onCheckedChange={handleTransfersSecurityCodeToggle}
                  disabled={securityCodeLoading}
                />
              </div>

              {securityCodeSettings.forTransfers && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">{t('dashboard.transferSecurityCodeActive')}</p>
                      <p>{t('dashboard.transferSecurityCodeActiveDesc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {!securityCodeSettings.enabled && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">{t('dashboard.securityCodeDisabled')}</p>
                      <p>{t('dashboard.securityCodeDisabledDesc')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Security Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {securityCodeSettings.enabled ? t('dashboard.changeSecurityCodeTitle') : t('dashboard.setSecurityCodeTitle')}
              </CardTitle>
              <CardDescription>
                {securityCodeSettings.enabled 
                  ? t('dashboard.updateExistingCode') 
                  : t('dashboard.createNewCode')
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSecurityCode} className="space-y-4">
                {securityCodeSettings.enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="oldSecurityCode">{t('dashboard.currentSecurityCode')}</Label>
                    <InputOTP
                      maxLength={6}
                      value={securityCodeForm.oldCode}
                      onChange={(value) => setSecurityCodeForm({...securityCodeForm, oldCode: value})}
                      type="password"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newSecurityCode">{t('dashboard.newSecurityCode')}</Label>
                  <InputOTP
                    maxLength={6}
                    value={securityCodeForm.newCode}
                    onChange={(value) => setSecurityCodeForm({...securityCodeForm, newCode: value})}
                    type="password"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.securityCodeHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmSecurityCode">{t('dashboard.confirmSecurityCode')}</Label>
                  <InputOTP
                    maxLength={6}
                    value={securityCodeForm.confirmCode}
                    onChange={(value) => setSecurityCodeForm({...securityCodeForm, confirmCode: value})}
                    type="password"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button type="submit" disabled={securityCodeLoading} className="w-full">
                  {securityCodeLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('dashboard.updating')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {securityCodeSettings.enabled ? t('dashboard.updateSecurityCodeBtn') : t('dashboard.setSecurityCodeBtn')}
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Backup Codes */}
          {securityCodeSettings.enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {t('dashboard.backupCodesTitle')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.backupCodesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showBackupCodes ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.backupCodesInfo')}
                    </p>
                    <Button 
                      onClick={handleGenerateBackupCodes} 
                      disabled={securityCodeLoading}
                      variant="outline"
                    >
                      {securityCodeLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          {t('dashboard.generating')}
                        </div>
                      ) : (
                        t('dashboard.generateBackupCodes')
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 font-medium mb-2">
                        {t('dashboard.saveBackupCodesWarning')}
                      </p>
                      <p className="text-sm text-yellow-700">
                        {t('dashboard.backupCodesOnceUse')}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 font-mono text-sm bg-gray-50 p-4 rounded-lg">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{index + 1}.</span>
                          <span className="font-bold">{code}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleDownloadBackupCodes} className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        {t('dashboard.downloadCodes')}
                      </Button>
                      <Button 
                        onClick={() => {
                          setShowBackupCodes(false);
                          setBackupCodes([]);
                        }} 
                        variant="outline"
                      >
                        {t('dashboard.done')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Email 2FA Confirmation Dialog */}
      <Dialog open={showEmail2FAConfirmDialog} onOpenChange={setShowEmail2FAConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Enable Email Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enabling Email 2FA will disable Security Code authentication for login. 
              You can only use one authentication method at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Your security code will no longer be required when 
              logging in. Instead, you'll receive a verification code via email.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmail2FAConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmEmail2FA}>
              OK, Enable Email 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Code Confirmation Dialog */}
      <Dialog open={showSecurityCodeConfirmDialog} onOpenChange={setShowSecurityCodeConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Enable Security Code Authentication
            </DialogTitle>
            <DialogDescription>
              Enabling Security Code authentication will disable Email 2FA for login. 
              You can only use one authentication method at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> You will no longer receive verification codes via email 
              when logging in. Instead, you'll need to enter your security code.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSecurityCodeConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSecurityCode}>
              OK, Enable Security Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};