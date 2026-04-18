import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Contact,
  Users,
  Save,
  X,
  DollarSign,
  AlertCircle,
  Shield,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Key,
  Mail,
  Camera,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  title?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  account_locked?: boolean;
}

interface NextOfKinData {
  id?: string;
  full_name: string;
  relationship?: string;
  phone_number?: string;
  email?: string;
}

interface UserEditModalProps {
  user: UserData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const UserEditModal = ({ user, open, onOpenChange, onUserUpdated }: UserEditModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    id: "",
    email: "",
    full_name: "",
    role: "user",
    title: "",
    phone: "",
    date_of_birth: "",
    address: "",
    account_locked: false,
  });

  const [nextOfKinData, setNextOfKinData] = useState<NextOfKinData>({
    full_name: "",
    relationship: "",
    phone_number: "",
    email: "",
  });
  const [loanApplicationsAllowed, setLoanApplicationsAllowed] = useState(true);

  // Transfer codes state
  const [transferCodesData, setTransferCodesData] = useState({
    code1Enabled: false,
    code1Name: "",
    code1Value: "",
    code2Enabled: false,
    code2Name: "",
    code2Value: "",
    code3Enabled: false,
    code3Name: "",
    code3Value: "",
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState<{
    security_code_enabled: boolean;
    email_2fa_enabled: boolean;
    account_locked_until: string | null;
    failed_verification_attempts: number;
    last_failed_attempt: string | null;
  } | null>(null);
  const [loadingSecuritySettings, setLoadingSecuritySettings] = useState(false);
  const [disableSecurityCodeLoading, setDisableSecurityCodeLoading] = useState(false);
  const [disableEmail2FALoading, setDisableEmail2FALoading] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Avatar management state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  useEffect(() => {
    if (user && open) {
      setFormData({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        title: "",
        phone: user.phone || "",
        date_of_birth: user.date_of_birth || "",
        address: user.address || "",
        account_locked: user.account_locked || false,
      });

      // Fetch title from profile
      fetchUserTitle(user.id);

      // Fetch loan applications allowed status
      fetchUserProfile(user.id);

      // Fetch next of kin data
      fetchNextOfKin(user.id);

      // Fetch security settings
      fetchSecuritySettings(user.id);

      // Fetch avatar
      fetchAvatarUrl(user.id);

      // Reset avatar editing state
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarRemoved(false);
    }
  }, [user, open]);

  const fetchUserTitle = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("title")
        .eq("id", userId)
        .single();
      if (!error && data) {
        setFormData(prev => ({ ...prev, title: data.title || "" }));
      }
    } catch (err) {
      console.error("Error fetching title:", err);
    }
  };

  const fetchAvatarUrl = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      if (!error && data) {
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error("Error fetching avatar:", err);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          loan_applications_allowed,
          transfer_code_1_enabled,
          transfer_code_1_name,
          transfer_code_1_value,
          transfer_code_2_enabled,
          transfer_code_2_name,
          transfer_code_2_value,
          transfer_code_3_enabled,
          transfer_code_3_name,
          transfer_code_3_value
        `,
        )
        .eq("id", userId)
        .single();

      if (error) throw error;

      setLoanApplicationsAllowed(data.loan_applications_allowed ?? true);

      // Set transfer codes data
      setTransferCodesData({
        code1Enabled: data.transfer_code_1_enabled ?? false,
        code1Name: data.transfer_code_1_name ?? "",
        code1Value: data.transfer_code_1_value ?? "",
        code2Enabled: data.transfer_code_2_enabled ?? false,
        code2Name: data.transfer_code_2_name ?? "",
        code2Value: data.transfer_code_2_value ?? "",
        code3Enabled: data.transfer_code_3_enabled ?? false,
        code3Name: data.transfer_code_3_name ?? "",
        code3Value: data.transfer_code_3_value ?? "",
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchNextOfKin = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("next_of_kin").select("*").eq("user_id", userId).maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setNextOfKinData({
          id: data.id,
          full_name: data.full_name || "",
          relationship: data.relationship || "",
          phone_number: data.phone_number || "",
          email: data.email || "",
        });
      } else {
        // Reset to empty if no next of kin exists
        setNextOfKinData({
          full_name: "",
          relationship: "",
          phone_number: "",
          email: "",
        });
      }
    } catch (error) {
      console.error("Error fetching next of kin:", error);
    }
  };

  const fetchSecuritySettings = async (userId: string) => {
    setLoadingSecuritySettings(true);
    try {
      const { data, error } = await supabase
        .from("user_security")
        .select(
          "security_code_enabled, email_2fa_enabled, account_locked_until, failed_verification_attempts, last_failed_attempt",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSecuritySettings({
          security_code_enabled: data.security_code_enabled ?? false,
          email_2fa_enabled: data.email_2fa_enabled ?? false,
          account_locked_until: data.account_locked_until,
          failed_verification_attempts: data.failed_verification_attempts ?? 0,
          last_failed_attempt: data.last_failed_attempt,
        });
      } else {
        setSecuritySettings(null);
      }
    } catch (error) {
      console.error("Error fetching security settings:", error);
      setSecuritySettings(null);
    } finally {
      setLoadingSecuritySettings(false);
    }
  };

  const handleDisableEmail2FA = async () => {
    if (!user) return;

    setDisableEmail2FALoading(true);
    try {
      const { error } = await supabase
        .from("user_security")
        .update({ email_2fa_enabled: false })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Email 2FA Disabled",
        description: "Email two-factor authentication has been disabled for this user.",
      });

      // Refresh security settings
      await fetchSecuritySettings(user.id);
    } catch (error) {
      console.error("Error disabling Email 2FA:", error);
      toast({
        title: "Error",
        description: "Failed to disable Email 2FA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisableEmail2FALoading(false);
    }
  };

  const handlePersonalInfoUpdate = (field: keyof UserData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNextOfKinUpdate = (field: keyof NextOfKinData, value: string) => {
    setNextOfKinData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTransferCodeUpdate = (field: keyof typeof transferCodesData, value: string | boolean) => {
    setTransferCodesData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClearSecurityLock = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_clear_security_lock", {
        p_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Security Lock Cleared",
        description: "The temporary security lock has been removed. If the user forgot their password, please also reset it in the Password section below.",
        duration: 8000,
      });

      // Refresh security settings
      await fetchSecuritySettings(user.id);
    } catch (error) {
      console.error("Error clearing security lock:", error);
      toast({
        title: "Error",
        description: "Failed to clear security lock. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSecurityCode = async () => {
    if (!user) return;

    setDisableSecurityCodeLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_disable_security_code" as any, {
        p_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Security Code Disabled",
        description:
          "Security code verification has been disabled for this user. They can re-enable it in their security settings.",
      });

      // Refresh security settings
      await fetchSecuritySettings(user.id);
    } catch (error) {
      console.error("Error disabling security code:", error);
      toast({
        title: "Error",
        description: "Failed to disable security code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisableSecurityCodeLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Validate password length
    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setResetPasswordLoading(true);

      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          user_id: formData.id,
          new_password: newPassword,
        },
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw error;
      }

      // Check the response data for errors
      if (data && !data.success && data.error) {
        console.error("Password reset failed:", data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: "Password reset successfully",
      });

      // Clear password fields
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate transfer codes: enabled codes must have a name and exactly 10 alphanumeric characters
    const codesToValidate = [
      {
        enabled: transferCodesData.code1Enabled,
        name: transferCodesData.code1Name,
        value: transferCodesData.code1Value,
        label: "Transfer Code 1",
      },
      {
        enabled: transferCodesData.code2Enabled,
        name: transferCodesData.code2Name,
        value: transferCodesData.code2Value,
        label: "Transfer Code 2",
      },
      {
        enabled: transferCodesData.code3Enabled,
        name: transferCodesData.code3Name,
        value: transferCodesData.code3Value,
        label: "Transfer Code 3",
      },
    ];

    for (const code of codesToValidate) {
      if (code.enabled) {
        if (!code.name.trim()) {
          toast({
            title: "Validation Error",
            description: `${code.label}: Code name is required when enabled.`,
            variant: "destructive",
          });
          return;
        }
        if (!/^[a-zA-Z0-9]{10}$/.test(code.value)) {
          toast({
            title: "Validation Error",
            description: `${code.label}: Code value must be exactly 10 alphanumeric characters.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Check if email has changed - if so, use the edge function to update both auth and profile
      const emailChanged = formData.email !== user.email;

      if (emailChanged) {
        const { data: emailUpdateResult, error: emailUpdateError } = await supabase.functions.invoke(
          "admin-update-user-email",
          {
            body: {
              user_id: user.id,
              new_email: formData.email,
            },
          },
        );

        if (emailUpdateError || !emailUpdateResult?.success) {
          throw new Error(emailUpdateResult?.error || "Failed to update email");
        }
      }

      // Handle avatar upload/removal
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });
        if (uploadError) {
          console.error('Error uploading avatar:', uploadError);
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          setAvatarUrl(urlData.publicUrl);
          // Will be included in profile update below
        }
      } else if (avatarRemoved && avatarUrl) {
        // Delete from storage
        const { data: fileList } = await supabase.storage.from('avatars').list(user.id);
        if (fileList && fileList.length > 0) {
          await supabase.storage.from('avatars').remove(fileList.map(f => `${user.id}/${f.name}`));
        }
        setAvatarUrl(null);
      }

      // Update profile (excluding email if it was already updated via edge function)
      const profileUpdate: Record<string, any> = {
        full_name: formData.full_name,
        title: formData.title || null,
        phone: formData.phone || null,
        date_of_birth: formData.date_of_birth || null,
        address: formData.address || null,
        account_locked: formData.account_locked,
        loan_applications_allowed: loanApplicationsAllowed,
        transfer_code_1_enabled: transferCodesData.code1Enabled,
        transfer_code_1_name: transferCodesData.code1Enabled ? transferCodesData.code1Name : null,
        transfer_code_1_value: transferCodesData.code1Enabled ? transferCodesData.code1Value : null,
        transfer_code_2_enabled: transferCodesData.code2Enabled,
        transfer_code_2_name: transferCodesData.code2Enabled ? transferCodesData.code2Name : null,
        transfer_code_2_value: transferCodesData.code2Enabled ? transferCodesData.code2Value : null,
        transfer_code_3_enabled: transferCodesData.code3Enabled,
        transfer_code_3_name: transferCodesData.code3Enabled ? transferCodesData.code3Name : null,
        transfer_code_3_value: transferCodesData.code3Enabled ? transferCodesData.code3Value : null,
      };

      // Only include email in profile update if it wasn't changed (edge function handles it)
      if (!emailChanged) {
        profileUpdate.email = formData.email;
      }

      // Include avatar_url in profile update
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar.${fileExt}`);
        profileUpdate.avatar_url = urlData.publicUrl;
      } else if (avatarRemoved) {
        profileUpdate.avatar_url = null;
      }

      const { error: profileError } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

      if (profileError) throw profileError;

      // Update user role in user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: formData.role as "admin" | "user" })
        .eq("user_id", user.id);

      if (roleError) throw roleError;

      // Handle next of kin update/insert
      if (nextOfKinData.full_name.trim()) {
        if (nextOfKinData.id) {
          // Update existing next of kin
          const { error: nokUpdateError } = await supabase
            .from("next_of_kin")
            .update({
              full_name: nextOfKinData.full_name,
              relationship: nextOfKinData.relationship || null,
              phone_number: nextOfKinData.phone_number || null,
              email: nextOfKinData.email || null,
            })
            .eq("id", nextOfKinData.id);

          if (nokUpdateError) throw nokUpdateError;
        } else {
          // Insert new next of kin
          const { error: nokInsertError } = await supabase.from("next_of_kin").insert({
            user_id: user.id,
            full_name: nextOfKinData.full_name,
            relationship: nextOfKinData.relationship || null,
            phone_number: nextOfKinData.phone_number || null,
            email: nextOfKinData.email || null,
          });

          if (nokInsertError) throw nokInsertError;
        }
      } else if (nextOfKinData.id) {
        // Delete next of kin if name is empty but record exists
        const { error: nokDeleteError } = await supabase.from("next_of_kin").delete().eq("id", nextOfKinData.id);

        if (nokDeleteError) throw nokDeleteError;
      }

      toast({
        title: "User Updated",
        description: emailChanged
          ? "User information and email updated successfully. The user can now login with their new email."
          : "User information has been updated successfully.",
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update user information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile Settings - {user?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue="personal" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-7 flex-shrink-0">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="contact">Contact Info</TabsTrigger>
              <TabsTrigger value="nextofkin">Next of Kin</TabsTrigger>
              <TabsTrigger value="loansettings">Loan Settings</TabsTrigger>
              <TabsTrigger value="transfercodes">Transfer Codes</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="pwdres">PwdRes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2">
              <TabsContent value="personal" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal Details
                    </CardTitle>
                    <CardDescription>Basic personal information and account settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Avatar Management */}
                    <div className="flex items-center gap-4 pb-4 border-b">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          {(avatarPreview || (!avatarRemoved && avatarUrl)) ? (
                            <AvatarImage src={avatarPreview || avatarUrl || ''} alt="User avatar" />
                          ) : (
                            <AvatarFallback className="text-lg bg-primary/10 text-primary">
                              {formData.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <label
                          htmlFor="edit-user-avatar"
                          className="absolute bottom-0 right-0 p-1 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                        >
                          <Camera className="h-4 w-4" />
                        </label>
                        <input
                          id="edit-user-avatar"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAvatarFile(file);
                              setAvatarPreview(URL.createObjectURL(file));
                              setAvatarRemoved(false);
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">Profile Photo</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('edit-user-avatar')?.click()}
                          >
                            {avatarUrl && !avatarRemoved ? 'Replace' : 'Upload'}
                          </Button>
                          {(avatarUrl || avatarPreview) && !avatarRemoved && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                setAvatarFile(null);
                                setAvatarPreview(null);
                                setAvatarRemoved(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Select
                          value={formData.title || ""}
                          onValueChange={(value) => handlePersonalInfoUpdate("title", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select title" />
                          </SelectTrigger>
                          <SelectContent>
                            {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Rev.'].map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => handlePersonalInfoUpdate("full_name", e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => handlePersonalInfoUpdate("date_of_birth", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handlePersonalInfoUpdate("email", e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => handlePersonalInfoUpdate("role", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="account_status">Account Status</Label>
                        <Select
                          value={formData.account_locked ? "locked" : "active"}
                          onValueChange={(value) => handlePersonalInfoUpdate("account_locked", value === "locked")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="locked">Locked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Contact className="h-4 w-4" />
                      Contact Information
                    </CardTitle>
                    <CardDescription>Phone number and address details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="phone">Phone Number (International Format)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handlePersonalInfoUpdate("phone", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Please include country code (e.g., +1 for US, +44 for UK).
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="address">Billing Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handlePersonalInfoUpdate("address", e.target.value)}
                        placeholder="123 Main St, City, State 12345, Country"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nextofkin" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Next of Kin
                    </CardTitle>
                    <CardDescription>Emergency contact information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nok_full_name">Full Name</Label>
                        <Input
                          id="nok_full_name"
                          value={nextOfKinData.full_name}
                          onChange={(e) => handleNextOfKinUpdate("full_name", e.target.value)}
                          placeholder="Emergency contact name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nok_relationship">Relationship</Label>
                        <Select
                          value={nextOfKinData.relationship || ""}
                          onValueChange={(value) => handleNextOfKinUpdate("relationship", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spouse">Spouse</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="sibling">Sibling</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nok_phone">Phone Number</Label>
                        <Input
                          id="nok_phone"
                          value={nextOfKinData.phone_number}
                          onChange={(e) => handleNextOfKinUpdate("phone_number", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nok_email">Email Address</Label>
                        <Input
                          id="nok_email"
                          type="email"
                          value={nextOfKinData.email}
                          onChange={(e) => handleNextOfKinUpdate("email", e.target.value)}
                          placeholder="contact@example.com"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="loansettings" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Loan Settings
                    </CardTitle>
                    <CardDescription>Configure loan application eligibility for this user</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="loan-applications-toggle">Allow Loan Applications</Label>
                        <p className="text-sm text-muted-foreground">
                          When enabled, this user can apply for loans. When disabled, they will see a message directing
                          them to contact support.
                        </p>
                      </div>
                      <Switch
                        id="loan-applications-toggle"
                        checked={loanApplicationsAllowed}
                        onCheckedChange={setLoanApplicationsAllowed}
                      />
                    </div>

                    {!loanApplicationsAllowed && (
                      <Card className="bg-muted/50 border-muted">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Loan applications disabled</p>
                              <p className="text-sm text-muted-foreground">
                                This user will see: "You are not qualified for a loan at this time. Please contact
                                the bank's support email for more details."
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transfercodes" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Transfer Codes
                    </CardTitle>
                    <CardDescription>Configure transfer verification codes for international transfers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Code 1 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="code1-toggle">Code 1</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable first verification code for international transfers
                          </p>
                        </div>
                        <Switch
                          id="code1-toggle"
                          checked={transferCodesData.code1Enabled}
                          onCheckedChange={(checked) => handleTransferCodeUpdate("code1Enabled", checked)}
                        />
                      </div>

                      {transferCodesData.code1Enabled && (
                        <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                          <div>
                            <Label htmlFor="code1-name">Code Name (max 100 characters)</Label>
                            <Input
                              id="code1-name"
                              value={transferCodesData.code1Name}
                              onChange={(e) => handleTransferCodeUpdate("code1Name", e.target.value.slice(0, 100))}
                              placeholder="e.g., Transfer Security PIN"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <Label htmlFor="code1-value">Code Value (10 alphanumeric characters)</Label>
                            <Input
                              id="code1-value"
                              value={transferCodesData.code1Value}
                              onChange={(e) =>
                                handleTransferCodeUpdate(
                                  "code1Value",
                                  e.target.value
                                    .toUpperCase()
                                    .replace(/[^A-Z0-9]/g, "")
                                    .slice(0, 10),
                                )
                              }
                              placeholder="ABC1234567"
                              maxLength={10}
                              className="font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Code 2 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="code2-toggle">Code 2</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable second verification code for international transfers
                          </p>
                        </div>
                        <Switch
                          id="code2-toggle"
                          checked={transferCodesData.code2Enabled}
                          onCheckedChange={(checked) => handleTransferCodeUpdate("code2Enabled", checked)}
                        />
                      </div>

                      {transferCodesData.code2Enabled && (
                        <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                          <div>
                            <Label htmlFor="code2-name">Code Name (max 100 characters)</Label>
                            <Input
                              id="code2-name"
                              value={transferCodesData.code2Name}
                              onChange={(e) => handleTransferCodeUpdate("code2Name", e.target.value.slice(0, 100))}
                              placeholder="e.g., Anti-Fraud Code"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <Label htmlFor="code2-value">Code Value (10 alphanumeric characters)</Label>
                            <Input
                              id="code2-value"
                              value={transferCodesData.code2Value}
                              onChange={(e) =>
                                handleTransferCodeUpdate(
                                  "code2Value",
                                  e.target.value
                                    .toUpperCase()
                                    .replace(/[^A-Z0-9]/g, "")
                                    .slice(0, 10),
                                )
                              }
                              placeholder="XYZ9876543"
                              maxLength={10}
                              className="font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Code 3 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="code3-toggle">Code 3</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable third verification code for international transfers
                          </p>
                        </div>
                        <Switch
                          id="code3-toggle"
                          checked={transferCodesData.code3Enabled}
                          onCheckedChange={(checked) => handleTransferCodeUpdate("code3Enabled", checked)}
                          disabled={true}
                        />
                      </div>

                      {transferCodesData.code3Enabled && (
                        <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                          <div>
                            <Label htmlFor="code3-name">Code Name (max 100 characters)</Label>
                            <Input
                              id="code3-name"
                              value={transferCodesData.code3Name}
                              onChange={(e) => handleTransferCodeUpdate("code3Name", e.target.value.slice(0, 100))}
                              placeholder="e.g., Authorization Code"
                              maxLength={100}
                            />
                          </div>
                          <div>
                            <Label htmlFor="code3-value">Code Value (10 alphanumeric characters)</Label>
                            <Input
                              id="code3-value"
                              value={transferCodesData.code3Value}
                              onChange={(e) =>
                                handleTransferCodeUpdate(
                                  "code3Value",
                                  e.target.value
                                    .toUpperCase()
                                    .replace(/[^A-Z0-9]/g, "")
                                    .slice(0, 10),
                                )
                              }
                              placeholder="DEF1122334"
                              maxLength={10}
                              className="font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Code Settings
                    </CardTitle>
                    <CardDescription>View and manage security code lock status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingSecuritySettings ? (
                      <div className="text-center py-8 text-muted-foreground">Loading security settings...</div>
                    ) : !securitySettings ? (
                      <Card className="bg-muted/50 border-muted">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Security code not configured</p>
                              <p className="text-sm text-muted-foreground">
                                This user has not set up a security code yet.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Security Code Status</Label>
                            <div className="flex items-center gap-2 mt-1">
                              {securitySettings.security_code_enabled ? (
                                <>
                                  <Shield className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium">Enabled</span>
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-muted-foreground">Disabled</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <Label className="text-muted-foreground">Account Lock Status</Label>
                            <div className="flex items-center gap-2 mt-1">
                              {securitySettings.account_locked_until &&
                              new Date(securitySettings.account_locked_until) > new Date() ? (
                                <>
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                  <span className="text-sm font-medium text-destructive">Locked</span>
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium">Unlocked</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {securitySettings.account_locked_until && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-muted-foreground">Lock Expires</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {new Date(securitySettings.account_locked_until) > new Date()
                                    ? new Date(securitySettings.account_locked_until).toLocaleString()
                                    : "Expired"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <Label className="text-muted-foreground">Failed Attempts</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{securitySettings.failed_verification_attempts || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {securitySettings.last_failed_attempt && (
                          <div>
                            <Label className="text-muted-foreground">Last Failed Attempt</Label>
                            <p className="text-sm mt-1">
                              {new Date(securitySettings.last_failed_attempt).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {securitySettings.account_locked_until && (
                          <Card className="bg-destructive/5 border-destructive/20">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Temporary Security Lock Active</p>
                                    <p className="text-sm text-muted-foreground">
                                      This user has been temporarily locked due to multiple failed login
                                      attempts. You can clear this lock to allow immediate access.
                                    </p>
                                    <p className="text-xs text-destructive font-medium mt-1">
                                      Important: If the user forgot their password, you must also reset it below after clearing the lock.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={handleClearSecurityLock}
                                  disabled={loading}
                                  variant="destructive"
                                  size="sm"
                                  className="w-full"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {loading ? "Clearing..." : "Clear Security Lock"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Admin Override - Disable Security Code */}
                        {securitySettings.security_code_enabled && (
                          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Admin Override</p>
                                    <p className="text-sm text-muted-foreground">
                                      Security code verification is currently enabled for this user. You can disable it
                                      if necessary. The user will be able to re-enable it later in their security
                                      settings.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={handleDisableSecurityCode}
                                  disabled={disableSecurityCodeLoading}
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {disableSecurityCodeLoading ? "Disabling..." : "Disable Security Code Verification"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Email 2FA Settings Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>View and manage email-based 2FA status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingSecuritySettings ? (
                      <div className="text-center py-8 text-muted-foreground">Loading security settings...</div>
                    ) : !securitySettings ? (
                      <Card className="bg-muted/50 border-muted">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Email 2FA not configured</p>
                              <p className="text-sm text-muted-foreground">
                                This user has not set up email two-factor authentication.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        <div>
                          <Label className="text-muted-foreground">Email 2FA Status</Label>
                          <div className="flex items-center gap-2 mt-1">
                            {securitySettings.email_2fa_enabled ? (
                              <>
                                <Mail className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Enabled</span>
                              </>
                            ) : (
                              <>
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Disabled</span>
                              </>
                            )}
                          </div>
                        </div>

                        {securitySettings.email_2fa_enabled && (
                          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">Admin Override</p>
                                    <p className="text-sm text-muted-foreground">
                                      Email 2FA is currently enabled for this user. You can disable it if necessary. The
                                      user will need to re-enable it from their security settings.
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={handleDisableEmail2FA}
                                  disabled={disableEmail2FALoading}
                                  variant="outline"
                                  size="sm"
                                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  {disableEmail2FALoading ? "Disabling..." : "Disable Email 2FA"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pwdres" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Reset User Password
                    </CardTitle>
                    <CardDescription>
                      Set a new password for this user. The user will be able to log in with this new password
                      immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="new_password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className={newPassword && newPassword.length < 8 ? "border-destructive" : ""}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {newPassword.length > 0 ? `${newPassword.length} characters` : "Minimum 8 characters required"}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="confirm_password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className={confirmPassword && confirmPassword !== newPassword ? "border-destructive" : ""}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <Button
                      onClick={handleResetPassword}
                      disabled={
                        resetPasswordLoading ||
                        !newPassword ||
                        !confirmPassword ||
                        newPassword !== confirmPassword ||
                        newPassword.length < 8
                      }
                      className="w-full"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {resetPasswordLoading ? "Resetting..." : "Reset Password"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
