import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FileSearch, RefreshCw } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  category: string;
  status: 'success' | 'warning' | 'error' | 'info';
  details: string;
}

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      
      // Since we don't have a dedicated audit log table, we'll aggregate activities
      // from various tables to create audit log entries
      
      const auditLogs: AuditLog[] = [];

      // Get recent user registrations
      const { data: users } = await supabase
        .from('profiles')
        .select('email, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      users?.forEach(user => {
        auditLogs.push({
          id: `user-reg-${user.email}`,
          action: 'User Registration',
          user: user.email,
          timestamp: user.created_at!,
          category: 'Authentication',
          status: 'success',
          details: `New user account created`
        });
      });

      // Get recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('transaction_type, amount, created_at, account_id, status')
        .order('created_at', { ascending: false })
        .limit(15);

      transactions?.forEach(transaction => {
        auditLogs.push({
          id: `txn-${transaction.account_id}-${transaction.created_at}`,
          action: `${transaction.transaction_type} Transaction`,
          user: `Account: ${transaction.account_id.substring(0, 8)}...`,
          timestamp: transaction.created_at!,
          category: 'Financial',
          status: transaction.status === 'completed' ? 'success' : 'warning',
          details: `Amount: $${transaction.amount}`
        });
      });

      // Get recent support tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('subject, created_at, user_id, status')
        .order('created_at', { ascending: false })
        .limit(10);

      tickets?.forEach(ticket => {
        auditLogs.push({
          id: `ticket-${ticket.user_id}-${ticket.created_at}`,
          action: 'Support Ticket Created',
          user: `User: ${ticket.user_id?.substring(0, 8)}...`,
          timestamp: ticket.created_at!,
          category: 'Support',
          status: 'info',
          details: `Subject: ${ticket.subject}`
        });
      });

      // Get recent KYC activities
      const { data: kyc } = await supabase
        .from('kyc_documents')
        .select('document_type, uploaded_at, user_id, verification_status')
        .order('uploaded_at', { ascending: false })
        .limit(10);

      kyc?.forEach(doc => {
        auditLogs.push({
          id: `kyc-${doc.user_id}-${doc.uploaded_at}`,
          action: 'KYC Document Upload',
          user: `User: ${doc.user_id?.substring(0, 8)}...`,
          timestamp: doc.uploaded_at!,
          category: 'Compliance',
          status: doc.verification_status === 'approved' ? 'success' : 'warning',
          details: `Document: ${doc.document_type}`
        });
      });

      // Get recent loan activities
      const { data: loans } = await supabase
        .from('loan_applications')
        .select('loan_type, created_at, user_id, status, requested_amount')
        .order('created_at', { ascending: false })
        .limit(8);

      loans?.forEach(loan => {
        auditLogs.push({
          id: `loan-${loan.user_id}-${loan.created_at}`,
          action: 'Loan Application',
          user: `User: ${loan.user_id.substring(0, 8)}...`,
          timestamp: loan.created_at,
          category: 'Lending',
          status: loan.status === 'approved' ? 'success' : 'info',
          details: `Type: ${loan.loan_type}, Amount: $${loan.requested_amount}`
        });
      });

      // Sort all logs by timestamp (most recent first)
      auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setLogs(auditLogs.slice(0, 50)); // Keep only the 50 most recent logs
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Authentication': return 'bg-purple-100 text-purple-800';
      case 'Financial': return 'bg-green-100 text-green-800';
      case 'Support': return 'bg-orange-100 text-orange-800';
      case 'Compliance': return 'bg-blue-100 text-blue-800';
      case 'Lending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-banking">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-primary flex items-center space-x-2">
                <FileSearch className="h-5 w-5" />
                <span>System Audit Logs</span>
              </CardTitle>
              <CardDescription>
                Complete audit trail of system activities and user actions
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAuditLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.action}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.user}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(log.category)}>
                          {log.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};