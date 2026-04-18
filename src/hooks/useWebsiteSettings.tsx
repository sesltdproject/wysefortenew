import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebsiteSettings {
  bankName: string;
  bankAddress: string;
  bankPhone: string;
  contactEmail: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  footerLogoUrl: string | null;
  consoleLogoUrl: string | null;
  emailAlertsEnabled: boolean;
  authEmailsEnabled: boolean;
  showNavigationMenu: boolean;
  websiteVisibility: boolean;
  showKycPage: boolean;
  // SMTP Settings (only available to admins)
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number;
  smtpUsername: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpUseSsl: boolean;
  // Resend Settings
  resendEnabled: boolean;
  // Receipt Customization Settings
  receiptHeaderColor: string;
  receiptAccentColor: string;
  receiptTitle: string;
  receiptShowLogo: boolean;
  receiptShowWatermark: boolean;
  receiptWatermarkText: string;
  receiptFooterDisclaimer: string;
  receiptCustomMessage: string | null;
  receiptReferencePrefix: string;
  // Login Alert Settings
  loginAlertsEnabled: boolean;
  loginAlertEmail: string | null;
}

interface WebsiteSettingsContextType {
  settings: WebsiteSettings | null;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<WebsiteSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const WebsiteSettingsContext = createContext<WebsiteSettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: WebsiteSettings = {
  bankName: 'Your Bank',
  bankAddress: '123 Main Street, Cityville, ST 12345',
  bankPhone: '(555) 123-4567',
  contactEmail: 'info@yourbank.com',
  logoUrl: null,
  faviconUrl: null,
  footerLogoUrl: null,
  consoleLogoUrl: null,
  emailAlertsEnabled: true,
  authEmailsEnabled: true,
  showNavigationMenu: true,
  websiteVisibility: true,
  showKycPage: true,
  smtpEnabled: true,
  smtpHost: null,
  smtpPort: 465,
  smtpUsername: null,
  smtpPassword: null,
  smtpFromEmail: null,
  smtpFromName: null,
  smtpUseSsl: true,
  resendEnabled: false,
  receiptHeaderColor: '#003366',
  receiptAccentColor: '#22c55e',
  receiptTitle: 'Transfer Confirmation Receipt',
  receiptShowLogo: true,
  receiptShowWatermark: false,
  receiptWatermarkText: 'COPY',
  receiptFooterDisclaimer: 'This is a computer-generated receipt and is valid without signature.',
  receiptCustomMessage: null,
  receiptReferencePrefix: 'TXN',
  loginAlertsEnabled: false,
  loginAlertEmail: null,
};

export const WebsiteSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use a ref to access current settings in fetchSettings without stale closure
  const settingsRef = React.useRef<WebsiteSettings | null>(null);
  settingsRef.current = settings;

