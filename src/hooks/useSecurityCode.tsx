import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SecuritySettings {
  securityCodeEnabled: boolean;
  securityCodeForTransfers: boolean;
  lastUpdated: string | null;
}

export const useSecurityCode = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSecuritySettings = async (userId: string): Promise<SecuritySettings | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from("user_security")
        .select("security_code_enabled, security_code_for_transfers, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return {
        securityCodeEnabled: (data as any)?.security_code_enabled || false,
        securityCodeForTransfers: (data as any)?.security_code_for_transfers || false,
        lastUpdated: (data as any)?.updated_at || null,
      };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch security settings",
        variant: "destructive",
      });
      return null;
    }
  };

  const toggleSecurityCode = async (userId: string, enabled: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("toggle_security_code", {
        p_user_id: userId,
        p_enabled: enabled,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Security code ${enabled ? "enabled" : "disabled"} successfully`,
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update security code setting",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const toggleSecurityCodeForTransfers = async (userId: string, enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any).from("user_security").upsert(
        {
          user_id: userId,
          security_code_for_transfers: enabled,
        },
        { onConflict: "user_id" },
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Security code for transfers ${enabled ? "enabled" : "disabled"} successfully`,
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update security code for transfers setting",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateSecurityCode = async (userId: string, oldCode: string | null, newCode: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("update_security_code", {
        p_user_id: userId,
        p_old_code: oldCode,
        p_new_code: newCode,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: "Security code updated successfully",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update security code",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("generate_backup_codes", {
        p_user_id: userId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; codes?: string[] };
      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: "Backup codes generated successfully",
      });

      return { success: true, codes: result.codes || [] };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate backup codes",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const verifySecurityCode = async (userId: string, code: string) => {
    try {
      const { data, error } = await (supabase as any).rpc("verify_security_code", {
        p_user_id: userId,
        p_code: code,
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
      });

      if (error) throw error;

      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const downloadBackupCodes = (codes: string[], bankName?: string) => {
    const displayBankName = bankName || "Your Bank";
    const content = `Security Backup Codes - ${displayBankName}\n\nGenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: These codes can only be used once. Store them in a safe place.\n\n${codes.map((code, index) => `${index + 1}. ${code}`).join("\n")}\n\nIf you use all backup codes, you can generate new ones from your security settings.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayBankName.toLowerCase().replace(/\s+/g, '-')}-backup-codes-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    loading,
    fetchSecuritySettings,
    toggleSecurityCode,
    toggleSecurityCodeForTransfers,
    updateSecurityCode,
    generateBackupCodes,
    verifySecurityCode,
    downloadBackupCodes,
  };
};
