import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmount } from "@/lib/utils";
import { DollarSign, Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Loan {
  id: string;
  user_id: string;
  loan_type: string;
  loan_amount: number;
  principal_amount: number;
  interest_rate: number;
  loan_term_months: number;
  monthly_payment: number;
  remaining_balance: number;
  status: string;
  disbursement_date: string | null;
  maturity_date: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface GroupedLoans {
  user_id: string;
  user_name: string;
  user_email: string;
  loans: Loan[];
}

interface LoanApplication {
  id: string;
  user_id: string;
  loan_type: string;
  requested_amount: number;
  status: string;
  created_at: string;
  employment_status?: string;
  monthly_income?: number;
  admin_notes?: string;
  loan_purpose?: string;
  loan_term_months?: number;
  disbursement_account_id?: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  accounts?: {
    account_type: string;
    account_number: string;
  };
}

export const AdminLoansTab = () => {
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [groupedLoans, setGroupedLoans] = useState<GroupedLoans[]>([]);
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [selectedLoanApplication, setSelectedLoanApplication] = useState<LoanApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [interestRates, setInterestRates] = useState<{
    id: string;
    loan_type: string;
    interest_rate: number;
    description: string;
  }[]>([]);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateFormData, setRateFormData] = useState<{ [key: string]: number }>({});

  const fetchLoans = async () => {
    try {
      setLoansLoading(true);
      
      // Fetch loans and applications separately
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: applicationsData, error: appsError } = await supabase
        .from('loan_applications')
        .select('*, accounts:disbursement_account_id(account_type, account_number)')
        .order('created_at', { ascending: false });

      if (loansError) throw loansError;
      if (appsError) throw appsError;

      // Fetch profiles for loans
      if (loansData && loansData.length > 0) {
        const loanUserIds = [...new Set(loansData.map(l => l.user_id))];
        const { data: loanProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', loanUserIds);

        const loansWithProfiles = loansData.map(loan => ({
          ...loan,
          profiles: loanProfiles?.find(p => p.id === loan.user_id) || { full_name: 'Unknown', email: 'Unknown' }
        }));

        // Group loans by user
        const grouped = loansWithProfiles.reduce((acc: GroupedLoans[], loan) => {
          const existingUser = acc.find(group => group.user_id === loan.user_id);
          if (existingUser) {
            existingUser.loans.push(loan as any);
          } else {
            acc.push({
              user_id: loan.user_id,
              user_name: loan.profiles.full_name,
              user_email: loan.profiles.email,
              loans: [loan as any]
            });
          }
          return acc;
        }, []);

        setLoans(loansWithProfiles as any);
        setGroupedLoans(grouped);
      }

      // Fetch profiles for loan applications
      if (applicationsData && applicationsData.length > 0) {
        const appUserIds = [...new Set(applicationsData.map(a => a.user_id))];
        const { data: appProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', appUserIds);

        const applicationsWithProfiles = applicationsData.map(app => ({
          ...app,
          profiles: appProfiles?.find(p => p.id === app.user_id) || { full_name: 'Unknown', email: 'Unknown' }
        }));

        setLoanApplications(applicationsWithProfiles as any);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast({
        title: "Error",
        description: "Failed to load loans.",
        variant: "destructive",
      });
    } finally {
      setLoansLoading(false);
    }
  };

  const fetchInterestRates = async () => {
    try {
      const { data, error } = await supabase
        .from('loan_interest_rates')
        .select('*')
        .order('loan_type');
      
      if (error) throw error;
      setInterestRates(data || []);
      
      const formData: { [key: string]: number } = {};
      data?.forEach(rate => {
        formData[rate.loan_type] = rate.interest_rate;
      });
      setRateFormData(formData);
    } catch (error) {
      console.error('Error fetching interest rates:', error);
      toast({
        title: "Error",
        description: "Failed to load interest rates",
        variant: "destructive",
      });
    }
  };

  const handleUpdateInterestRate = async (loanType: string) => {
    try {
      const { error } = await supabase
        .from('loan_interest_rates')
        .update({ 
          interest_rate: rateFormData[loanType],
          updated_at: new Date().toISOString()
        })
        .eq('loan_type', loanType);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Interest rate for ${loanType} loans updated successfully`,
      });
      
      setEditingRate(null);
      fetchInterestRates();
    } catch (error) {
      console.error('Error updating interest rate:', error);
      toast({
        title: "Error",
        description: "Failed to update interest rate",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchInterestRates();
  }, []);

  const handleLoanApplicationDecision = async (applicationId: string, decision: 'approve' | 'deny', notes: string = '') => {
    try {
      if (decision === 'approve') {
        const application = loanApplications.find(app => app.id === applicationId);
        if (!application) {
          toast({
            title: "Error",
            description: "Loan application not found",
            variant: "destructive",
          });
          return;
        }
        
        const { data: rateData, error: rateError } = await supabase
          .from('loan_interest_rates')
          .select('interest_rate')
          .eq('loan_type', application.loan_type)
          .single();
        
        if (rateError) {
          console.error('Error fetching interest rate:', rateError);
          toast({
            title: "Error",
            description: "Failed to fetch interest rate for this loan type",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase.rpc('admin_approve_loan_with_disbursement' as any, {
          p_application_id: applicationId,
          p_approve: true,
          p_admin_notes: notes,
          p_interest_rate: rateData.interest_rate
        });

        if (error) {
          console.error('Error approving loan application:', error);
          toast({
            title: "Error",
            description: error.message || 'Failed to approve loan application',
            variant: "destructive",
          });
          return;
        }

        const result = data as { success: boolean; error?: string };
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || 'Failed to approve loan application',
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Loan approved and amount disbursed successfully",
        });
      } else {
        const { error } = await supabase
          .from('loan_applications')
          .update({
            status: 'denied',
            admin_notes: notes,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Loan application denied successfully",
        });
      }

      fetchLoans();
      setSelectedLoanApplication(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error updating loan application:', error);
      toast({
        title: "Error",
        description: "Failed to update loan application",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_delete_loan' as any, {
        p_loan_id: loanId
      });

      if (error) {
        console.error('Error deleting loan:', error);
        toast({
          title: "Error",
          description: error.message || 'Failed to delete loan',
          variant: "destructive",
        });
        return;
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || 'Failed to delete loan',
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Loan deleted successfully",
      });
      
      fetchLoans();
    } catch (error) {
      console.error('Error in handleDeleteLoan:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'open':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'frozen':
      case 'rejected':
      case 'failed':
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Loan Management
          </CardTitle>
          <CardDescription>
            Review loan applications and manage active loans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loansLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Tabs defaultValue="applications" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="applications">
                    Loan Applications ({loanApplications.length})
                  </TabsTrigger>
                  <TabsTrigger value="active">
                    Active Loans ({loans.length})
                  </TabsTrigger>
                  <TabsTrigger value="rates">
                    Interest Rates
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="applications">
                  <div className="space-y-4">
                    {loanApplications.map((application) => (
                      <Card key={application.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">
                                {application.profiles?.full_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {application.profiles?.email}
                              </p>
                              <div className="flex items-center gap-4">
                                <Badge variant="outline" className="capitalize">
                                  {application.loan_type}
                                </Badge>
                                <span className="font-medium">
                                  ${formatAmount(application.requested_amount)}
                                </span>
                                <Badge className={getStatusColor(application.status)}>
                                  {application.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Applied {new Date(application.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            
                            {application.status === 'pending' && (
                              <div className="flex gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      onClick={() => setSelectedLoanApplication(application)}
                                    >
                                      Review
                                    </Button>
                                  </DialogTrigger>
                                   <DialogContent className="max-w-2xl">
                                     <DialogHeader>
                                       <DialogTitle>Review Loan Application</DialogTitle>
                                       <DialogDescription>
                                         Application for {selectedLoanApplication?.profiles?.full_name}
                                       </DialogDescription>
                                     </DialogHeader>
                                     <div className="space-y-6">
                                       {selectedLoanApplication && (
                                         <div className="grid grid-cols-2 gap-4">
                                           <div className="space-y-2">
                                             <Label className="text-sm font-medium text-muted-foreground">Requested Amount</Label>
                                             <p className="text-lg font-semibold">${formatAmount(selectedLoanApplication.requested_amount)}</p>
                                           </div>
                                           <div className="space-y-2">
                                             <Label className="text-sm font-medium text-muted-foreground">Loan Type</Label>
                                             <p className="capitalize">{selectedLoanApplication.loan_type}</p>
                                           </div>
                                           <div className="space-y-2">
                                             <Label className="text-sm font-medium text-muted-foreground">Loan Term</Label>
                                             <p>{selectedLoanApplication.loan_term_months || 12} months</p>
                                           </div>
                                           <div className="space-y-2">
                                             <Label className="text-sm font-medium text-muted-foreground">Employment Status</Label>
                                             <p className="capitalize">{selectedLoanApplication.employment_status || 'Not specified'}</p>
                                           </div>
                                           <div className="space-y-2">
                                             <Label className="text-sm font-medium text-muted-foreground">Monthly Income</Label>
                                             <p>{selectedLoanApplication.monthly_income ? `$${formatAmount(selectedLoanApplication.monthly_income)}` : 'Not specified'}</p>
                                           </div>
                                           <div className="space-y-2">
                                             <Label className="text-sm font-medium text-muted-foreground">Disbursement Account</Label>
                                             <p>
                                               {selectedLoanApplication.accounts ? 
                                                 `${selectedLoanApplication.accounts.account_type.charAt(0).toUpperCase() + selectedLoanApplication.accounts.account_type.slice(1)} - ${selectedLoanApplication.accounts.account_number}` :
                                                 'Not specified'
                                               }
                                             </p>
                                           </div>
                                         </div>
                                       )}
                                       
                                       {selectedLoanApplication?.loan_purpose && (
                                         <div className="space-y-2">
                                           <Label className="text-sm font-medium text-muted-foreground">Loan Purpose</Label>
                                           <p className="text-sm bg-muted p-3 rounded-md">{selectedLoanApplication.loan_purpose}</p>
                                         </div>
                                       )}

                                       <div>
                                         <Label htmlFor="adminNotes">Admin Notes</Label>
                                         <Textarea
                                           id="adminNotes"
                                           value={adminNotes}
                                           onChange={(e) => setAdminNotes(e.target.value)}
                                           placeholder="Add notes for approval/rejection..."
                                         />
                                       </div>
                                       <div className="flex gap-2">
                                         <Button
                                           onClick={() => selectedLoanApplication && handleLoanApplicationDecision(selectedLoanApplication.id, 'approve', adminNotes)}
                                           className="flex-1"
                                         >
                                           <Check className="h-4 w-4 mr-1" />
                                           Approve
                                         </Button>
                                         <Button
                                           variant="destructive"
                                           onClick={() => selectedLoanApplication && handleLoanApplicationDecision(selectedLoanApplication.id, 'deny', adminNotes)}
                                           className="flex-1"
                                         >
                                           <X className="h-4 w-4 mr-1" />
                                           Deny
                                         </Button>
                                       </div>
                                     </div>
                                   </DialogContent>
                                </Dialog>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="active">
                  <div className="space-y-6">
                    {groupedLoans.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No active loans found</div>
                    ) : (
                      groupedLoans.map((userGroup) => (
                        <Card key={userGroup.user_id}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {userGroup.user_name}
                              <span className="text-sm font-normal text-muted-foreground ml-2">
                                ({userGroup.user_email})
                              </span>
                              <Badge variant="secondary" className="ml-2">
                                {userGroup.loans.length} loan{userGroup.loans.length !== 1 ? 's' : ''}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Loan Type</TableHead>
                                    <TableHead>Principal</TableHead>
                                    <TableHead>Remaining</TableHead>
                                    <TableHead>Interest Rate</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {userGroup.loans.map((loan) => (
                                    <TableRow key={loan.id}>
                                      <TableCell className="capitalize">{loan.loan_type}</TableCell>
                                      <TableCell>${formatAmount(loan.principal_amount)}</TableCell>
                                      <TableCell>${formatAmount(loan.remaining_balance)}</TableCell>
                                      <TableCell>{loan.interest_rate}%</TableCell>
                                      <TableCell>
                                        <Badge className={getStatusColor(loan.status)}>
                                          {loan.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {new Date(loan.created_at).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Loan</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete this loan? This action will permanently delete the loan and all associated payment records. This action cannot be undone.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleDeleteLoan(loan.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                Delete Loan
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="rates">
                  <Card>
                    <CardHeader>
                      <CardTitle>Loan Interest Rates Configuration</CardTitle>
                      <CardDescription>
                        Set interest rates for different loan types. These rates will be applied to new loan applications.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {interestRates.map((rate) => (
                          <div key={rate.loan_type} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <h3 className="font-semibold capitalize text-lg">
                                {rate.loan_type === 'auto' ? 'Auto' : 
                                 rate.loan_type === 'personal' ? 'Personal' :
                                 rate.loan_type === 'mortgage' ? 'Mortgage' : 'Business'} Loans
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {rate.description}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {editingRate === rate.loan_type ? (
                                <>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={rateFormData[rate.loan_type]}
                                    onChange={(e) => setRateFormData(prev => ({
                                      ...prev,
                                      [rate.loan_type]: parseFloat(e.target.value)
                                    }))}
                                    className="w-24"
                                  />
                                  <span className="text-sm">%</span>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleUpdateInterestRate(rate.loan_type)}
                                  >
                                    Save
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setEditingRate(null);
                                      setRateFormData(prev => ({
                                        ...prev,
                                        [rate.loan_type]: rate.interest_rate
                                      }));
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="text-2xl font-bold">{rate.interest_rate}%</span>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setEditingRate(rate.loan_type)}
                                  >
                                    Edit
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">How Interest Rates Work</h4>
                        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                          <li>Interest rates are applied when a loan application is approved</li>
                          <li>Monthly payment is calculated based on the interest rate and loan term</li>
                          <li>Changing rates here will only affect new loan approvals</li>
                          <li>Existing active loans maintain their original interest rates</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};