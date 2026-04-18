import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Calendar, TrendingUp, FileText, Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatAmount, capitalizeAccountType } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export const Loans = () => {
  const { user } = useAuth();
  const { settings } = useWebsiteSettings();
  const contactEmail = settings?.contactEmail || "info@yourbank.com";
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loans, setLoans] = useState<any[]>([]);
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [loanPayments, setLoanPayments] = useState<any[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    requested_amount: '',
    loan_type: 'personal',
    loan_purpose: '',
    employment_status: 'employed',
    monthly_income: '',
    disbursement_account_id: '',
    loan_term_months: '12'
  });
  const [profile, setProfile] = useState<any>(null);
  const [repaymentAccountId, setRepaymentAccountId] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchLoansData();
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('loan_applications_allowed, loan_repayment_account_id')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
      setRepaymentAccountId(data?.loan_repayment_account_id || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateRepaymentAccount = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ loan_repayment_account_id: repaymentAccountId })
        .eq('id', user?.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Repayment account updated successfully",
      });
    } catch (error) {
      console.error('Error updating repayment account:', error);
      toast({
        title: "Error",
        description: "Failed to update repayment account",
        variant: "destructive",
      });
    }
  };

  const fetchLoansData = async () => {
    try {
      const [loansResult, applicationsResult, paymentsResult, upcomingResult, accountsResult] = await Promise.all([
        supabase.from('loans').select('*').eq('user_id', user?.id),
        supabase.from('loan_applications').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
        supabase
          .from('loan_payments')
          .select('*, loans!inner(user_id)')
          .eq('loans.user_id', user?.id)
          .eq('status', 'completed')
          .order('payment_date', { ascending: false }),
        supabase
          .from('loan_payments')
          .select('*, loans!inner(user_id)')
          .eq('loans.user_id', user?.id)
          .eq('status', 'pending')
          .gte('due_date', new Date().toISOString().split('T')[0])
          .lte('due_date', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('due_date', { ascending: true }),
        supabase.from('accounts').select('*').eq('user_id', user?.id).eq('status', 'active')
      ]);

      if (loansResult.error) throw loansResult.error;
      if (applicationsResult.error) throw applicationsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (upcomingResult.error) throw upcomingResult.error;
      if (accountsResult.error) throw accountsResult.error;

      setLoans(loansResult.data || []);
      setLoanApplications(applicationsResult.data || []);
      setLoanPayments(paymentsResult.data || []);
      setUpcomingPayments(upcomingResult.data || []);
      setAccounts(accountsResult.data || []);
    } catch (error) {
      console.error('Error fetching loans data:', error);
      toast({
        title: "Error",
        description: "Failed to load loans data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('loan_applications')
        .insert([{
          user_id: user?.id,
          requested_amount: parseFloat(applicationForm.requested_amount),
          loan_type: applicationForm.loan_type,
          loan_purpose: applicationForm.loan_purpose,
          employment_status: applicationForm.employment_status,
          monthly_income: parseFloat(applicationForm.monthly_income),
          disbursement_account_id: applicationForm.disbursement_account_id,
          loan_term_months: parseInt(applicationForm.loan_term_months)
        }]);

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: "Your loan application has been submitted for review",
      });

      setShowApplicationForm(false);
      setApplicationForm({
        requested_amount: '',
        loan_type: 'personal',
        loan_purpose: '',
        employment_status: 'employed',
        monthly_income: '',
        disbursement_account_id: '',
        loan_term_months: '12'
      });
      fetchLoansData();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit loan application",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
      approved: { variant: "default" as const, icon: CheckCircle, label: "Approved" },
      denied: { variant: "destructive" as const, icon: AlertCircle, label: "Denied" },
      active: { variant: "default" as const, icon: TrendingUp, label: "Active" },
      completed: { variant: "secondary" as const, icon: CheckCircle, label: "Completed" },
      defaulted: { variant: "destructive" as const, icon: AlertCircle, label: "Defaulted" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (payment: any) => {
    if (!payment.payment_date) {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }

    const dueDate = new Date(payment.due_date);
    const paymentDate = new Date(payment.payment_date);
    const daysDifference = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference <= 0) {
      return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Paid On Date</Badge>;
    } else if (daysDifference <= 30) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Paid</Badge>;
    } else {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Defaulted</Badge>;
    }
  };

  const calculatePaymentScore = () => {
    if (loanPayments.length === 0) return "No History";
    
    let onTimePayments = 0;
    loanPayments.forEach(payment => {
      if (payment.payment_date) {
        const dueDate = new Date(payment.due_date);
        const paymentDate = new Date(payment.payment_date);
        const daysDifference = Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDifference <= 0) {
          onTimePayments++;
        }
      }
    });

    const onTimePercentage = (onTimePayments / loanPayments.length) * 100;
    
    if (onTimePercentage >= 95) return "Excellent";
    if (onTimePercentage >= 80) return "Good";
    if (onTimePercentage >= 60) return "Fair";
    return "Poor";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('dashboard.myLoans')}</h1>
          <p className="text-muted-foreground">{t('dashboard.myLoansDesc')}</p>
        </div>
        {profile?.loan_applications_allowed !== false ? (
          <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('dashboard.applyForLoan')}
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('dashboard.applyForLoan')}</DialogTitle>
              <DialogDescription>
                {t('dashboard.loanApplicationDesc')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApplicationSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Requested Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="50000"
                    value={applicationForm.requested_amount}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, requested_amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loan-type">Loan Type</Label>
                  <Select value={applicationForm.loan_type} onValueChange={(value) => setApplicationForm(prev => ({ ...prev, loan_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="mortgage">Mortgage</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purpose">Loan Purpose</Label>
                <Textarea
                  id="purpose"
                  placeholder="Describe the purpose of this loan..."
                  value={applicationForm.loan_purpose}
                  onChange={(e) => setApplicationForm(prev => ({ ...prev, loan_purpose: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="disbursement-account">Disbursement Account</Label>
                <Select value={applicationForm.disbursement_account_id} onValueChange={(value) => setApplicationForm(prev => ({ ...prev, disbursement_account_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account to receive loan funds" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {capitalizeAccountType(account.account_type)} - {account.account_number} (${formatAmount(account.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employment">Employment Status</Label>
                  <Select value={applicationForm.employment_status} onValueChange={(value) => setApplicationForm(prev => ({ ...prev, employment_status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self Employed</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">Monthly Income</Label>
                  <Input
                    id="income"
                    type="number"
                    step="0.01"
                    placeholder="5000"
                    value={applicationForm.monthly_income}
                    onChange={(e) => setApplicationForm(prev => ({ ...prev, monthly_income: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan-term">Loan Term</Label>
                <Select value={applicationForm.loan_term_months} onValueChange={(value) => setApplicationForm(prev => ({ ...prev, loan_term_months: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                    <SelectItem value="36">36 months</SelectItem>
                    <SelectItem value="48">48 months</SelectItem>
                    <SelectItem value="60">60 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowApplicationForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Application</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        ) : (
          <Card className="p-6 bg-destructive/10 border-destructive/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Loan Applications Not Available</h3>
                <p className="text-sm text-destructive/80">
                  You are not qualified for a loan at this time. Please contact{" "}
                  <a href={`mailto:${contactEmail}`} className="underline font-medium">
                    {contactEmail}
                  </a>{" "}
                  for more details.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
          <TabsTrigger value="applications">{t('dashboard.applications')}</TabsTrigger>
          <TabsTrigger value="payments">{t('dashboard.paymentHistory')}</TabsTrigger>
          <TabsTrigger value="upcoming">{t('dashboard.upcomingPayments')}</TabsTrigger>
          <TabsTrigger value="settings">{t('dashboard.settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Active Loans Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.activeLoans')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loans.filter(l => l.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.totalOutstandingBalance')}: ${formatAmount(loans.reduce((sum, loan) => sum + (loan.remaining_balance || 0), 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.monthlyPayment')}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${formatAmount(loans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0))}</div>
                <p className="text-xs text-muted-foreground">
                  Total monthly obligation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  calculatePaymentScore() === 'Excellent' ? 'text-green-600' :
                  calculatePaymentScore() === 'Good' ? 'text-blue-600' :
                  calculatePaymentScore() === 'Fair' ? 'text-yellow-600' :
                  calculatePaymentScore() === 'Poor' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {calculatePaymentScore()}
                </div>
                <p className="text-xs text-muted-foreground">
                  On-time payment history
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans List */}
          <Card>
            <CardHeader>
              <CardTitle>Active Loans</CardTitle>
              <CardDescription>Your current loan accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active loans found</p>
                  <p className="text-sm text-muted-foreground">Apply for a loan to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans.map((loan) => (
                    <div key={loan.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold capitalize">{loan.loan_type} Loan</h3>
                          <p className="text-sm text-muted-foreground">
                            ${formatAmount(loan.principal_amount || 0)} at {loan.interest_rate}% APR
                          </p>
                        </div>
                        {getStatusBadge(loan.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Remaining Balance</p>
                          <p className="font-semibold">${formatAmount(loan.remaining_balance || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Monthly Payment</p>
                          <p className="font-semibold">${formatAmount(loan.monthly_payment || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Term</p>
                          <p className="font-semibold">{loan.term_months} months</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Maturity Date</p>
                          <p className="font-semibold">
                            {loan.maturity_date ? new Date(loan.maturity_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loan Applications</CardTitle>
              <CardDescription>Track your loan application status</CardDescription>
            </CardHeader>
            <CardContent>
              {loanApplications.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No loan applications found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loanApplications.map((application) => (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold capitalize">{application.loan_type} Loan Application</h3>
                          <p className="text-sm text-muted-foreground">
                            ${formatAmount(application.requested_amount || 0)} requested
                          </p>
                        </div>
                        {getStatusBadge(application.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Applied Date</p>
                          <p className="font-semibold">
                            {new Date(application.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Purpose</p>
                          <p className="font-semibold">{application.loan_purpose || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Employment</p>
                          <p className="font-semibold capitalize">{application.employment_status}</p>
                        </div>
                      </div>
                      
                      {application.admin_notes && (
                        <>
                          <Separator className="my-3" />
                          <div>
                            <p className="text-xs text-muted-foreground">Admin Notes</p>
                            <p className="text-sm">{application.admin_notes}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Your loan payment transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              {loanPayments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {loanPayments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4">
                       <div className="flex justify-between items-start mb-2">
                         <div>
                           <h3 className="font-semibold">Payment #{payment.reference_number || payment.id.slice(0, 8)}</h3>
                           <p className="text-sm text-muted-foreground">
                             Payment Date: {new Date(payment.payment_date).toLocaleDateString()}
                           </p>
                           <p className="text-sm text-muted-foreground">
                             Due Date: {new Date(payment.due_date).toLocaleDateString()}
                           </p>
                         </div>
                         {getPaymentStatusBadge(payment)}
                       </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Payment</p>
                          <p className="font-semibold">${formatAmount(payment.payment_amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Principal</p>
                          <p className="font-semibold">${formatAmount(payment.principal_amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest</p>
                          <p className="font-semibold">${formatAmount(payment.interest_amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Remaining Balance</p>
                          <p className="font-semibold">${formatAmount(payment.remaining_balance || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payments</CardTitle>
              <CardDescription>Your scheduled loan payments for the next 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingPayments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming payments found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingPayments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">Payment #{payment.reference_number || payment.id.slice(0, 8)}</h3>
                          <p className="text-sm text-muted-foreground">
                            Due Date: {new Date(payment.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Due
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Payment</p>
                          <p className="font-semibold">${formatAmount(payment.payment_amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Principal</p>
                          <p className="font-semibold">${formatAmount(payment.principal_amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Interest</p>
                          <p className="font-semibold">${formatAmount(payment.interest_amount || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">After Payment Balance</p>
                          <p className="font-semibold">${formatAmount(payment.remaining_balance || 0)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loan Repayment Settings</CardTitle>
              <CardDescription>
                Configure your default account for automatic loan payment deductions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Repayment Account</Label>
                <Select value={repaymentAccountId} onValueChange={setRepaymentAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {capitalizeAccountType(account.account_type)} - {account.account_number} (${formatAmount(account.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Monthly loan payments will be automatically deducted from this account
                </p>
              </div>
              
              <Button onClick={handleUpdateRepaymentAccount}>
                Save Settings
              </Button>
              
              {!repaymentAccountId && (
                <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-destructive mb-1">No Account Selected</h4>
                    <p className="text-sm text-destructive/80">
                      Please select a repayment account to ensure timely loan payments
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};