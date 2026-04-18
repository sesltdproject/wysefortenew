import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatAmount } from "@/lib/utils";
import { FileText, Download, Users, DollarSign, Activity, AlertTriangle, Archive, Lock } from "lucide-react";
import { AdminAuditLogs } from "./AdminAuditLogs";
import { AdminSecurityCenter } from "./AdminSecurityCenter";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface ReportStats {
  totalUsers: number;
  totalBalance: number;
  totalTransactions: number;
  openTickets: number;
  pendingKyc: number;
  activeLoans: number;
}

export const AdminReports = () => {
  const { settings } = useWebsiteSettings();
  const bankName = settings?.bankName || "Your Bank";
  const [stats, setStats] = useState<ReportStats>({
    totalUsers: 0,
    totalBalance: 0,
    totalTransactions: 0,
    openTickets: 0,
    pendingKyc: 0,
    activeLoans: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        // Get user count
        const { data: users } = await supabase
          .from('profiles')
          .select('id');

        // Get total balance
        const { data: accounts } = await supabase
          .from('accounts')
          .select('balance');

        // Get transaction count
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id');

        // Get open tickets
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('status', 'open');

        // Get pending KYC
        const { data: kyc } = await supabase
          .from('kyc_documents')
          .select('id')
          .eq('verification_status', 'pending');

        // Get active loans
        const { data: loans } = await supabase
          .from('loans')
          .select('id')
          .eq('status', 'active');

        const totalBalance = accounts?.reduce((sum, account) => 
          sum + (account.balance || 0), 0) || 0;

        setStats({
          totalUsers: users?.length || 0,
          totalBalance,
          totalTransactions: transactions?.length || 0,
          openTickets: tickets?.length || 0,
          pendingKyc: kyc?.length || 0,
          activeLoans: loans?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const downloadReport = async (reportType: string) => {
    try {
      const doc = new jsPDF();
      
      // Add company header
      doc.setFontSize(20);
      doc.text(`${bankName} Financial Report`, 20, 20);
      doc.setFontSize(12);
      doc.text(`Report Type: ${reportType}`, 20, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
      
      let yPosition = 60;
      
      switch (reportType) {
        case 'User Activity Report': {
          const { data: users } = await supabase
            .from('profiles')
            .select(`*, user_roles(role)`)
            .order('created_at', { ascending: false });
          const tableData = users?.map(user => [
            user.full_name,
            user.email,
            (user.user_roles as any)?.[0]?.role || 'user',
            user.account_locked ? 'Locked' : 'Active',
            new Date(user.created_at).toLocaleDateString()
          ]) || [];
          
          autoTable(doc, {
            head: [['Name', 'Email', 'Role', 'Status', 'Created']],
            body: tableData,
            startY: yPosition,
          });
          break;
        }
        
        case 'Transaction Summary': {
          const { data: transactions } = await supabase
            .from('transactions')
            .select(`*, accounts!inner(account_number, user_id)`)
            .order('created_at', { ascending: false })
            .limit(100);
          
          // Get user names separately
          const userIds = [...new Set(transactions?.map(t => (t.accounts as any).user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
          
          const tableData = transactions?.map(tx => [
            profileMap.get((tx.accounts as any).user_id) || 'Unknown',
            (tx.accounts as any).account_number,
            tx.transaction_type,
            `$${formatAmount(tx.amount)}`,
            tx.status,
            new Date(tx.created_at).toLocaleDateString()
          ]) || [];
          
          autoTable(doc, {
            head: [['User', 'Account', 'Type', 'Amount', 'Status', 'Date']],
            body: tableData,
            startY: yPosition,
          });
          break;
        }
        
        case 'Financial Overview': {
          const { data: accounts } = await supabase
            .from('accounts')
            .select(`*, user_id`)
            .order('balance', { ascending: false });
          
          const userIds = [...new Set(accounts?.map(a => a.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
          
          const tableData = accounts?.map(acc => [
            profileMap.get(acc.user_id) || 'Unknown',
            acc.account_number,
            acc.account_type,
            `$${formatAmount(acc.balance)}`,
            acc.status
          ]) || [];
          
          autoTable(doc, {
            head: [['User', 'Account Number', 'Type', 'Balance', 'Status']],
            body: tableData,
            startY: yPosition,
          });
          break;
        }
        
        case 'Support Tickets Report': {
          const { data: tickets } = await supabase
            .from('support_tickets')
            .select(`*, user_id`)
            .order('created_at', { ascending: false });
          
          const userIds = [...new Set(tickets?.map(t => t.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
          
          const tableData = tickets?.map(ticket => [
            profileMap.get(ticket.user_id) || 'Unknown',
            ticket.subject,
            ticket.status,
            ticket.priority,
            new Date(ticket.created_at).toLocaleDateString()
          ]) || [];
          
          autoTable(doc, {
            head: [['User', 'Subject', 'Status', 'Priority', 'Created']],
            body: tableData,
            startY: yPosition,
          });
          break;
        }
        
        case 'KYC Compliance Report': {
          const { data: kyc } = await supabase
            .from('kyc_documents')
            .select(`*, user_id`)
            .order('uploaded_at', { ascending: false });
          
          const userIds = [...new Set(kyc?.map(k => k.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
          
          const tableData = kyc?.map(doc => [
            profileMap.get(doc.user_id) || 'Unknown',
            doc.document_type,
            doc.verification_status,
            doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A',
            doc.reviewed_at ? new Date(doc.reviewed_at).toLocaleDateString() : 'Pending'
          ]) || [];
          
          autoTable(doc, {
            head: [['User', 'Document Type', 'Status', 'Uploaded', 'Reviewed']],
            body: tableData,
            startY: yPosition,
          });
          break;
        }
        
        case 'Loan Portfolio Report': {
          const { data: loans } = await supabase
            .from('loans')
            .select(`*, user_id`)
            .order('created_at', { ascending: false });
          
          const userIds = [...new Set(loans?.map(l => l.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
          
          const tableData = loans?.map(loan => [
            profileMap.get(loan.user_id) || 'Unknown',
            loan.loan_type || 'N/A',
            `$${formatAmount(loan.principal_amount || loan.loan_amount)}`,
            `$${formatAmount(loan.remaining_balance)}`,
            loan.status,
            new Date(loan.created_at).toLocaleDateString()
          ]) || [];
          
          autoTable(doc, {
            head: [['User', 'Type', 'Principal', 'Remaining', 'Status', 'Created']],
            body: tableData,
            startY: yPosition,
          });
          break;
        }
      }
      
      // Save the PDF
      const fileName = `${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports" className="flex items-center space-x-1 sm:space-x-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center space-x-1 sm:space-x-2">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Logs</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-1 sm:space-x-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Security Center</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports" className="space-y-6">
      {/* Report Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${formatAmount(stats.totalBalance)}</p>
                <p className="text-sm text-muted-foreground">Total Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.openTickets}</p>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingKyc}</p>
                <p className="text-sm text-muted-foreground">Pending KYC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeLoans}</p>
                <p className="text-sm text-muted-foreground">Active Loans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card className="shadow-banking">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Available Reports</span>
          </CardTitle>
          <CardDescription>
            Generate and download comprehensive reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "User Activity Report",
                description: "Comprehensive user registration and activity data",
                type: "user-activity"
              },
              {
                title: "Transaction Summary",
                description: "Complete transaction history and analytics",
                type: "transactions"
              },
              {
                title: "Financial Overview",
                description: "Account balances and financial metrics",
                type: "financial"
              },
              {
                title: "Support Tickets Report",
                description: "Customer support ticket summary and trends",
                type: "support"
              },
              {
                title: "KYC Compliance Report",
                description: "Document verification status and compliance data",
                type: "kyc"
              },
              {
                title: "Loan Portfolio Report",
                description: "Active loans and payment status overview",
                type: "loans"
              }
            ].map((report) => (
              <Card key={report.type} className="border-2 hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <Badge variant="outline">PDF Format</Badge>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => downloadReport(report.title)}
                      className="ml-4"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="audit">
          <AdminAuditLogs />
        </TabsContent>
        
        <TabsContent value="security">
          <AdminSecurityCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
};