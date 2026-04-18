
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Users, Search, CheckCircle, Lock, Edit, Plus, Trash2, UserPlus, CreditCard, Eye, EyeOff, Shield, Camera, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { UserEditModal } from "./UserEditModal";
import { EmailAvailabilityChecker } from "./EmailAvailabilityChecker";

interface User {
  id: string;
  email: string;
  full_name: string;
  middle_name?: string;
  role: string;
  created_at: string;
  account_locked?: boolean;
  phone?: string;
  date_of_birth?: string;
  street_address?: string;
  apt_suite?: string;
  city?: string;
  state_region?: string;
  zip_code?: string;
  country?: string;
}

type AccountType = 
  | 'checking'
  | 'savings'
  | 'premium_checking'
  | 'premium_savings'
  | 'high_yield_savings'
  | 'trust_account'
  | 'escrow_account'
  | 'investment_account'
  | 'business_account';

export const AdminUsersTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminCount, setAdminCount] = useState(0);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [selectedUserForAccount, setSelectedUserForAccount] = useState<User | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    email: "",
    password: "",
    title: "",
    firstName: "",
    middleName: "",
    lastName: "",
    username: "",
    role: "user",
    phone: "",
    date_of_birth: "",
    address: "",
    nok_full_name: "",
    nok_relationship: "",
    nok_phone_number: "",
    nok_email: "",
    security_code: "",
    confirm_security_code: "",
    create_account: true,
    account_type: "checking" as AccountType,
    account_currency: "USD",
    required_initial_deposit: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAccountForm, setNewAccountForm] = useState<{
    account_type: AccountType;
    balance: string;
    currency: string;
    useAutoGenerate: boolean;
    customAccountNumber: string;
    requiredInitialDeposit: string;
  }>({
    account_type: "checking",
    balance: "0",
    currency: "USD",
    useAutoGenerate: true,
    customAccountNumber: "",
    requiredInitialDeposit: "",
  });
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles separately
      if (profiles) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', profiles.map(p => p.id));

        const usersWithRoles = profiles.map(profile => ({
          ...profile,
          role: roles?.find(r => r.user_id === profile.id)?.role || 'user'
        }));

        // Sort to ensure admin users are at the top
        const sortedUsers = usersWithRoles.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (b.role === 'admin' && a.role !== 'admin') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setUsers(sortedUsers);
        
        // Count admin users
        const adminUserCount = sortedUsers.filter(user => user.role === 'admin').length;
        setAdminCount(adminUserCount);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserStatusToggle = async (userId: string, currentlyLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_locked: !currentlyLocked })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User account ${!currentlyLocked ? 'locked' : 'unlocked'} successfully`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Use the comprehensive deletion edge function that handles both public data and auth records
      const { data, error } = await supabase.functions.invoke('delete-user-completely', {
        body: { userId }
      });

      if (error) {
        // Extract detailed error from FunctionsHttpError response body
        if (error instanceof FunctionsHttpError) {
          let errorMessage = 'Failed to delete user';
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

      if (!data || !data.success) {
        throw new Error(data?.error || "Failed to delete user");
      }

      toast({
        title: "Success",
        description: "User and all authentication records deleted successfully",
      });

      fetchUsers();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteConfirmationText("");
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  // Calculate max date for 18+ age requirement
  const getMaxDateOfBirth = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  const handleAddUser = async () => {
    // Validate all required fields
    const requiredFields = [
      { field: newUserForm.email, name: 'Email' },
      { field: newUserForm.title, name: 'Title' },
      { field: newUserForm.firstName, name: 'First Name' },
      { field: newUserForm.lastName, name: 'Last Name' },
      { field: newUserForm.password, name: 'Password' },
      { field: newUserForm.date_of_birth, name: 'Date of Birth' },
      { field: newUserForm.phone, name: 'Phone Number' },
      { field: newUserForm.address, name: 'Address' },
      { field: newUserForm.username, name: 'Username' },
      { field: newUserForm.nok_full_name, name: 'Next of Kin Full Name' },
      { field: newUserForm.nok_relationship, name: 'Next of Kin Relationship' },
      { field: newUserForm.nok_phone_number, name: 'Next of Kin Phone Number' },
      { field: newUserForm.nok_email, name: 'Next of Kin Email' },
      { field: newUserForm.security_code, name: 'Security Code' },
      { field: newUserForm.confirm_security_code, name: 'Confirm Security Code' },
    ];
    
    const missingFields = requiredFields.filter(f => !f.field?.trim()).map(f => f.name);
    
    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: `Please fill in all required fields: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? ` and ${missingFields.length - 3} more` : ''}`,
        variant: "destructive",
      });
      return;
    }

    // Validate age is 18+ (date_of_birth is now required)
    const birthDate = new Date(newUserForm.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    
    if (actualAge < 18) {
      toast({
        title: "Error",
        description: "User must be at least 18 years old",
        variant: "destructive",
      });
      return;
    }

    // Construct full name from parts
    const fullName = [
      newUserForm.title,
      newUserForm.firstName,
      newUserForm.middleName,
      newUserForm.lastName
    ].filter(Boolean).join(' ');

    if (newUserForm.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    // Validate security code
    if (!newUserForm.security_code || newUserForm.security_code.length !== 6) {
      toast({
        title: "Error",
        description: "Security code must be exactly 6 digits",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{6}$/.test(newUserForm.security_code)) {
      toast({
        title: "Error",
        description: "Security code must contain only digits",
        variant: "destructive",
      });
      return;
    }

    if (newUserForm.security_code !== newUserForm.confirm_security_code) {
      toast({
        title: "Error",
        description: "Security codes do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Creating user with:', { email: newUserForm.email, full_name: fullName });
      
      // Call the edge function to create user
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserForm.email,
          password: newUserForm.password,
          full_name: fullName,
          username: newUserForm.username || undefined,
          role: newUserForm.role || 'user',
          security_code: newUserForm.security_code,
        },
      });

      // Handle edge function errors properly
      if (error) {
        console.error('Error invoking edge function:', error);
        
        // For FunctionsHttpError, extract the actual error message from the response body
        if (error instanceof FunctionsHttpError) {
          let errorMessage = 'Failed to create user';
          try {
            const errorBody = await error.context.json();
            errorMessage = errorBody?.details || errorBody?.error || errorMessage;
          } catch (parseError) {
            // If we can't parse JSON, try getting text
            try {
              const errorText = await error.context.text();
              if (errorText) errorMessage = errorText;
            } catch {
              // Use default message
            }
          }
          throw new Error(errorMessage);
        }
        
        throw new Error(error.message || 'Failed to create user');
      }

      // Also check for error in successful response (fallback)
      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.details || data.error);
      }

      if (!data?.success) {
        console.error('Edge function did not return success:', data);
        throw new Error(data?.details || 'Failed to create user');
      }

      const userId = data.user?.id;
      if (!userId) {
        throw new Error("Failed to create user - no user ID returned");
      }

      console.log('User created via edge function:', userId);

      // Upload avatar if provided
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });
        if (uploadError) {
          console.error('Error uploading avatar:', uploadError);
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          avatarUrl = urlData.publicUrl;
        }
      }

      // Update additional profile data
      const profileUpdateData: Record<string, any> = {
        phone: newUserForm.phone || null,
        date_of_birth: newUserForm.date_of_birth || null,
        address: newUserForm.address || null,
      };
      if (avatarUrl) {
        profileUpdateData.avatar_url = avatarUrl;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Create Next-Of-Kin record if data is provided
      if (newUserForm.nok_full_name) {
        const { error: nokError } = await supabase
          .from('next_of_kin' as any)
          .insert({
            user_id: userId,
            full_name: newUserForm.nok_full_name,
            relationship: newUserForm.nok_relationship || null,
            phone_number: newUserForm.nok_phone_number || null,
            email: newUserForm.nok_email || null,
          });

        if (nokError) {
          console.error('Error creating next-of-kin:', nokError);
          // Don't throw error here as the main user creation was successful
        }
      }

      // Wait for profile to be created by the trigger before proceeding
      let profileReady = false;
      for (let i = 0; i < 10; i++) {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (profileCheck) {
          profileReady = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!profileReady) {
        console.error('Profile was not created in time for user:', userId);
        toast({
          title: "Warning",
          description: "User was created but profile setup is still processing. Please refresh shortly.",
          variant: "destructive",
        });
      }

      // Create account if requested
      if (newUserForm.create_account && profileReady) {
        const { data: acctNumData, error: acctNumError } = await supabase
          .rpc('generate_account_number', { account_type: newUserForm.account_type });

        if (acctNumError) {
          console.error('Error generating account number:', acctNumError);
        } else {
          const depositAmount = newUserForm.required_initial_deposit 
            ? parseFloat(newUserForm.required_initial_deposit) 
            : null;

          const { error: acctError } = await (supabase as any)
            .from('accounts')
            .insert({
              user_id: userId,
              account_type: newUserForm.account_type,
              account_number: acctNumData as string,
              balance: 0,
              currency: newUserForm.account_currency,
              status: 'awaiting_deposit',
              required_initial_deposit: depositAmount,
            });

          if (acctError) {
            console.error('Error creating account:', acctError);
          }
        }
      }

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setNewUserForm({ 
        email: "", 
        password: "",
        title: "",
        firstName: "",
        middleName: "",
        lastName: "",
        username: "",
        role: "user", 
        phone: "",
        date_of_birth: "",
        address: "",
        nok_full_name: "",
        nok_relationship: "",
        nok_phone_number: "",
        nok_email: "",
        security_code: "",
        confirm_security_code: "",
        create_account: true,
        account_type: "checking" as AccountType,
        account_currency: "USD",
        required_initial_deposit: "",
      });
      setShowPassword(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setAddUserDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const validateCustomAccountNumber = (accountNumber: string): string | null => {
    if (!accountNumber) return "Account number is required";
    if (accountNumber.length !== 16) return "Account number must be exactly 16 characters";
    
    // Validate format: XXX-000XXXXXXXXX
    if (!/^[A-Z]{3}-\d{12}$/.test(accountNumber)) {
      return "Format must be XXX-000XXXXXXXXX (3 letters, hyphen, 12 digits)";
    }
    
    // Check if prefix is valid
    const validPrefixes = ['CHK', 'SAV', 'PCK', 'PSV', 'HYS', 'TST', 'ESC', 'INV', 'BUS'];
    const prefix = accountNumber.substring(0, 3);
    if (!validPrefixes.includes(prefix)) {
      return `Invalid prefix. Must be one of: ${validPrefixes.join(', ')}`;
    }
    
    return null;
  };

  const handleAddAccount = async () => {
    if (!selectedUserForAccount) return;

    // Validate custom account number if not using auto-generation
    if (!newAccountForm.useAutoGenerate) {
      const validationError = validateCustomAccountNumber(newAccountForm.customAccountNumber);
      if (validationError) {
        toast({
          title: "Error",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      // Check if custom account number already exists
      const { data: existingAccount, error: checkError } = await supabase
        .from('accounts')
        .select('account_number')
        .eq('account_number', newAccountForm.customAccountNumber)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        toast({
          title: "Error",
          description: "Failed to validate account number uniqueness",
          variant: "destructive",
        });
        return;
      }

      if (existingAccount) {
        toast({
          title: "Error",
          description: "This account number already exists. Please choose a different one.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      console.log('Creating account with type:', newAccountForm.account_type);
      
      let accountNumber;
      
      if (newAccountForm.useAutoGenerate) {
        // Generate account number using the database function with account type
        const { data, error: numberError } = await supabase
          .rpc('generate_account_number', { account_type: newAccountForm.account_type });

        if (numberError) {
          console.error('Error generating account number:', numberError);
          throw numberError;
        }
        accountNumber = data as string;
      } else {
        // Use custom account number
        accountNumber = newAccountForm.customAccountNumber;
      }

      console.log('Using account number:', accountNumber);

      // Validate account type format (must use underscores, not spaces)
      const validAccountTypes: AccountType[] = [
        'checking', 'savings', 'premium_checking', 'premium_savings',
        'high_yield_savings', 'trust_account', 'escrow_account',
        'investment_account', 'business_account'
      ];

      if (!validAccountTypes.includes(newAccountForm.account_type as AccountType)) {
        toast({
          title: "Error",
          description: `Invalid account type: ${newAccountForm.account_type}. Please refresh the page and try again.`,
          variant: "destructive",
        });
        return;
      }

      console.log('Validated account type:', newAccountForm.account_type);

      // Parse required initial deposit if provided
      const depositAmount = newAccountForm.requiredInitialDeposit 
        ? parseFloat(newAccountForm.requiredInitialDeposit) 
        : null;

      const { data: accountData, error } = await (supabase as any)
        .from('accounts')
        .insert({
          user_id: selectedUserForAccount.id,
          account_type: newAccountForm.account_type as AccountType,
          account_number: accountNumber,
          balance: parseFloat(newAccountForm.balance),
          currency: newAccountForm.currency,
          status: 'active',
          required_initial_deposit: depositAmount,
        });

      if (error) {
        console.error('Error inserting account:', error);
        throw error;
      }

      console.log('Account created successfully:', accountData);

      toast({
        title: "Success",
        description: `${newAccountForm.account_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} account created successfully for ${selectedUserForAccount.full_name}`,
      });

      setNewAccountForm({ 
        account_type: "checking", 
        balance: "0",
        currency: "USD",
        useAutoGenerate: true, 
        customAccountNumber: "",
        requiredInitialDeposit: "",
      });
      setAddAccountDialogOpen(false);
      setSelectedUserForAccount(null);
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: `Failed to create account: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Filter out admin users - they should be managed in Admin Settings
  const filteredUsers = users
    .filter(user => user.role !== 'admin')
    .filter(user =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">System Users</CardTitle>
              <CardDescription>
                Manage user accounts and access permissions
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {filteredUsers.length} users
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setAddUserDialogOpen(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add User</span>
              </Button>
            </div>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{user.full_name}</h3>
                          <p className="text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={user.role === 'admin' ? 'default' : 'outline'} 
                              className="capitalize"
                            >
                              {user.role}
                            </Badge>
                            <Badge className={user.account_locked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                              {user.account_locked ? 'Locked' : 'Active'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setEditModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">User Profile Settings</span>
                          </Button>
                          {user.role !== 'admin' && (
                            <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               setSelectedUserForAccount(user);
                               setAddAccountDialogOpen(true);
                             }}
                           >
                             <CreditCard className="h-4 w-4 sm:mr-1" />
                             <span className="hidden sm:inline">Add Account</span>
                           </Button>
                          )}
                         <Button
                           variant={user.account_locked ? "default" : "destructive"}
                           size="sm"
                           onClick={() => handleUserStatusToggle(user.id, user.account_locked || false)}
                         >
                           {user.account_locked ? (
                             <>
                               <CheckCircle className="h-4 w-4 sm:mr-1" />
                               <span className="hidden sm:inline">Unlock Account</span>
                             </>
                           ) : (
                             <>
                               <Lock className="h-4 w-4 sm:mr-1" />
                               <span className="hidden sm:inline">Lock Account</span>
                             </>
                           )}
                         </Button>
                           {user.role !== 'admin' && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => {
                                 setUserToDelete(user);
                                 setDeleteDialogOpen(true);
                               }}
                               title="Delete user"
                             >
                               <Trash2 className="h-4 w-4 sm:mr-1" />
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

      {/* User Edit Modal */}
      <UserEditModal
        user={editingUser}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onUserUpdated={() => {
          fetchUsers();
          setEditingUser(null);
        }}
      />

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {newUserForm.firstName?.[0] || ''}{newUserForm.lastName?.[0] || ''}
                    </AvatarFallback>
                  )}
                </Avatar>
                <label
                  htmlFor="new-user-avatar"
                  className="absolute bottom-0 right-0 p-1 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input
                  id="new-user-avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
              {avatarPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" /> Remove photo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Upload a profile photo (optional)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
                <EmailAvailabilityChecker email={newUserForm.email} />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Security Code Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Security Code Setup *</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This 6-digit code will be required during login verification and for secure transactions.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>6-Digit Security Code *</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={newUserForm.security_code}
                      onChange={(value) => setNewUserForm(prev => ({ ...prev, security_code: value }))}
                    >
                      <InputOTPGroup className="gap-1">
                        <InputOTPSlot index={0} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={1} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={2} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={3} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={4} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={5} className="w-8 h-10 text-center border rounded" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confirm Security Code *</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={newUserForm.confirm_security_code}
                      onChange={(value) => setNewUserForm(prev => ({ ...prev, confirm_security_code: value }))}
                    >
                      <InputOTPGroup className="gap-1">
                        <InputOTPSlot index={0} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={1} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={2} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={3} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={4} className="w-8 h-10 text-center border rounded" />
                        <InputOTPSlot index={5} className="w-8 h-10 text-center border rounded" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {newUserForm.security_code && newUserForm.confirm_security_code && 
                   newUserForm.security_code !== newUserForm.confirm_security_code && (
                    <p className="text-sm text-destructive text-center">Security codes do not match</p>
                  )}
                  {newUserForm.security_code && newUserForm.confirm_security_code && 
                   newUserForm.security_code === newUserForm.confirm_security_code && 
                   newUserForm.security_code.length === 10 && (
                    <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Security codes match
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Name Fields - Matching Account Application Design */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Select 
                  value={newUserForm.title} 
                  onValueChange={(value) => setNewUserForm(prev => ({ ...prev, title: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Rev.'].map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newUserForm.firstName}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={newUserForm.middleName}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, middleName: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newUserForm.lastName}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                value={newUserForm.username}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="johndoe"
              />
              <p className="text-xs text-muted-foreground mt-1">
                User can log in with this username instead of email
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={newUserForm.date_of_birth}
                  max={getMaxDateOfBirth()}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be 18 years or older
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newUserForm.address}
                onChange={(e) => setNewUserForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State 12345, Country"
              />
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Next-Of-Kin Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Next of Kin Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nok_full_name">Full Name</Label>
                  <Input
                    id="nok_full_name"
                    value={newUserForm.nok_full_name}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, nok_full_name: e.target.value }))}
                    placeholder="Next of kin full name"
                  />
                </div>
                <div>
                  <Label htmlFor="nok_relationship">Relationship</Label>
                  <Select value={newUserForm.nok_relationship} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, nok_relationship: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="relative">Other Relative</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nok_phone_number">Phone Number</Label>
                  <Input
                    id="nok_phone_number"
                    type="tel"
                    value={newUserForm.nok_phone_number}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, nok_phone_number: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="nok_email">Email Address</Label>
                  <Input
                    id="nok_email"
                    type="email"
                    value={newUserForm.nok_email}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, nok_email: e.target.value }))}
                    placeholder="nextofkin@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Account Creation Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Account Details</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-account"
                    checked={newUserForm.create_account}
                    onCheckedChange={(checked) => setNewUserForm(prev => ({ ...prev, create_account: checked }))}
                  />
                  <Label htmlFor="create-account" className="text-sm">Create account</Label>
                </div>
              </div>

              {newUserForm.create_account && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Account Type</Label>
                      <Select 
                        value={newUserForm.account_type} 
                        onValueChange={(value) => setNewUserForm(prev => ({ ...prev, account_type: value as AccountType }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="premium_checking">Premium Checking</SelectItem>
                          <SelectItem value="premium_savings">Premium Savings</SelectItem>
                          <SelectItem value="high_yield_savings">High Yield Savings</SelectItem>
                          <SelectItem value="trust_account">Trust Account</SelectItem>
                          <SelectItem value="escrow_account">Escrow Account</SelectItem>
                          <SelectItem value="investment_account">Investment Account</SelectItem>
                          <SelectItem value="business_account">Business Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select 
                        value={newUserForm.account_currency} 
                        onValueChange={(value) => setNewUserForm(prev => ({ ...prev, account_currency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">🇺🇸 USD</SelectItem>
                          <SelectItem value="EUR">🇪🇺 EUR</SelectItem>
                          <SelectItem value="GBP">🇬🇧 GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Required Initial Deposit (Optional)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {newUserForm.account_currency}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newUserForm.required_initial_deposit}
                        onChange={(e) => setNewUserForm(prev => ({ ...prev, required_initial_deposit: e.target.value }))}
                        placeholder="0.00"
                        className="pl-14"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Amount required for account activation. Leave empty if not applicable.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>
              Create a new bank account for {selectedUserForAccount?.full_name}.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="mb-4">
            <AlertDescription className="text-sm">
              ⚠️ <strong>Important:</strong> Account numbers cannot be changed once created.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="account_type">Account Type</Label>
              <Select value={newAccountForm.account_type} onValueChange={(value) => setNewAccountForm(prev => ({ ...prev, account_type: value as AccountType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="premium_checking">Premium Checking</SelectItem>
                  <SelectItem value="premium_savings">Premium Savings</SelectItem>
                  <SelectItem value="high_yield_savings">High Yield Savings</SelectItem>
                  <SelectItem value="trust_account">Trust Account</SelectItem>
                  <SelectItem value="escrow_account">Escrow Account</SelectItem>
                  <SelectItem value="investment_account">Investment Account</SelectItem>
                  <SelectItem value="business_account">Business Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Account Number Generation</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-generate"
                  checked={newAccountForm.useAutoGenerate}
                  onCheckedChange={(checked) => setNewAccountForm(prev => ({ 
                    ...prev, 
                    useAutoGenerate: checked,
                    customAccountNumber: checked ? "" : prev.customAccountNumber
                  }))}
                />
                <Label htmlFor="auto-generate" className="text-sm">
                  Auto-generate account number
                </Label>
              </div>
              
              {!newAccountForm.useAutoGenerate && (
                <div className="space-y-2">
                  <Label htmlFor="custom-account">Custom Account Number</Label>
                  <Input
                    id="custom-account"
                    value={newAccountForm.customAccountNumber}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      if (value.length <= 16) {
                        setNewAccountForm(prev => ({ ...prev, customAccountNumber: value }));
                      }
                    }}
                    placeholder="CHK-000123456789"
                    maxLength={16}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: XXX-000XXXXXXXXX (e.g., CHK-000123456789). Must be exactly 16 characters.
                  </p>
                  {newAccountForm.customAccountNumber && validateCustomAccountNumber(newAccountForm.customAccountNumber) && (
                    <p className="text-xs text-red-600">
                      {validateCustomAccountNumber(newAccountForm.customAccountNumber)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="balance">Initial Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={newAccountForm.balance}
                onChange={(e) => setNewAccountForm(prev => ({ ...prev, balance: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="requiredDeposit">Required Initial Deposit (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {newAccountForm.currency}
                </span>
                <Input
                  id="requiredDeposit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAccountForm.requiredInitialDeposit}
                  onChange={(e) => setNewAccountForm(prev => ({ ...prev, requiredInitialDeposit: e.target.value }))}
                  placeholder="0.00"
                  className="pl-14"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Amount required for account activation. Leave empty if not applicable.
              </p>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={newAccountForm.currency} onValueChange={(value) => setNewAccountForm(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">🇺🇸 USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">🇪🇺 EUR - Euro</SelectItem>
                  <SelectItem value="GBP">🇬🇧 GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setAddAccountDialogOpen(false);
                setNewAccountForm({ 
                  account_type: "checking", 
                  balance: "0",
                  currency: "USD",
                  useAutoGenerate: true, 
                  customAccountNumber: "",
                  requiredInitialDeposit: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddAccount}
              disabled={!newAccountForm.useAutoGenerate && !!validateCustomAccountNumber(newAccountForm.customAccountNumber)}
            >
              Create Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This action will permanently delete {userToDelete?.full_name} and all associated data including authentication records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deleteConfirmation">
                To confirm deletion, please type the user's email address: <strong>{userToDelete?.email}</strong>
              </Label>
              <Input
                id="deleteConfirmation"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type the email address to confirm"
                className="mt-2"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmationText("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              disabled={deleteConfirmationText !== userToDelete?.email}
              onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
            >
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
