import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, X, Eye, EyeOff, Mail, Server, TestTube, FileText, ChevronDown, AlertTriangle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { generateTransferReceipt } from '@/lib/transferReceiptGenerator';

export const WebsiteSettings = () => {
  const { settings, updateSettings, isLoading } = useWebsiteSettings();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isReceiptSettingsOpen, setIsReceiptSettingsOpen] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [formData, setFormData] = useState({
    bankName: '',
    bankAddress: '',
    bankPhone: '',
    contactEmail: '',
    emailAlertsEnabled: true,
    authEmailsEnabled: true,
    showNavigationMenu: true,
    websiteVisibility: true,
    showKycPage: true,
    // Email Provider Settings
    resendEnabled: false,
    smtpEnabled: true,
    smtpHost: '',
    smtpPort: 465,
    smtpUsername: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: '',
    smtpUseSsl: true,
    // Receipt Customization Settings
    receiptHeaderColor: '#003366',
    receiptAccentColor: '#22c55e',
    receiptTitle: 'Transfer Confirmation Receipt',
    receiptShowLogo: true,
    receiptShowWatermark: false,
    receiptWatermarkText: 'COPY',
    receiptFooterDisclaimer: 'This is a computer-generated receipt and is valid without signature.',
    receiptCustomMessage: '',
    receiptReferencePrefix: 'TXN',
    // Login Alert Settings
    loginAlertsEnabled: false,
    loginAlertEmail: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [footerLogoFile, setFooterLogoFile] = useState<File | null>(null);
  const [consoleLogoFile, setConsoleLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [footerLogoPreview, setFooterLogoPreview] = useState<string | null>(null);
  const [consoleLogoPreview, setConsoleLogoPreview] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [faviconRemoved, setFaviconRemoved] = useState(false);
  const [footerLogoRemoved, setFooterLogoRemoved] = useState(false);
  const [consoleLogoRemoved, setConsoleLogoRemoved] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const footerLogoInputRef = useRef<HTMLInputElement>(null);
  const consoleLogoInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      // Guard: Don't overwrite form data with stale defaults if admin settings failed to load
      // If all admin-controlled email settings are false, this likely means the admin RPC failed
      // and we have stale defaults - skip update to preserve form state
      const looksLikeStaleDefaults = !settings.smtpEnabled && !settings.resendEnabled && !settings.emailAlertsEnabled;
      const formHasValidConfig = formData.smtpEnabled || formData.resendEnabled;
      
      // Skip if settings appear to be stale defaults but form already has a valid provider config
      if (looksLikeStaleDefaults && formHasValidConfig) {
        console.warn('Skipping form update: settings appear to be stale defaults (all email settings false)');
        return;
      }
      
      setFormData({
        bankName: settings.bankName,
        bankAddress: settings.bankAddress,
        bankPhone: settings.bankPhone,
        contactEmail: settings.contactEmail,
        emailAlertsEnabled: settings.emailAlertsEnabled,
        authEmailsEnabled: settings.authEmailsEnabled,
        showNavigationMenu: settings.showNavigationMenu,
        websiteVisibility: settings.websiteVisibility,
        showKycPage: settings.showKycPage,
        // Email Provider Settings
        resendEnabled: settings.resendEnabled,
        smtpEnabled: settings.smtpEnabled,
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort || 465,
        smtpUsername: settings.smtpUsername || '',
        smtpPassword: settings.smtpPassword || '',
        smtpFromEmail: settings.smtpFromEmail || '',
        smtpFromName: settings.smtpFromName || '',
        smtpUseSsl: settings.smtpUseSsl,
        // Receipt Customization Settings
        receiptHeaderColor: settings.receiptHeaderColor || '#003366',
        receiptAccentColor: settings.receiptAccentColor || '#22c55e',
        receiptTitle: settings.receiptTitle || 'Transfer Confirmation Receipt',
        receiptShowLogo: settings.receiptShowLogo ?? true,
        receiptShowWatermark: settings.receiptShowWatermark ?? false,
        receiptWatermarkText: settings.receiptWatermarkText || 'COPY',
        receiptFooterDisclaimer: settings.receiptFooterDisclaimer || 'This is a computer-generated receipt and is valid without signature.',
        receiptCustomMessage: settings.receiptCustomMessage || '',
        receiptReferencePrefix: settings.receiptReferencePrefix || 'TXN',
        // Login Alert Settings
        loginAlertsEnabled: settings.loginAlertsEnabled ?? false,
        loginAlertEmail: settings.loginAlertEmail || '',
      });
      
      // Set test email to contact email by default
      if (!testEmail && settings.contactEmail) {
        setTestEmail(settings.contactEmail);
      }
      
      // Only set preview URLs if not explicitly removed by user and no new file selected
      if (settings.logoUrl && !logoRemoved && !logoFile) {
        setLogoPreview(settings.logoUrl);
      }
      if (settings.faviconUrl && !faviconRemoved && !faviconFile) {
        setFaviconPreview(settings.faviconUrl);
      }
      if (settings.footerLogoUrl && !footerLogoRemoved && !footerLogoFile) {
        setFooterLogoPreview(settings.footerLogoUrl);
      }
      if (settings.consoleLogoUrl && !consoleLogoRemoved && !consoleLogoFile) {
        setConsoleLogoPreview(settings.consoleLogoUrl);
      }
    }
  }, [settings, logoRemoved, faviconRemoved, footerLogoRemoved, consoleLogoRemoved, logoFile, faviconFile, footerLogoFile, consoleLogoFile]);

  // Autosave function for toggle switches - passes complete form data to prevent overwriting
  const autoSaveToggle = async (updatedFormData: typeof formData) => {
    // Guard: Don't autosave if settings context has stale/default values
    // If both providers are disabled in settings but form has one enabled, skip save
    const settingsHasProvider = settings?.smtpEnabled || settings?.resendEnabled;
    const formHasProvider = updatedFormData.smtpEnabled || updatedFormData.resendEnabled;
    
    if (!settingsHasProvider && formHasProvider) {
      console.warn('Skipping autosave: settings context may have stale admin data');
      return;
    }
    
    setIsAutoSaving(true);
    try {
      await updateSettings({
        bankName: updatedFormData.bankName,
        bankAddress: updatedFormData.bankAddress,
        bankPhone: updatedFormData.bankPhone,
        contactEmail: updatedFormData.contactEmail,
        logoUrl: settings?.logoUrl,
        faviconUrl: settings?.faviconUrl,
        footerLogoUrl: settings?.footerLogoUrl,
        consoleLogoUrl: settings?.consoleLogoUrl,
        emailAlertsEnabled: updatedFormData.emailAlertsEnabled,
        authEmailsEnabled: updatedFormData.authEmailsEnabled,
        showNavigationMenu: updatedFormData.showNavigationMenu,
        websiteVisibility: updatedFormData.websiteVisibility,
        showKycPage: updatedFormData.showKycPage,
        resendEnabled: updatedFormData.resendEnabled,
        smtpEnabled: updatedFormData.smtpEnabled,
        smtpHost: updatedFormData.smtpHost,
        smtpPort: updatedFormData.smtpPort,
        smtpUsername: updatedFormData.smtpUsername,
        smtpPassword: updatedFormData.smtpPassword,
        smtpFromEmail: updatedFormData.smtpFromEmail,
        smtpFromName: updatedFormData.smtpFromName,
        smtpUseSsl: updatedFormData.smtpUseSsl,
        receiptHeaderColor: updatedFormData.receiptHeaderColor,
        receiptAccentColor: updatedFormData.receiptAccentColor,
        receiptTitle: updatedFormData.receiptTitle,
        receiptShowLogo: updatedFormData.receiptShowLogo,
        receiptShowWatermark: updatedFormData.receiptShowWatermark,
        receiptWatermarkText: updatedFormData.receiptWatermarkText,
        receiptFooterDisclaimer: updatedFormData.receiptFooterDisclaimer,
        receiptCustomMessage: updatedFormData.receiptCustomMessage,
        receiptReferencePrefix: updatedFormData.receiptReferencePrefix,
        loginAlertsEnabled: updatedFormData.loginAlertsEnabled,
        loginAlertEmail: updatedFormData.loginAlertEmail || null,
      });
      toast({
        title: 'Setting Saved',
        description: 'Your change has been saved automatically.',
      });
    } catch (error) {
      console.error('Autosave failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to save setting. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    // Determine if this is a boolean toggle that should autosave
    const isBooleanToggle = typeof value === 'boolean';
    
    // When enabling SMTP, disable Resend (mutual exclusivity)
    if (field === 'smtpEnabled' && value === true) {
      setFormData(prev => {
        const newState = { ...prev, smtpEnabled: true, resendEnabled: false };
        if (isBooleanToggle) autoSaveToggle(newState);
        return newState;
      });
    }
    // When disabling SMTP, enable Resend (at least one must be on)
    else if (field === 'smtpEnabled' && value === false) {
      setFormData(prev => {
        const newState = { ...prev, smtpEnabled: false, resendEnabled: true };
        if (isBooleanToggle) autoSaveToggle(newState);
        return newState;
      });
    }
    // When enabling Resend, disable SMTP (mutual exclusivity)
    else if (field === 'resendEnabled' && value === true) {
      setFormData(prev => {
        const newState = { ...prev, resendEnabled: true, smtpEnabled: false };
        if (isBooleanToggle) autoSaveToggle(newState);
        return newState;
      });
    }
    // When disabling Resend, enable SMTP (at least one must be on)
    else if (field === 'resendEnabled' && value === false) {
      setFormData(prev => {
        const newState = { ...prev, resendEnabled: false, smtpEnabled: true };
        if (isBooleanToggle) autoSaveToggle(newState);
        return newState;
      });
    }
    else {
      setFormData(prev => {
        const newState = { ...prev, [field]: value };
        // Autosave only for boolean toggles
        if (isBooleanToggle) autoSaveToggle(newState);
        return newState;
      });
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a test email address',
        variant: 'destructive',
      });
      return;
    }

    // First save the SMTP settings
    setIsTestingSmtp(true);
    try {
      // Save current SMTP settings first
      await handleSave();
      
      // Then test the connection
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: { test_email: testEmail },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'SMTP Test Successful',
          description: data.message,
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error: any) {
      console.error('SMTP test failed:', error);
      toast({
        title: 'SMTP Test Failed',
        description: error.message || 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleFileSelect = (type: 'logo' | 'favicon' | 'footerLogo' | 'consoleLogo', file: File) => {
    if (type === 'logo') {
      setLogoFile(file);
      setLogoRemoved(false);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (type === 'favicon') {
      setFaviconFile(file);
      setFaviconRemoved(false);
      const reader = new FileReader();
      reader.onload = (e) => setFaviconPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (type === 'footerLogo') {
      setFooterLogoFile(file);
      setFooterLogoRemoved(false);
      const reader = new FileReader();
      reader.onload = (e) => setFooterLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (type === 'consoleLogo') {
      setConsoleLogoFile(file);
      setConsoleLogoRemoved(false);
      const reader = new FileReader();
      reader.onload = (e) => setConsoleLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    console.log('Uploading file:', fileName, 'to bucket:', bucket);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('Upload successful:', data);

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log('Public URL generated:', urlData.publicUrl);
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let logoUrl = settings?.logoUrl;
      let faviconUrl = settings?.faviconUrl;
      let footerLogoUrl = settings?.footerLogoUrl;
      let consoleLogoUrl = settings?.consoleLogoUrl;

      // Handle logo: upload new file, remove if flagged, or keep existing
      if (logoFile) {
        logoUrl = await uploadFile(logoFile, 'website-assets');
      } else if (logoRemoved) {
        logoUrl = null;
      }

      // Handle favicon: upload new file, remove if flagged, or keep existing
      if (faviconFile) {
        faviconUrl = await uploadFile(faviconFile, 'website-assets');
      } else if (faviconRemoved) {
        faviconUrl = null;
      }

      // Handle footer logo: upload new file, remove if flagged, or keep existing
      if (footerLogoFile) {
        footerLogoUrl = await uploadFile(footerLogoFile, 'website-assets');
      } else if (footerLogoRemoved) {
        footerLogoUrl = null;
      }

      // Handle console logo: upload new file, remove if flagged, or keep existing
      if (consoleLogoFile) {
        consoleLogoUrl = await uploadFile(consoleLogoFile, 'website-assets');
      } else if (consoleLogoRemoved) {
        consoleLogoUrl = null;
      }

      await updateSettings({
        bankName: formData.bankName,
        bankAddress: formData.bankAddress,
        bankPhone: formData.bankPhone,
        contactEmail: formData.contactEmail,
        logoUrl,
        faviconUrl,
        footerLogoUrl,
        consoleLogoUrl,
        emailAlertsEnabled: formData.emailAlertsEnabled,
        authEmailsEnabled: formData.authEmailsEnabled,
        showNavigationMenu: formData.showNavigationMenu,
        websiteVisibility: formData.websiteVisibility,
        showKycPage: formData.showKycPage,
        resendEnabled: formData.resendEnabled,
        smtpEnabled: formData.smtpEnabled,
        smtpHost: formData.smtpHost,
        smtpPort: formData.smtpPort,
        smtpUsername: formData.smtpUsername,
        smtpPassword: formData.smtpPassword,
        smtpFromEmail: formData.smtpFromEmail,
        smtpFromName: formData.smtpFromName,
        smtpUseSsl: formData.smtpUseSsl,
        receiptHeaderColor: formData.receiptHeaderColor,
        receiptAccentColor: formData.receiptAccentColor,
        receiptTitle: formData.receiptTitle,
        receiptShowLogo: formData.receiptShowLogo,
        receiptShowWatermark: formData.receiptShowWatermark,
        receiptWatermarkText: formData.receiptWatermarkText,
        receiptFooterDisclaimer: formData.receiptFooterDisclaimer,
        receiptCustomMessage: formData.receiptCustomMessage,
        receiptReferencePrefix: formData.receiptReferencePrefix,
        loginAlertsEnabled: formData.loginAlertsEnabled,
        loginAlertEmail: formData.loginAlertEmail || null,
      });

      // Update document title
      document.title = `${formData.bankName} - Banking Portal`;

      toast({
        title: 'Settings Updated',
        description: 'Website settings have been updated successfully.',
      });

      // Clear file inputs and removal flags
      setLogoFile(null);
      setFaviconFile(null);
      setFooterLogoFile(null);
      setConsoleLogoFile(null);
      setLogoRemoved(false);
      setFaviconRemoved(false);
      setFooterLogoRemoved(false);
      setConsoleLogoRemoved(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';
      if (footerLogoInputRef.current) footerLogoInputRef.current.value = '';
      if (consoleLogoInputRef.current) consoleLogoInputRef.current.value = '';

    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to update website settings: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const removeFile = (type: 'logo' | 'favicon' | 'footerLogo' | 'consoleLogo') => {
    if (type === 'logo') {
      setLogoFile(null);
      setLogoPreview(null);
      setLogoRemoved(true);
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else if (type === 'favicon') {
      setFaviconFile(null);
      setFaviconPreview(null);
      setFaviconRemoved(true);
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    } else if (type === 'footerLogo') {
      setFooterLogoFile(null);
      setFooterLogoPreview(null);
      setFooterLogoRemoved(true);
      if (footerLogoInputRef.current) footerLogoInputRef.current.value = '';
    } else if (type === 'consoleLogo') {
      setConsoleLogoFile(null);
      setConsoleLogoPreview(null);
      setConsoleLogoRemoved(true);
      if (consoleLogoInputRef.current) consoleLogoInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Website Settings</CardTitle>
          <CardDescription>
            Customize your bank's branding and contact information across the entire website.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
              placeholder="Enter bank name"
            />
          </div>

          {/* Bank Address */}
          <div className="space-y-2">
            <Label htmlFor="bankAddress">Bank Address</Label>
            <Textarea
              id="bankAddress"
              value={formData.bankAddress}
              onChange={(e) => handleInputChange('bankAddress', e.target.value)}
              placeholder="Enter bank address"
              rows={3}
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="bankPhone">Phone Number</Label>
            <Input
              id="bankPhone"
              value={formData.bankPhone}
              onChange={(e) => handleInputChange('bankPhone', e.target.value)}
              placeholder="Enter phone number"
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              placeholder="Enter contact email"
            />
          </div>

          {/* Logo Upload (Header) */}
          <div className="space-y-2">
            <Label>Bank Logo (Header)</Label>
            <p className="text-sm text-muted-foreground">
              This logo is displayed only in the public website navigation bar.
            </p>
            <div className="flex items-center space-x-4">
              <Input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect('logo', file);
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
              {logoPreview && (
                <div className="flex items-center space-x-2">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-10 w-10 object-contain border rounded"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile('logo')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Console Logo Upload */}
          <div className="space-y-2">
            <Label>Console Logo</Label>
            <p className="text-sm text-muted-foreground">
              This logo is used across the admin console, user dashboard, bank statements, and transfer receipts. Falls back to the header logo if not set.
            </p>
            <div className="flex items-center space-x-4">
              <Input
                ref={consoleLogoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect('consoleLogo', file);
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => consoleLogoInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Console Logo
              </Button>
              {consoleLogoPreview && (
                <div className="flex items-center space-x-2">
                  <img
                    src={consoleLogoPreview}
                    alt="Console logo preview"
                    className="h-10 w-10 object-contain border rounded"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile('consoleLogo')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

            {/* Footer Logo Upload */}
            <div className="space-y-2">
              <Label>Footer Logo</Label>
              <p className="text-sm text-muted-foreground">
                This logo will be displayed in the footer section of the website (separate from the header logo).
              </p>
              <div className="flex items-center space-x-4">
                <Input
                  ref={footerLogoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('footerLogo', file);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => footerLogoInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Footer Logo
                </Button>
                {footerLogoPreview && (
                  <div className="flex items-center space-x-2">
                    <img
                      src={footerLogoPreview}
                      alt="Footer logo preview"
                      className="h-10 w-10 object-contain border rounded"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile('footerLogo')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-2">
              <Label>Favicon</Label>
            <div className="flex items-center space-x-4">
              <Input
                ref={faviconInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect('favicon', file);
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => faviconInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Favicon
              </Button>
              {faviconPreview && (
                <div className="flex items-center space-x-2">
                  <img
                    src={faviconPreview}
                    alt="Favicon preview"
                    className="h-6 w-6 object-contain border rounded"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile('favicon')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Recommended size: 32x32px or 16x16px. Supports PNG, JPG, or ICO formats.
            </p>
          </div>

          {/* Transactional Emails Toggle */}
          <div className="space-y-2">
            <Label htmlFor="emailAlerts">Transactional Emails</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="emailAlerts"
                checked={formData.emailAlertsEnabled}
                onCheckedChange={(checked) => handleInputChange('emailAlertsEnabled', checked)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {formData.emailAlertsEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  When enabled, users will receive email notifications for account transactions 
                  including credits, debits, transfers, loan disbursements, and deposit approvals.
                </p>
              </div>
            </div>
          </div>

          {/* Authentication Emails Toggle */}
          <div className="space-y-2">
            <Label htmlFor="authEmails">Authentication Emails</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="authEmails"
                checked={formData.authEmailsEnabled}
                onCheckedChange={(checked) => handleInputChange('authEmailsEnabled', checked)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {formData.authEmailsEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  When enabled, authentication-related emails will be sent including email verification 
                  for account registrations, password reset codes, and 2FA login codes.
                </p>
              </div>
            </div>
          </div>

          {/* Login Alerts Toggle */}
          <div className="space-y-2">
            <Label htmlFor="loginAlerts">Login Alerts</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="loginAlerts"
                checked={formData.loginAlertsEnabled}
                onCheckedChange={(checked) => handleInputChange('loginAlertsEnabled', checked)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {formData.loginAlertsEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  When enabled, an email notification is sent to the specified address when a regular user logs in.
                  Includes user details, IP address, and approximate location.
                </p>
              </div>
            </div>

            {formData.loginAlertsEnabled && (
              <div className="space-y-2 mt-3 ml-14">
                <Label htmlFor="loginAlertEmail">Login Alert Email</Label>
                <Input
                  id="loginAlertEmail"
                  type="email"
                  value={formData.loginAlertEmail}
                  onChange={(e) => handleInputChange('loginAlertEmail', e.target.value)}
                  placeholder={formData.contactEmail || 'admin@yourbank.com'}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default admin email ({formData.contactEmail || 'contact email'}).
                </p>
              </div>
            )}
          </div>

          {/* Navigation Menu Visibility Toggle */}
          <div className="space-y-2">
            <Label htmlFor="showNavigationMenu">Navigation Menu Visibility</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="showNavigationMenu"
                checked={formData.showNavigationMenu}
                onCheckedChange={(checked) => handleInputChange('showNavigationMenu', checked)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {formData.showNavigationMenu ? 'Visible' : 'Hidden'}
                </p>
              <p className="text-xs text-muted-foreground">
                Control the visibility of main navigation menu items (Home, About, Services, Contact) 
                in the header and Quick Links section in the footer on all website pages, including 
                login pages. The footer section itself will always remain visible on login pages.
              </p>
              </div>
            </div>
          </div>

          {/* Website Visibility Toggle */}
          <div className="space-y-2">
            <Label htmlFor="websiteVisibility">Website Visibility</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="websiteVisibility"
                checked={formData.websiteVisibility}
                onCheckedChange={(checked) => handleInputChange('websiteVisibility', checked)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {formData.websiteVisibility ? 'Public' : 'Restricted'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Control access to all public website pages (Home, About, Services, Contact). 
                  When disabled, users will be redirected to the login page. Login pages, account 
                  application page, and all authenticated pages remain accessible regardless of this setting.
                </p>
              </div>
            </div>
          </div>

          {/* KYC Page Visibility Toggle */}
          <div className="space-y-2">
            <Label htmlFor="showKycPage">KYC Page Visibility</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="showKycPage"
                checked={formData.showKycPage}
                onCheckedChange={(checked) => handleInputChange('showKycPage', checked)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {formData.showKycPage ? 'Visible' : 'Hidden'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Control the visibility of the KYC (Know Your Customer) page in the user console navigation menu. 
                  When disabled, users will not see the KYC option in their dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Provider Configuration Card - Always visible */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Provider Configuration
          </CardTitle>
          <CardDescription>
            Select an email provider for transactional emails (2FA, notifications, etc.). Only one provider can be active at a time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Provider Selection */}
          <div className="space-y-4">
            <Label>Email Provider</Label>
            <p className="text-sm text-muted-foreground">
              Select which email provider to use for sending emails.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resend Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  formData.resendEnabled 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => handleInputChange('resendEnabled', true)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">Resend</p>
                        <p className="text-xs text-muted-foreground">
                          Default cloud email provider
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.resendEnabled}
                      onCheckedChange={(checked) => {
                        if (checked) handleInputChange('resendEnabled', true);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* SMTP Option */}
              <Card 
                className={`cursor-pointer transition-all ${
                  formData.smtpEnabled 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => handleInputChange('smtpEnabled', true)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">Custom SMTP</p>
                        <p className="text-xs text-muted-foreground">
                          Use your own mail server
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.smtpEnabled}
                      onCheckedChange={(checked) => {
                        if (checked) handleInputChange('smtpEnabled', true);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Warning if neither is enabled */}
            {!formData.resendEnabled && !formData.smtpEnabled && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">No Email Provider Selected</p>
                    <p className="text-xs text-muted-foreground">
                      Please select either Resend or SMTP to enable email functionality.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SMTP Settings - Only show when SMTP is enabled */}
          {formData.smtpEnabled && (
            <>
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium mb-4">SMTP Server Settings</h4>
                
                {/* SMTP Server Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      value={formData.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={formData.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value) || 465)}
                      placeholder="465"
                    />
                  </div>
                </div>

                {/* SSL Toggle */}
                <div className="space-y-2 mt-4">
                  <Label htmlFor="smtpUseSsl">Use SSL/TLS</Label>
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="smtpUseSsl"
                      checked={formData.smtpUseSsl}
                      onCheckedChange={(checked) => handleInputChange('smtpUseSsl', checked)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enable secure connection (recommended for port 465 or STARTTLS on 587)
                    </p>
                  </div>
                </div>

                {/* Authentication */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUsername">SMTP Username</Label>
                    <Input
                      id="smtpUsername"
                      value={formData.smtpUsername}
                      onChange={(e) => handleInputChange('smtpUsername', e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <div className="relative">
                      <Input
                        id="smtpPassword"
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={formData.smtpPassword}
                        onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                        placeholder="••••••••"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      >
                        {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* From Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpFromEmail">From Email Address</Label>
                    <Input
                      id="smtpFromEmail"
                      type="email"
                      value={formData.smtpFromEmail}
                      onChange={(e) => handleInputChange('smtpFromEmail', e.target.value)}
                      placeholder="noreply@yourbank.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpFromName">From Name</Label>
                    <Input
                      id="smtpFromName"
                      value={formData.smtpFromName}
                      onChange={(e) => handleInputChange('smtpFromName', e.target.value)}
                      placeholder="Your Bank"
                    />
                  </div>
                </div>

                {/* Test SMTP Connection */}
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg mt-4">
                  <Label>Test SMTP Connection</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Send a test email to verify your SMTP configuration. Settings will be saved before testing.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestSmtp}
                      disabled={isTestingSmtp || !testEmail}
                    >
                      {isTestingSmtp ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube className="h-4 w-4 mr-2" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Customization Card */}
      <Card>
        <CardHeader>
          <Collapsible open={isReceiptSettingsOpen} onOpenChange={setIsReceiptSettingsOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <div>
                    <CardTitle>Receipt Customization</CardTitle>
                    <CardDescription>
                      Customize the appearance and content of transfer receipts.
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isReceiptSettingsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-6">
              <CardContent className="space-y-6 px-0">
                {/* Appearance Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Appearance</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="receiptHeaderColor">Header Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="receiptHeaderColor"
                          type="color"
                          value={formData.receiptHeaderColor}
                          onChange={(e) => handleInputChange('receiptHeaderColor', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.receiptHeaderColor}
                          onChange={(e) => handleInputChange('receiptHeaderColor', e.target.value)}
                          placeholder="#003366"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receiptAccentColor">Accent Color (Success Box)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="receiptAccentColor"
                          type="color"
                          value={formData.receiptAccentColor}
                          onChange={(e) => handleInputChange('receiptAccentColor', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={formData.receiptAccentColor}
                          onChange={(e) => handleInputChange('receiptAccentColor', e.target.value)}
                          placeholder="#22c55e"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiptShowLogo">Show Logo on Receipt</Label>
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="receiptShowLogo"
                        checked={formData.receiptShowLogo}
                        onCheckedChange={(checked) => handleInputChange('receiptShowLogo', checked)}
                      />
                      <p className="text-sm text-muted-foreground">
                        {formData.receiptShowLogo ? 'Logo will appear on receipts' : 'Logo hidden on receipts'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Watermark Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Watermark</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="receiptShowWatermark">Show Watermark</Label>
                    <div className="flex items-center space-x-3">
                      <Switch
                        id="receiptShowWatermark"
                        checked={formData.receiptShowWatermark}
                        onCheckedChange={(checked) => handleInputChange('receiptShowWatermark', checked)}
                      />
                      <p className="text-sm text-muted-foreground">
                        {formData.receiptShowWatermark ? 'Watermark enabled' : 'No watermark'}
                      </p>
                    </div>
                  </div>

                  {formData.receiptShowWatermark && (
                    <div className="space-y-2">
                      <Label htmlFor="receiptWatermarkText">Watermark Text</Label>
                      <Input
                        id="receiptWatermarkText"
                        value={formData.receiptWatermarkText}
                        onChange={(e) => handleInputChange('receiptWatermarkText', e.target.value)}
                        placeholder="COPY"
                        maxLength={20}
                      />
                      <p className="text-xs text-muted-foreground">
                        Text displayed diagonally across the receipt (max 20 characters)
                      </p>
                    </div>
                  )}
                </div>

                {/* Text Customization */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Text Customization</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="receiptTitle">Receipt Title</Label>
                      <Input
                        id="receiptTitle"
                        value={formData.receiptTitle}
                        onChange={(e) => handleInputChange('receiptTitle', e.target.value)}
                        placeholder="Transfer Confirmation Receipt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receiptReferencePrefix">Reference Number Prefix</Label>
                      <Input
                        id="receiptReferencePrefix"
                        value={formData.receiptReferencePrefix}
                        onChange={(e) => handleInputChange('receiptReferencePrefix', e.target.value)}
                        placeholder="TXN"
                        maxLength={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        Prefix added to reference numbers (e.g., TXN, REF, TR)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiptFooterDisclaimer">Footer Disclaimer</Label>
                    <Textarea
                      id="receiptFooterDisclaimer"
                      value={formData.receiptFooterDisclaimer}
                      onChange={(e) => handleInputChange('receiptFooterDisclaimer', e.target.value)}
                      placeholder="This is a computer-generated receipt and is valid without signature."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receiptCustomMessage">Custom Message (Optional)</Label>
                    <Textarea
                      id="receiptCustomMessage"
                      value={formData.receiptCustomMessage}
                      onChange={(e) => handleInputChange('receiptCustomMessage', e.target.value)}
                      placeholder="Thank you for banking with us. For inquiries, please contact support."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      This message will appear before the footer section on receipts
                    </p>
                  </div>
                </div>

                {/* Preview Button */}
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <Label>Preview Receipt</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate a sample receipt with current settings. Settings will be saved before generating.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setIsGeneratingPreview(true);
                      try {
                        await handleSave();
                        await generateTransferReceipt(
                          {
                            referenceNumber: 'SAMPLE-123456',
                            amount: 1500.00,
                            fromAccount: 'Checking - ****1234',
                            recipientName: 'John Doe',
                            recipientAccount: '****5678',
                            bankName: 'Sample Bank',
                            timestamp: new Date().toLocaleString(),
                            status: 'completed',
                            description: 'Sample transfer for preview',
                            transactionType: 'external',
                          },
                          {
                            bankName: formData.bankName,
                            bankAddress: formData.bankAddress,
                            bankPhone: formData.bankPhone,
                            contactEmail: formData.contactEmail,
                            logoUrl: settings?.logoUrl || null,
                            receiptHeaderColor: formData.receiptHeaderColor,
                            receiptAccentColor: formData.receiptAccentColor,
                            receiptTitle: formData.receiptTitle,
                            receiptShowLogo: formData.receiptShowLogo,
                            receiptShowWatermark: formData.receiptShowWatermark,
                            receiptWatermarkText: formData.receiptWatermarkText,
                            receiptFooterDisclaimer: formData.receiptFooterDisclaimer,
                            receiptCustomMessage: formData.receiptCustomMessage || null,
                            receiptReferencePrefix: formData.receiptReferencePrefix,
                          }
                        );
                        toast({
                          title: 'Preview Generated',
                          description: 'Sample receipt has been downloaded.',
                        });
                      } catch (error) {
                        console.error('Error generating preview:', error);
                        toast({
                          title: 'Error',
                          description: 'Failed to generate preview receipt.',
                          variant: 'destructive',
                        });
                      } finally {
                        setIsGeneratingPreview(false);
                      }
                    }}
                    disabled={isGeneratingPreview}
                  >
                    {isGeneratingPreview ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Preview Receipt
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    </div>
  );
};