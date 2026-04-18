import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Shield, AlertTriangle, CheckCircle, Users, Lock } from "lucide-react";

interface SecurityMetrics {
  totalUsers: number;
  kycPending: number;
  kycApproved: number;
  kycRejected: number;
  openTickets: number;
  lockedAccounts: number;
}

export const AdminSecurityCenter = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalUsers: 0,
    kycPending: 0,
    kycApproved: 0,
    kycRejected: 0,
    openTickets: 0,
    lockedAccounts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSecurityMetrics = async () => {
      try {
        // Get total users
        const { data: users } = await supabase
          .from('profiles')
          .select('id');

        // Get KYC status breakdown
        const { data: kycDocs } = await supabase
          .from('kyc_documents')
          .select('verification_status');

        const kycPending = kycDocs?.filter(doc => doc.verification_status === 'pending').length || 0;
        const kycApproved = kycDocs?.filter(doc => doc.verification_status === 'approved').length || 0;
        const kycRejected = kycDocs?.filter(doc => doc.verification_status === 'rejected').length || 0;

        // Get open support tickets
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('id')
          .eq('status', 'open');

        // Get user security info from profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('account_locked');

        const lockedAccounts = profiles?.filter(p => p.account_locked === true).length || 0;

        setMetrics({
          totalUsers: users?.length || 0,
          kycPending,
          kycApproved,
          kycRejected,
          openTickets: tickets?.length || 0,
          lockedAccounts,
        });
      } catch (error) {
        console.error('Error fetching security metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSecurityMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const kycComplianceRate = metrics.totalUsers > 0 
    ? Math.round((metrics.kycApproved / metrics.totalUsers) * 100) 
    : 0;

  const securityStatus = metrics.lockedAccounts === 0 && metrics.openTickets < 5 
    ? 'excellent' 
    : metrics.lockedAccounts < 3 && metrics.openTickets < 10 
    ? 'good' 
    : 'attention';

  return (
    <div className="space-y-6">
      {/* Security Status Alert */}
      <Alert className={
        securityStatus === 'excellent' ? 'border-green-200 bg-green-50' :
        securityStatus === 'good' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }>
        {securityStatus === 'excellent' ? 
          <CheckCircle className="h-4 w-4 text-green-600" /> :
          <AlertTriangle className={`h-4 w-4 ${securityStatus === 'good' ? 'text-yellow-600' : 'text-red-600'}`} />
        }
        <AlertDescription className={
          securityStatus === 'excellent' ? 'text-green-700' :
          securityStatus === 'good' ? 'text-yellow-700' :
          'text-red-700'
        }>
          {securityStatus === 'excellent' && 'Security status: Excellent. All systems secure.'}
          {securityStatus === 'good' && 'Security status: Good. Minor issues detected.'}
          {securityStatus === 'attention' && 'Security status: Requires attention. Multiple issues detected.'}
        </AlertDescription>
      </Alert>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{kycComplianceRate}%</p>
                <p className="text-sm text-muted-foreground">KYC Compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-banking">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.lockedAccounts}</p>
                <p className="text-sm text-muted-foreground">Locked Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KYC Status Breakdown */}
      <Card className="shadow-banking">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>KYC Verification Status</span>
          </CardTitle>
          <CardDescription>
            Know Your Customer compliance overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{metrics.kycApproved}</div>
              <div className="text-sm text-green-700">Approved</div>
              <Badge className="bg-green-100 text-green-800 mt-2">Verified</Badge>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{metrics.kycPending}</div>
              <div className="text-sm text-yellow-700">Pending Review</div>
              <Badge className="bg-yellow-100 text-yellow-800 mt-2">Under Review</Badge>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{metrics.kycRejected}</div>
              <div className="text-sm text-red-700">Rejected</div>
              <Badge className="bg-red-100 text-red-800 mt-2">Requires Action</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card className="shadow-banking">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Security Alerts</span>
          </CardTitle>
          <CardDescription>
            Active security issues requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.lockedAccounts > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <Lock className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {metrics.lockedAccounts} user account{metrics.lockedAccounts > 1 ? 's are' : ' is'} currently locked due to security concerns.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.kycPending > 5 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  {metrics.kycPending} KYC documents are pending review. Consider processing these to maintain compliance.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.openTickets > 10 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700">
                  {metrics.openTickets} support tickets are currently open. High ticket volume may indicate security issues.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.lockedAccounts === 0 && metrics.kycPending <= 5 && metrics.openTickets <= 10 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  No active security alerts. All systems operating normally.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};