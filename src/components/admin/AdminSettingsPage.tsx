import { useState, useEffect } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Settings, User, Lock, UserPlus, Mail, Key, Camera, Upload, Trash2, Shield, ShieldCheck, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Dynamic super admin email - fetched from website_settings

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  email_2fa_enabled: boolean;
}

export const AdminSettingsPage = () => {
  const { toast } = useToast();
  const { user, profile, uploadAvatar } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [superAdminEmail, setSuperAdminEmail] = useState<string>('superadmin@capinvbank.com');
  
  // Edit dialog states
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', email: '' });
  
  // Password change states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordAdmin, setPasswordAdmin] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Default admin verification
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingAction, setPendingAction] = useState<'password' | 'profile' | null>(null);
  
  // Add Admin states
  const [showAddAdminDialog, setShowAddAdminDialog] = useState(false);
  const [adminForm, setAdminForm] = useState({
    email: "",
    fullName: "",
    password: "",
    confirmPassword: ""
  });
  
  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);

  // Fetch super admin email from website_settings
  useEffect(() => {
    const fetchSuperAdminEmail = async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('super_admin_email')
        .limit(1)
        .single();
      if (data?.super_admin_email) {
        setSuperAdminEmail(data.super_admin_email);
      }
    };
    fetchSuperAdminEmail();
  }, []);

  useEffect(() => {
    if (superAdminEmail) {
      fetchAdminUsers();
    }
  }, [superAdminEmail]);

  const fetchAdminUsers = async () => {
    setLoadingAdmins(true);
    try {
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (rolesError) throw rolesError;
      
      if (adminRoles && adminRoles.length > 0) {
        const adminIds = adminRoles.map(r => r.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', adminIds);
        
        if (profilesError) throw profilesError;
        
        // Fetch security settings for 2FA status
        const { data: securityData } = await supabase
          .from('user_security')
          .select('user_id, email_2fa_enabled')
          .in('user_id', adminIds);
        
        const adminsWithSecurity = (profiles || []).map(p => ({
          ...p,
          email_2fa_enabled: securityData?.find(s => s.user_id === p.id)?.email_2fa_enabled || false
        }));
        
        // Sort: default admin first, then alphabetically
        adminsWithSecurity.sort((a, b) => {
          if (a.email === superAdminEmail) return -1;
          if (b.email === superAdminEmail) return 1;
          return a.full_name.localeCompare(b.full_name);
        });
        
        setAdminUsers(adminsWithSecurity);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast({
        title: "Error",
        description: "Failed to load administrator accounts",
        variant: "destructive",
      });
    } finally {
      setLoadingAdmins(false);
    }
  };

  const isDefaultAdmin = (email: string) => email === superAdminEmail;
  const isCurrentUser = (adminId: string) => adminId === user?.id;
  const currentUserIsDefaultAdmin = profile?.email === superAdminEmail;

  const handleToggle2FA = async (admin: AdminUser, enabled: boolean) => {
    try {
      // Upsert security settings
      const { error } = await supabase
        .from('user_security')
        .upsert({
          user_id: admin.id,
          email_2fa_enabled: enabled,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: enabled ? "2FA Enabled" : "2FA Disabled",
        description: `Email 2FA has been ${enabled ? 'enabled' : 'disabled'} for ${admin.full_name}.`
      });

      fetchAdminUsers();
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      toast({
        title: "Error",
        description: "Failed to update 2FA settings",
        variant: "destructive",
      });
    }
  };

  const handleEditAdmin = (admin: AdminUser) => {
    // Check if trying to edit default admin and current user is not default admin
    if (isDefaultAdmin(admin.email) && !currentUserIsDefaultAdmin) {
      toast({
        title: "Access Denied",
        description: "Only the default administrator can edit their own profile.",
        variant: "destructive",
      });
      return;
    }
    
    setEditingAdmin(admin);
    setEditForm({ full_name: admin.full_name, email: admin.email });
    setShowEditDialog(true);
  };

  const handleSaveProfile = async () => {
    if (!editingAdmin) return;
    
    const isEditingDefaultAdmin = isDefaultAdmin(editingAdmin.email);
    const emailChanged = editForm.email !== editingAdmin.email;
    
    // Only the default admin can change their own email
    // Other admins cannot change the default admin's email
    if (isEditingDefaultAdmin && emailChanged && !currentUserIsDefaultAdmin) {
      toast({
        title: "Access Denied",
        description: "Only the default administrator can change their own email.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      // Update name in profiles (always allowed)
      const { error: nameError } = await supabase
        .from('profiles')
        .update({ full_name: editForm.full_name })
        .eq('id', editingAdmin.id);

      if (nameError) throw nameError;
      
      // If email changed, use edge function to update both auth.users and profiles
      if (emailChanged) {
        const { data, error } = await supabase.functions.invoke('admin-update-user-email', {
          body: { 
            user_id: editingAdmin.id, 
            new_email: editForm.email 
          }
        });
        
        if (error || !data?.success) {
          throw new Error(data?.error || 'Failed to update email');
        }
        
        // If the default admin changed their own email, update the super_admin_email setting
        if (isEditingDefaultAdmin && currentUserIsDefaultAdmin) {
          const { error: settingsError } = await supabase
            .from('website_settings')
            .update({ super_admin_email: editForm.email })
            .not('id', 'is', null); // Update all rows (should only be one)
          
          if (settingsError) {
            console.error('Failed to update super_admin_email setting:', settingsError);
          } else {
            // Update local state so the UI reflects the change immediately
            setSuperAdminEmail(editForm.email);
          }
        }
      }

      toast({
        title: "Profile Updated",
        description: `Profile for ${editForm.full_name} has been updated.`
      });

      setShowEditDialog(false);
      setEditingAdmin(null);
      fetchAdminUsers();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (admin: AdminUser) => {
    // Check if trying to change default admin password and current user is not default admin
    if (isDefaultAdmin(admin.email) && !currentUserIsDefaultAdmin) {
      toast({
        title: "Access Denied",
        description: "Only the default administrator can change their own password.",
        variant: "destructive",
      });
      return;
    }
    
    setPasswordAdmin(admin);
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordDialog(true);
  };

  const handleSavePassword = async () => {
    if (!passwordAdmin) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // If changing own password, use updateUser
      if (isCurrentUser(passwordAdmin.id)) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (error) throw error;
      } else {
        // Use admin reset password function for other admins
        const { data, error } = await supabase.functions.invoke('admin-reset-password', {
          body: {
            user_id: passwordAdmin.id,
            new_password: newPassword
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to reset password');
      }

      toast({
        title: "Password Updated",
        description: `Password for ${passwordAdmin.full_name} has been updated successfully.`
      });

      setShowPasswordDialog(false);
      setPasswordAdmin(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user-completely', {
        body: { userId: adminToDelete.id }
      });

      if (error) {
        // Extract detailed error from FunctionsHttpError response body
        if (error instanceof FunctionsHttpError) {
          let errorMessage = 'Failed to delete administrator';
          try {
            const errBody = await error.context.json();
            errorMessage = errBody?.details || errBody?.error || errorMessage;
          } catch {
            try {
              const errText = await error.context.text();
              if (errText) errorMessage = errText;
            } catch {
              // Use default
            }
          }
          throw new Error(errorMessage);
        }
        throw error;
      }
      if (!data?.success) throw new Error(data?.error || 'Failed to delete admin');

      toast({
        title: "Admin Deleted",
        description: `Administrator ${adminToDelete.full_name} has been removed.`
      });

      setShowDeleteDialog(false);
      setAdminToDelete(null);
      fetchAdminUsers();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete administrator",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (adminForm.password !== adminForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (!adminForm.email || !adminForm.fullName || !adminForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate a random 6-digit security code for admin accounts
      const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: adminForm.email,
          password: adminForm.password,
          full_name: adminForm.fullName,
          role: 'admin',
          security_code: securityCode
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create admin');

      toast({
        title: "Admin Created",
        description: `Administrator ${adminForm.fullName} created successfully.`,
      });

      setShowAddAdminDialog(false);
      setAdminForm({ email: "", fullName: "", password: "", confirmPassword: "" });
      fetchAdminUsers();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create administrator",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, admin: AdminUser) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPG, PNG, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Only allow current user to upload their own avatar
    if (!isCurrentUser(admin.id)) {
      toast({
        title: "Access Denied",
        description: "You can only change your own profile photo.",
        variant: "destructive",
      });
      return;
    }

    setUploadingPhoto(true);
    try {
      const { error } = await uploadAvatar(file);
      if (error) throw error;

      toast({
        title: "Profile photo updated",
        description: "Your profile photo has been updated successfully.",
      });
      fetchAdminUsers();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to update profile photo.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Administrator Management
              </CardTitle>
              <CardDescription>
                Manage administrator accounts, security settings, and access controls
              </CardDescription>
            </div>
            {currentUserIsDefaultAdmin && (
              <Dialog open={showAddAdminDialog} onOpenChange={setShowAddAdminDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Administrator
                  </Button>
                </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Administrator</DialogTitle>
                  <DialogDescription>
                    Add a new administrator account with full system access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adminEmail">Email Address *</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminFullName">Full Name *</Label>
                    <Input
                      id="adminFullName"
                      value={adminForm.fullName}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPassword">Password *</Label>
                    <Input
                      id="adminPassword"
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminConfirmPassword">Confirm Password *</Label>
                    <Input
                      id="adminConfirmPassword"
                      type="password"
                      value={adminForm.confirmPassword}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddAdminDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddAdmin}
                    disabled={loading || !adminForm.email || !adminForm.fullName || !adminForm.password}
                  >
                    {loading ? "Creating..." : "Create Admin"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingAdmins ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {adminUsers.map((admin) => (
                <Card key={admin.id} className={isDefaultAdmin(admin.email) ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                    <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={admin.avatar_url || ""} alt={admin.full_name} />
                            <AvatarFallback className="text-lg bg-primary/10">
                              {admin.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {isCurrentUser(admin.id) && (
                            <label className="absolute -bottom-1 -right-1 cursor-pointer">
                              <Input
                                type="file"
                                accept="image/jpeg,image/png,image/gif"
                                onChange={(e) => handleAvatarUpload(e, admin)}
                                disabled={uploadingPhoto}
                                className="hidden"
                              />
                              <div className="bg-primary text-primary-foreground rounded-full p-1">
                                <Camera className="h-3 w-3" />
                              </div>
                            </label>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{admin.full_name}</h3>
                            {isDefaultAdmin(admin.email) && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Default Admin
                              </Badge>
                            )}
                            {isCurrentUser(admin.id) && (
                              <Badge variant="secondary">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <Shield className={`h-4 w-4 ${admin.email_2fa_enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                              <span className="text-sm">
                                {admin.email_2fa_enabled ? '2FA Enabled' : '2FA Disabled'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-row flex-wrap lg:flex-col gap-2 lg:min-w-[200px]">
                        {/* 2FA Toggle */}
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                          <Label htmlFor={`2fa-${admin.id}`} className="text-sm">Email 2FA</Label>
                          <Switch
                            id={`2fa-${admin.id}`}
                            checked={admin.email_2fa_enabled}
                            onCheckedChange={(enabled) => handleToggle2FA(admin, enabled)}
                          />
                        </div>
                        
                        {/* Edit Profile Button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditAdmin(admin)}
                          disabled={isDefaultAdmin(admin.email) && !currentUserIsDefaultAdmin}
                        >
                          <Edit className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Edit Profile</span>
                        </Button>
                        
                        {/* Change Password Button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePasswordChange(admin)}
                          disabled={isDefaultAdmin(admin.email) && !currentUserIsDefaultAdmin}
                        >
                          <Key className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Change Password</span>
                        </Button>
                        
                        {/* Delete Button - Only shown for non-default admins, and only if current user is default admin */}
                         {!isDefaultAdmin(admin.email) && currentUserIsDefaultAdmin && (
                           <Button 
                             variant="destructive" 
                             size="sm"
                             onClick={() => {
                               setAdminToDelete(admin);
                               setShowDeleteDialog(true);
                             }}
                           >
                              <Trash2 className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Delete</span>
                           </Button>
                         )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Administrator Profile</DialogTitle>
            <DialogDescription>
              Update profile information for {editingAdmin?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Full Name</Label>
              <Input
                id="editName"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editEmail">Email Address</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordAdmin?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePassword} 
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Administrator?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {adminToDelete?.full_name}? This action cannot be undone.
              All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdmin}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete Administrator"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
