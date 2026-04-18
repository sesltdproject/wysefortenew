import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AccountLockedDialog } from "@/components/AccountLockedDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Vault, CreditCard, TrendingUp, Shield, LogOut, User, Bell, Settings, DollarSign, FileText, ArrowLeftRight, BarChart3, Menu, X, CheckCircle, AlertCircle, Eye, EyeOff, Lock, Calendar, Upload } from "lucide-react";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { useSecureNavigation } from "@/hooks/useSecureNavigation";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { formatCurrencyAmount, formatAccountType } from "@/lib/utils";
import { Transactions } from "@/pages/user/Transactions";
import { Transfers } from "@/pages/user/Transfers";
import { Profile } from "@/pages/user/Profile";
import { Security } from "@/pages/user/Security";
import { KYC } from "@/pages/user/KYC";
import { Support } from "@/pages/user/Support";
import { Statements } from "@/pages/user/Statements";
import { PayBills } from "@/pages/user/PayBills";
import { Loans } from "@/pages/user/Loans";
import { Deposits } from "@/pages/user/Deposits";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";

import CurrencyTicker from "@/components/CurrencyTicker";
import { useTranslation } from "@/i18n";
const Dashboard = () => {
  const {
    user,
    signOut,
    profile,
    accountLockedDuringSignIn,
    clearAccountLockedState
  } = useAuth();
  const { settings, isLoading: settingsLoading } = useWebsiteSettings();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingLoanPayments, setPendingLoanPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccountLockedDialog, setShowAccountLockedDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [roleVerified, setRoleVerified] = useState(false);
  const [lastLoginInfo, setLastLoginInfo] = useState<{ ip: string | null; at: string | null } | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Apply blue theme to body so portaled elements (dialogs, modals, toasts) inherit it
  useEffect(() => {
    document.body.classList.add('theme-blue-banking');
    return () => document.body.classList.remove('theme-blue-banking');
  }, []);

  // Preload logo image to prevent flash of fallback content
  useEffect(() => {
    const consoleLogo = settings?.consoleLogoUrl || settings?.logoUrl;
    if (consoleLogo) {
      const img = new Image();
      img.onload = () => setLogoLoaded(true);
      img.onerror = () => setLogoLoaded(true); // Show fallback on error
      img.src = consoleLogo;
    } else if (!settingsLoading && settings) {
      // No logo URL configured, show fallback immediately
      setLogoLoaded(true);
    }
  }, [settings?.consoleLogoUrl, settings?.logoUrl, settingsLoading, settings]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/auth");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Auto-logout functionality
  useInactivityTimer({
    timeout: 5 * 60 * 1000, // 5 minutes
    onTimeout: handleLogout,
    enabled: !!user
  });

  // Secure navigation monitoring
  useSecureNavigation({
    isAuthenticated: !!user,
    userRole: 'user', // Server-side validation via RLS policies
    onLogout: handleLogout,
    enabled: !!user
  });
  // Strict role-based access control - verify user is not an admin
  useEffect(() => {
    const verifyUserRole = async () => {
      if (!user?.id) return;
      
      try {
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking role:', error);
        }
        
        // If user has admin role, sign them out and redirect to admin portal
        if (roleData?.role === 'admin') {
          toast({
            title: "Access Denied",
            description: "Admin users cannot access the user dashboard. Redirecting to admin portal.",
            variant: "destructive",
          });
          await signOut();
          navigate('/admin-auth');
          return;
        }
        
        setRoleVerified(true);
      } catch (error) {
        console.error('Error verifying role:', error);
        setRoleVerified(true); // Allow access on error (RLS will protect data anyway)
      }
    };
    
    if (user) {
      verifyUserRole();
    }
  }, [user, signOut, navigate, toast]);

  useEffect(() => {
    // Check if account is locked first, before any redirects
    if (profile?.account_locked) {
      setShowAccountLockedDialog(true);
      return; // Don't perform any navigation when account is locked
    }
    
    // Only redirect to auth if not logged in and account is not locked
    if (!user && !profile?.account_locked) {
      navigate("/auth");
    } else if (user?.id && profile && !profile.account_locked && roleVerified) {
      fetchDashboardData();
    }
  }, [user, profile, navigate, roleVerified]);

  const fetchDashboardData = async () => {
    try {
      if (!user?.id) return;

      const [accountsResult, transactionsResult, loanPaymentsResult, securityResult] = await Promise.all([
        // Filter out hidden accounts
        supabase.from('accounts').select('*').eq('user_id', user.id).eq('hidden', false),
        Promise.all([
          // Regular transactions - only from non-hidden accounts
          supabase
            .from('transactions')
            .select('*')
            .in('account_id', (await supabase.from('accounts').select('id').eq('user_id', user.id).eq('hidden', false)).data?.map(acc => acc.id) || [])
            .order('created_at', { ascending: false })
            .limit(10),
          // Note: International transfers already appear in transactions table
          // (created by process_international_transfer function), so no need to fetch foreign_remittances
        ]).then(([transactionsResult]) => {
          const transactions = transactionsResult.data || [];
          
          // Sort by date, then by transaction type (credit before debit for same timestamp)
          const allTransactions = [...transactions]
            .sort((a, b) => {
              const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              // If timestamps are the same, show credit (deposit) before debit (withdrawal)
              if (timeDiff === 0) {
                if (a.transaction_type === 'deposit' && b.transaction_type === 'withdrawal') return -1;
                if (a.transaction_type === 'withdrawal' && b.transaction_type === 'deposit') return 1;
              }
              return timeDiff;
            })
            .slice(0, 5);
            
          return { data: allTransactions, error: null };
        }),
        supabase
          .from('loan_payments')
          .select(`
            *,
            loans!inner(*)
          `)
          .eq('loans.user_id', user.id)
          .gte('due_date', new Date().toISOString())
          .neq('status', 'completed')
          .order('due_date', { ascending: true })
          .limit(3),
        // Fetch last login IP info
        supabase
          .from('user_security')
          .select('previous_login_ip, previous_login_at')
          .eq('user_id', user.id)
          .single()
      ]);

      if (accountsResult.error) {
        console.error('Accounts error:', accountsResult.error);
        throw accountsResult.error;
      }
      if (transactionsResult.error) {
        console.error('Transactions error:', transactionsResult.error);
        throw transactionsResult.error;
      }
      if (loanPaymentsResult.error) {
        console.error('Loan payments error:', loanPaymentsResult.error);
        // Don't throw error for loan payments to avoid breaking dashboard
      }
      
      // Set last login info (don't throw on error - it's optional data)
      if (securityResult.data) {
        setLastLoginInfo({
          ip: securityResult.data.previous_login_ip,
          at: securityResult.data.previous_login_at
        });
      }

      console.log('Fetched accounts:', accountsResult.data);
      console.log('Fetched transactions:', transactionsResult.data);
      console.log('Fetched loan payments:', loanPaymentsResult.data);

      const fetchedAccounts = accountsResult.data || [];
      const txnData = transactionsResult.data || [];
      
      setAccounts(fetchedAccounts);
      setTransactions(txnData);
      setPendingLoanPayments(loanPaymentsResult.data || []);
      
      // Set default selected account to the one with most recent transaction
      if (selectedAccountId === "all" && fetchedAccounts.length > 0) {
        let defaultAccountId = fetchedAccounts[0].id;
        
        if (txnData.length > 0) {
          // Get the most recent transaction's account_id
          const mostRecentTxn = txnData[0]; // Already sorted by created_at desc
          defaultAccountId = mostRecentTxn.account_id;
        }
        
        setSelectedAccountId(defaultAccountId);
      }
      
      console.log('Set pending loan payments:', loanPaymentsResult.data || []);

      // Subscribe to transaction changes for real-time updates
      if (accountsResult.data && accountsResult.data.length > 0) {
        const accountIds = accountsResult.data.map(acc => acc.id);
        const channel = supabase
          .channel('user-transactions-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transactions',
              filter: `account_id=in.(${accountIds.join(',')})`
            },
            (payload) => {
              console.log('User transaction change detected:', payload);
              fetchDashboardData();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigationItems = [
    {
      id: "overview",
      label: t('dashboard.accountSummary'),
      icon: BarChart3
    },
    {
      id: "transactions",
      label: t('dashboard.transactions'),
      icon: FileText
    },
    {
      id: "transfers",
      label: t('dashboard.transfers'),
      icon: ArrowLeftRight
    },
    {
      id: "deposits",
      label: t('dashboard.deposits'),
      icon: Upload
    },
    {
      id: "bills",
      label: t('dashboard.payBills'),
      icon: CreditCard
    },
    {
      id: "loans",
      label: t('dashboard.loans'),
      icon: DollarSign
    },
    {
      id: "statements",
      label: t('dashboard.statements'),
      icon: FileText
    },
    {
      id: "bio",
      label: t('dashboard.bioDetails'),
      icon: User
    },
    {
      id: "security",
      label: t('dashboard.security'),
      icon: Shield
    },
    ...(settings?.showKycPage ? [{
      id: "kyc",
      label: t('dashboard.kyc'),
      icon: CheckCircle
    }] : []),
    {
      id: "support",
      label: t('dashboard.support'),
      icon: Bell
    }
  ];
  const renderSectionContent = () => {
    switch (activeSection) {
      case "transactions":
        return <Transactions />;
      case "transfers":
        return <Transfers />;
      case "deposits":
        return <Deposits />;
      case "bills":
        return <PayBills />;
      case "loans":
        return <Loans />;
      case "statements":
        return <Statements />;
      case "bio":
        return <Profile />;
      case "security":
        return <Security />;
      case "kyc":
        return <KYC />;
      case "support":
        return <Support />;
      default:
        return <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Account Summary */}
                <Card className="shadow-banking">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      {t('dashboard.accountSummary')}
                    </CardTitle>
                    <CardDescription>{t('dashboard.bankingAccountsOverview')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Currency Cards */}
                      {(() => {
                        const getCurrencyConfig = (currency: string) => {
                          const configs: Record<string, { color: string; bgClass: string; borderClass: string; icon: string; name: string }> = {
                            USD: { 
                              color: 'text-blue-700', 
                              bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100/50', 
                              borderClass: 'border-blue-200',
                              icon: '💵', 
                              name: 'US Dollar' 
                            },
                            EUR: { 
                              color: 'text-green-700', 
                              bgClass: 'bg-gradient-to-br from-green-50 to-green-100/50', 
                              borderClass: 'border-green-200',
                              icon: '💶', 
                              name: 'Euro' 
                            },
                            GBP: { 
                              color: 'text-purple-700', 
                              bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100/50', 
                              borderClass: 'border-purple-200',
                              icon: '💷', 
                              name: 'British Pound' 
                            }
                          };
                          return configs[currency] || { 
                            color: 'text-gray-700', 
                            bgClass: 'bg-gradient-to-br from-gray-50 to-gray-100/50', 
                            borderClass: 'border-gray-200',
                            icon: '💰', 
                            name: currency 
                          };
                        };

                        const currencyData = accounts.reduce((acc, account) => {
                          const curr = (account.currency as string) || 'USD';
                          if (!acc[curr]) {
                            acc[curr] = { total: 0, count: 0 };
                          }
                          acc[curr].total += Number(account.balance) || 0;
                          acc[curr].count += 1;
                          return acc;
                        }, {} as Record<string, { total: number; count: number }>);

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(Object.entries(currencyData) as [string, { total: number; count: number }][]).map(([currency, data]) => {
                                const config = getCurrencyConfig(currency);
                                return (
                                  <div 
                                    key={currency} 
                                    className={`${config.bgClass} ${config.borderClass} rounded-lg p-4 border-2 transition-all hover:shadow-md`}
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-2xl">{config.icon}</span>
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground">{config.name}</p>
                                          <p className={`text-xs font-semibold ${config.color}`}>{currency}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <p className={`text-2xl font-bold ${config.color} mb-1`}>
                                      {formatCurrencyAmount(data.total, currency)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {data.count} account{data.count !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Summary Statistics */}
                            <div className="flex items-center justify-center gap-4 py-3 px-4 bg-muted/30 rounded-lg border">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-semibold">
                                  {accounts.length} {t('dashboard.totalAccounts')}
                                </Badge>
                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  {accounts.filter(a => a.status === 'active').length} {t('dashboard.active')}
                                </Badge>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Accounts Table */}
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium text-sm">{t('dashboard.accountType')}</th>
                              <th className="text-left p-3 font-medium text-sm hidden sm:table-cell">{t('dashboard.accountNumber')}</th>
                              <th className="text-right p-3 font-medium text-sm">{t('dashboard.balance')}</th>
                              <th className="text-center p-3 font-medium text-sm">{t('dashboard.status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accounts.map((account, index) => (
                              <tr key={account.id} className={index % 2 === 0 ? "bg-background hover:bg-muted/10" : "bg-muted/20 hover:bg-muted/30"}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {account.account_type === 'savings' ? (
                                      <Vault className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div className="flex flex-col">
                                      <span className="font-medium">{formatAccountType(account.account_type)}</span>
                                      <Badge variant="outline" className="w-fit text-xs mt-1">
                                        {account.currency || 'USD'}
                                      </Badge>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 text-sm hidden sm:table-cell">{account.account_number}</td>
                                 <td className="p-3 text-right font-semibold">
                                   {formatCurrencyAmount(account.balance || 0, account.currency || 'USD')}
                                 </td>
                                <td className="p-3 text-center">
                                   <div className="flex flex-col items-center gap-1">
                                     <Badge 
                                       variant={
                                         account.status === 'active' ? 'default' : 
                                         account.status === 'frozen' ? 'destructive' : 
                                         account.status === 'dormant' ? 'destructive' :
                                         account.status === 'inactive' ? 'destructive' :
                                         account.status === 'closed' ? 'destructive' :
                                         account.status === 'awaiting_deposit' ? 'outline' :
                                         'secondary'
                                       }
                                      className={`capitalize ${
                                        account.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                                        account.status === 'awaiting_deposit' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : ''
                                      }`}
                                    >
                                      {account.status === 'awaiting_deposit' ? t('dashboard.awaitingDeposit') : account.status}
                                    </Badge>
                                    {account.status === 'awaiting_deposit' && account.required_initial_deposit && (
                                      <span className="text-xs font-medium text-amber-700">
                                        {formatCurrencyAmount(account.required_initial_deposit, account.currency || 'USD')} required
                                      </span>
                                    )}
                                   </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Transactions */}
              <Card className="shadow-banking">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-primary">{t('dashboard.recentTransactions')}</CardTitle>
                      <CardDescription>{t('dashboard.latestAccountActivity')}</CardDescription>
                    </div>
                    {accounts.length > 0 && (
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-full sm:w-[280px]">
                          <SelectValue placeholder={t('dashboard.selectAccount')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('dashboard.allAccountsOption')}</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {formatAccountType(account.account_type)} - ****{account.account_number.slice(-4)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const filteredTransactions = selectedAccountId === "all" 
                        ? transactions 
                        : transactions.filter(t => t.account_id === selectedAccountId);
                      
                      return filteredTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">{t('dashboard.noTransactions')}</p>
                      ) : (
                        filteredTransactions.slice(0, 5).map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{transaction.description || t('dashboard.transaction')}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </p>
                            </div>
                             <div className="text-right">
                               <div className="font-semibold mb-1 text-foreground">
                                 {transaction.amount > 0 ? '+' : ''}{formatCurrencyAmount(transaction.amount, accounts.find(a => a.id === transaction.account_id)?.currency || 'USD')}
                               </div>
                              <Badge 
                                variant={
                                  transaction.status === 'completed' || transaction.status === 'approved' ? 'default' : 
                                  transaction.status === 'pending' ? 'secondary' : 
                                  'destructive'
                                }
                                className={
                                  transaction.status === 'completed' || transaction.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                                  transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : 
                                  transaction.status === 'rejected' ? 'bg-red-100 text-red-800 hover:bg-red-100' : 
                                  ''
                                }
                              >
                                {transaction.status === 'pending' ? 'Pending' : 
                                 transaction.status === 'completed' || transaction.status === 'approved' ? t('dashboard.completed') : 
                                 transaction.status === 'rejected' ? t('dashboard.rejected') :
                                 transaction.status === 'cancelled' ? t('dashboard.failed') :
                                 t('dashboard.failed')}
                              </Badge>
                            </div>
                          </div>
                        ))
                      );
                    })()}
                  </div>
                  <Separator className="my-4" />
                  <Button variant="outline" className="w-full" onClick={() => setActiveSection('transactions')}>
                    {t('dashboard.viewAllTransactions')}
                  </Button>
                </CardContent>
                </Card>

                {/* Quick Actions */}
              <Card className="shadow-banking">
                <CardHeader>
                  <CardTitle className="text-primary">{t('dashboard.quickActions')}</CardTitle>
                  <CardDescription>{t('dashboard.manageBankingNeeds')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-16 sm:h-20 flex-col hover-lift" onClick={() => setActiveSection('transfers')}>
                      <ArrowLeftRight className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.transferMoney')}</span>
                    </Button>
                    <Button variant="outline" className="h-16 sm:h-20 flex-col hover-lift" onClick={() => setActiveSection('bills')}>
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.payBills')}</span>
                    </Button>
                    <Button variant="outline" className="h-16 sm:h-20 flex-col hover-lift" onClick={() => setActiveSection('statements')}>
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.viewStatements')}</span>
                    </Button>
                    <Button variant="outline" className="h-16 sm:h-20 flex-col hover-lift" onClick={() => setActiveSection('security')}>
                      <Settings className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                      <span className="text-sm">{t('dashboard.accountSettings')}</span>
                    </Button>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.needAssistance')}
                    </p>
                    <Button variant="gold" size="sm" onClick={() => setActiveSection('support')}>
                      {t('dashboard.contactSupport')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Loan Payments - Show below main grid if any payments exist */}
            {pendingLoanPayments.length > 0 && (
              <Card className="shadow-banking">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" />
                    {t('dashboard.upcomingLoanPayments')}
                  </CardTitle>
                  <CardDescription>{t('dashboard.paymentsDueSoon')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingLoanPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{t('dashboard.paymentDue')}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            ${payment.payment_amount?.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('dashboard.principal')}: ${payment.principal_amount?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4" 
                    onClick={() => setActiveSection('loans')}
                  >
                    {t('dashboard.viewAllLoans')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>;
    }
  };

  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  return <div className="min-h-screen bg-background flex theme-blue-banking">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-full max-w-64 sm:w-64 bg-card border-r transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 sm:p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 bg-primary flex-shrink-0">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-white text-xs sm:text-sm font-semibold">
                    {profile?.full_name ? getInitials(profile.full_name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm sm:text-base truncate">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{t('common.personalBanking')}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map(item => <button key={item.id} onClick={() => {
              setActiveSection(item.id);
              setSidebarOpen(false);
            }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${activeSection === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>)}
            </div>
          </nav>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Secure User Dashboard Header */}
        <header className="bg-card/95 backdrop-blur-md shadow-lg border-b border-border sticky top-0 z-50 transition-all duration-300 overflow-hidden">
          <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                {!settingsLoading && logoLoaded && (
                  <>
                    {(settings?.consoleLogoUrl || settings?.logoUrl) ? (
                      <img 
                        src={settings.consoleLogoUrl || settings.logoUrl || ''} 
                        alt={`${settings?.bankName} logo`}
                        className="h-8 sm:h-10 lg:h-12 w-auto object-contain max-w-[200px] shadow-lg flex-shrink-0"
                      />
                    ) : (
                      <>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <Vault className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                              {settings?.bankName || 'StarBank'}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{t('common.personalBanking')}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* User Info & Actions */}
              <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
                <Badge variant="secondary" className="bg-primary/10 text-primary hidden sm:flex">
                  <Shield className="w-3 h-3 mr-1" />
                  <span className="hidden md:inline">{t('common.secureSession')}</span>
                  <span className="md:hidden">{t('common.secure')}</span>
                </Badge>
                {lastLoginInfo?.ip && (
                  <Badge variant="outline" className="hidden md:flex text-xs bg-muted/50">
                    <span className="text-muted-foreground">{t('common.lastLoginIP')}:</span>
                    <span className="ml-1 font-mono text-foreground">{lastLoginInfo.ip}</span>
                  </Badge>
                )}
                <LanguageSelector variant="compact" />
                <Button variant="outline" size="sm" onClick={handleLogout} disabled={isLoggingOut} className="bg-card/50 backdrop-blur-sm border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  {isLoggingOut ? <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">{t('common.loggingOut')}</span>
                    </div> : <>
                      <LogOut className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t('common.logout')}</span>
                    </>}
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        {/* Top Bar */}
        <div className="bg-card border-b px-2 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
              <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary truncate">
                  {t('dashboard.welcomeBack')}, {(() => {
                    if (!profile) return 'User';
                    
                    const fullName = profile.full_name?.trim();
                    // If no meaningful name, use 'User'
                    if (!fullName) return 'User';
                    
                    const profileWithTitle = profile as typeof profile & { title?: string };
                    
                    // Common titles to check for - used for extraction from full_name if title field is null
                    const commonTitles = ['Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Rev.', 'Sir', 'Madam'];
                    
                    // If we have a title in the profile
                    if (profileWithTitle.title) {
                      const nameParts = fullName.split(' ').filter(part => part.length > 0);
                      if (nameParts.length > 0) {
                        const lastName = nameParts[nameParts.length - 1];
                        // If lastName equals the title (e.g., name is just "Mr."), fall back
                        if (lastName && lastName !== profileWithTitle.title) {
                          return `${profileWithTitle.title} ${lastName}`;
                        }
                      }
                    }
                    
                    // Check if full_name starts with a title (for cases where title is embedded in name)
                    const nameParts = fullName.split(' ').filter(part => part.length > 0);
                    if (nameParts.length >= 2) {
                      const firstPart = nameParts[0];
                      // Check if first part is a common title
                      if (commonTitles.includes(firstPart)) {
                        // Extract title and last name
                        const extractedTitle = firstPart;
                        const lastName = nameParts[nameParts.length - 1];
                        // Make sure lastName is not the same as the title
                        if (lastName && lastName !== extractedTitle) {
                          return `${extractedTitle} ${lastName}`;
                        }
                      }
                    }
                    
                    // Fallback: use the last name if available (more professional), otherwise first name
                    if (nameParts.length >= 2) {
                      return nameParts[nameParts.length - 1];
                    }
                    
                    return nameParts[0] || 'User';
                  })()}!
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{profile?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <Badge variant="success" className="hidden sm:flex">
                <Shield className="w-3 h-3 mr-1" />
                <span className="hidden md:inline">Verified Account</span>
                <span className="md:hidden">Verified</span>
              </Badge>
              <NotificationDropdown />
            </div>
          </div>
        </div>

        {/* Currency Exchange Ticker */}
        <div className="px-4 sm:px-6 lg:px-8 mt-1">
          <CurrencyTicker />
        </div>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          {renderSectionContent()}
          
          {/* Footer Info */}
          <div className="mt-12 text-center">
            
          </div>
        </main>
      </div>
      
      {/* Account Locked Dialog */}
      <AccountLockedDialog 
        open={showAccountLockedDialog}
        onClose={() => {
          setShowAccountLockedDialog(false);
          clearAccountLockedState();
        }}
      />
    </div>;
};
export default Dashboard;