  const fetchSettings = async () => {
    try {
      // First try public settings (safe for all users, no sensitive data)
      const { data: publicData, error: publicError } = await supabase.rpc('get_public_website_settings');
      
      if (!publicError && publicData && publicData.length > 0) {
        const settingsData = publicData[0];
        const baseSettings: WebsiteSettings = {
          bankName: settingsData.bank_name || 'Your Bank',
          bankAddress: settingsData.bank_address || '123 Main Street, Cityville, ST 12345',
          bankPhone: settingsData.bank_phone || '(555) 123-4567',
          contactEmail: settingsData.support_email || 'info@yourbank.com',
          logoUrl: settingsData.logo_url,
          faviconUrl: settingsData.favicon_url,
          footerLogoUrl: settingsData.footer_logo_url,
          consoleLogoUrl: settingsData.console_logo_url || null,
          // Preserve existing admin settings if we have them (prevents overwriting on failed admin RPC)
          // Use settingsRef to access current state without stale closure
          emailAlertsEnabled: settingsRef.current?.emailAlertsEnabled ?? true,
          authEmailsEnabled: settingsRef.current?.authEmailsEnabled ?? true,
          showNavigationMenu: settingsData.show_navigation_menu ?? true,
          websiteVisibility: settingsData.website_visibility ?? true,
          showKycPage: settingsData.show_kyc_page ?? true,
          // SMTP Settings - preserve existing values if admin call fails
          smtpEnabled: settingsRef.current?.smtpEnabled ?? true,
          smtpHost: settingsRef.current?.smtpHost ?? null,
          smtpPort: settingsRef.current?.smtpPort ?? 465,
          smtpUsername: settingsRef.current?.smtpUsername ?? null,
          smtpPassword: settingsRef.current?.smtpPassword ?? null,
          smtpFromEmail: settingsRef.current?.smtpFromEmail ?? null,
          smtpFromName: settingsRef.current?.smtpFromName ?? null,
          smtpUseSsl: settingsRef.current?.smtpUseSsl ?? true,
          resendEnabled: settingsRef.current?.resendEnabled ?? false,
          // Receipt Customization Settings
          receiptHeaderColor: settingsData.receipt_header_color || '#003366',
          receiptAccentColor: settingsData.receipt_accent_color || '#22c55e',
          receiptTitle: settingsData.receipt_title || 'Transfer Confirmation Receipt',
          receiptShowLogo: settingsData.receipt_show_logo ?? true,
          receiptShowWatermark: settingsData.receipt_show_watermark ?? false,
          receiptWatermarkText: settingsData.receipt_watermark_text || 'COPY',
          receiptFooterDisclaimer: settingsData.receipt_footer_disclaimer || 'This is a computer-generated receipt and is valid without signature.',
          receiptCustomMessage: settingsData.receipt_custom_message || null,
          receiptReferencePrefix: settingsData.receipt_reference_prefix || 'TXN',
          loginAlertsEnabled: settingsRef.current?.loginAlertsEnabled ?? false,
          loginAlertEmail: settingsRef.current?.loginAlertEmail ?? null,
        };
        
        // Try to get full admin settings (will only succeed for admins)
        const { data: adminData, error: adminError } = await supabase.rpc('get_website_settings');
        
        if (!adminError && adminData && adminData.length > 0) {
          // Admin has full access - merge in sensitive settings
          const adminSettings = adminData[0];
          baseSettings.emailAlertsEnabled = adminSettings.email_alerts_enabled ?? false;
          baseSettings.authEmailsEnabled = adminSettings.auth_emails_enabled ?? true;
          baseSettings.smtpEnabled = adminSettings.smtp_enabled ?? false;
          baseSettings.smtpHost = adminSettings.smtp_host;
          baseSettings.smtpPort = adminSettings.smtp_port ?? 465;
          baseSettings.smtpUsername = adminSettings.smtp_username;
          baseSettings.smtpPassword = adminSettings.smtp_password;
          baseSettings.smtpFromEmail = adminSettings.smtp_from_email;
          baseSettings.smtpFromName = adminSettings.smtp_from_name;
          baseSettings.smtpUseSsl = adminSettings.smtp_use_ssl ?? true;
          baseSettings.resendEnabled = adminSettings.resend_enabled ?? false;
          baseSettings.loginAlertsEnabled = adminSettings.login_alerts_enabled ?? false;
          baseSettings.loginAlertEmail = adminSettings.login_alert_email ?? null;
        }
        
        setSettings(baseSettings);
        return;
      }
      
      // Default settings if no data found
      setSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error fetching website settings:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<WebsiteSettings>) => {
    try {
      // Build settings object, only including fields that are explicitly provided
      // This prevents null/undefined values from overwriting existing database values
      const settingsPayload: Record<string, any> = {};
      
      // Only include fields that are explicitly set (not undefined)
      if (newSettings.bankName !== undefined) settingsPayload.bank_name = newSettings.bankName;
      if (newSettings.bankAddress !== undefined) settingsPayload.bank_address = newSettings.bankAddress;
      if (newSettings.bankPhone !== undefined) settingsPayload.bank_phone = newSettings.bankPhone;
      if (newSettings.contactEmail !== undefined) settingsPayload.support_email = newSettings.contactEmail;
      if (newSettings.logoUrl !== undefined) settingsPayload.logo_url = newSettings.logoUrl;
      if (newSettings.faviconUrl !== undefined) settingsPayload.favicon_url = newSettings.faviconUrl;
      if (newSettings.footerLogoUrl !== undefined) settingsPayload.footer_logo_url = newSettings.footerLogoUrl;
      if (newSettings.consoleLogoUrl !== undefined) settingsPayload.console_logo_url = newSettings.consoleLogoUrl;
      if (newSettings.emailAlertsEnabled !== undefined) settingsPayload.email_alerts_enabled = newSettings.emailAlertsEnabled;
      if (newSettings.authEmailsEnabled !== undefined) settingsPayload.auth_emails_enabled = newSettings.authEmailsEnabled;
      if (newSettings.showNavigationMenu !== undefined) settingsPayload.show_navigation_menu = newSettings.showNavigationMenu;
      if (newSettings.websiteVisibility !== undefined) settingsPayload.website_visibility = newSettings.websiteVisibility;
      if (newSettings.showKycPage !== undefined) settingsPayload.show_kyc_page = newSettings.showKycPage;
      if (newSettings.smtpEnabled !== undefined) settingsPayload.smtp_enabled = newSettings.smtpEnabled;
      if (newSettings.resendEnabled !== undefined) settingsPayload.resend_enabled = newSettings.resendEnabled;
      
      // SMTP fields: use same simple undefined check as other fields
      if (newSettings.smtpHost !== undefined) settingsPayload.smtp_host = newSettings.smtpHost;
      if (newSettings.smtpPort !== undefined) settingsPayload.smtp_port = newSettings.smtpPort;
      if (newSettings.smtpUsername !== undefined) settingsPayload.smtp_username = newSettings.smtpUsername;
      if (newSettings.smtpPassword !== undefined) settingsPayload.smtp_password = newSettings.smtpPassword;
      if (newSettings.smtpFromEmail !== undefined) settingsPayload.smtp_from_email = newSettings.smtpFromEmail;
      if (newSettings.smtpFromName !== undefined) settingsPayload.smtp_from_name = newSettings.smtpFromName;
      if (newSettings.smtpUseSsl !== undefined) settingsPayload.smtp_use_ssl = newSettings.smtpUseSsl;
      
      // Receipt Customization Settings
      if (newSettings.receiptHeaderColor !== undefined) settingsPayload.receipt_header_color = newSettings.receiptHeaderColor;
      if (newSettings.receiptAccentColor !== undefined) settingsPayload.receipt_accent_color = newSettings.receiptAccentColor;
      if (newSettings.receiptTitle !== undefined) settingsPayload.receipt_title = newSettings.receiptTitle;
      if (newSettings.receiptShowLogo !== undefined) settingsPayload.receipt_show_logo = newSettings.receiptShowLogo;
      if (newSettings.receiptShowWatermark !== undefined) settingsPayload.receipt_show_watermark = newSettings.receiptShowWatermark;
      if (newSettings.receiptWatermarkText !== undefined) settingsPayload.receipt_watermark_text = newSettings.receiptWatermarkText;
      if (newSettings.receiptFooterDisclaimer !== undefined) settingsPayload.receipt_footer_disclaimer = newSettings.receiptFooterDisclaimer;
      if (newSettings.receiptCustomMessage !== undefined) settingsPayload.receipt_custom_message = newSettings.receiptCustomMessage;
      if (newSettings.receiptReferencePrefix !== undefined) settingsPayload.receipt_reference_prefix = newSettings.receiptReferencePrefix;

      // Login Alert Settings
      if (newSettings.loginAlertsEnabled !== undefined) settingsPayload.login_alerts_enabled = newSettings.loginAlertsEnabled;
      if (newSettings.loginAlertEmail !== undefined) settingsPayload.login_alert_email = newSettings.loginAlertEmail;

      const { data, error } = await (supabase as any).rpc('update_website_settings', {
        settings: settingsPayload
      });

      if (error) throw error;
      
      // Update favicon in DOM if changed
      if (newSettings.faviconUrl !== undefined) {
        updateFaviconInDOM(newSettings.faviconUrl);
      }
      
      // Refresh settings from database
      await fetchSettings();
    } catch (error) {
      console.error('Error updating website settings:', error);
      throw error;
    }
  };

  const DEFAULT_FAVICON_DATA_URL =
    "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='64'%20height='64'%3E%3Crect%20width='64'%20height='64'%20fill='transparent'/%3E%3C/svg%3E";

  const updateFaviconInDOM = (faviconUrl: string | null) => {
    const href = faviconUrl || DEFAULT_FAVICON_DATA_URL;

    const link =
      (document.querySelector('#app-favicon') as HTMLLinkElement | null) ??
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement | null);

    if (link) {
      link.id = 'app-favicon';
      link.rel = 'icon';
      link.href = href;
      return;
    }

    const newLink = document.createElement('link');
    newLink.id = 'app-favicon';
    newLink.rel = 'icon';
    newLink.href = href;
    document.head.appendChild(newLink);
  };

  useEffect(() => {
    fetchSettings();

    // Set up real-time subscription
    const channel = supabase
      .channel('website-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'website_settings'
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshSettings = async () => {
    await fetchSettings();
  };

  return (
    <WebsiteSettingsContext.Provider value={{
      settings,
      isLoading,
      updateSettings,
      refreshSettings
    }}>
      {children}
    </WebsiteSettingsContext.Provider>
  );
};

export const useWebsiteSettings = () => {
  const context = useContext(WebsiteSettingsContext);
  if (context === undefined) {
    throw new Error('useWebsiteSettings must be used within a WebsiteSettingsProvider');
  }
  return context;
};
