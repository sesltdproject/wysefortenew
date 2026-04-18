import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, Check, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/utils";
import { AdminPendingExternalTransfers } from "./AdminPendingExternalTransfers";
interface ForeignRemittance {
  id: string;
  user_id: string;
  account_id: string;
  recipient_name: string;
  recipient_account: string;
  bank_name: string;
  bank_address?: string;
  recipient_country: string;
  recipient_address?: string;
  amount: number;
  currency: string;
  purpose_of_transfer?: string;
  swift_code?: string;
  iban?: string;
  correspondent_bank?: string;
  priority?: string;
  status: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  completed_at?: string;
  admin_notes?: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  accounts?: {
    account_type: string;
    account_number: string;
  } | null;
}
export const AdminForeignRemittances = () => {
  const {
    toast
  } = useToast();
  const [remittances, setRemittances] = useState<ForeignRemittance[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [detailsDialogRemittance, setDetailsDialogRemittance] = useState<ForeignRemittance | null>(null);
  useEffect(() => {
    fetchRemittances();
  }, []);
  const fetchRemittances = async () => {
    try {
      // First, get all remittances
      const { data: remittancesData, error: remittancesError } = await supabase
        .from('foreign_remittances')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (remittancesError) throw remittancesError;
      
      if (!remittancesData || remittancesData.length === 0) {
        setRemittances([]);
        return;
      }
      
      // Get unique user IDs and account IDs
      const userIds = [...new Set(remittancesData.map(r => r.user_id))];
      const accountIds = [...new Set(remittancesData.map(r => r.account_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Fetch accounts for sender account info
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, account_type, account_number')
        .in('id', accountIds);
      
      if (accountsError) throw accountsError;
      
      // Create maps for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );
      
      const accountsMap = new Map(
        (accountsData || []).map(a => [a.id, a])
      );
      
      // Merge the data
      const mergedData = remittancesData.map(remittance => ({
        ...remittance,
        profiles: profilesMap.get(remittance.user_id) || null,
        accounts: accountsMap.get(remittance.account_id) || null
      }));
      
      setRemittances(mergedData as any);
    } catch (error) {
      console.error('Error fetching foreign remittances:', error);
      toast({
        title: "Error",
        description: "Failed to fetch foreign remittances.",
        variant: "destructive"
      });
    }
  };
  const handleApproval = async (
    remittanceId: string, 
    action: 'approved' | 'rejected', 
    closeDialog = false,
    remittance?: ForeignRemittance  // Optional parameter for quick approve
  ) => {
    if (!adminNotes.trim() && action === 'rejected') {
      toast({
        title: "Error",
        description: "Admin notes are required for rejecting transfers.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // Use the proper database function that handles refunds correctly
      const { data, error } = await supabase.rpc('approve_foreign_remittance', {
        remittance_id: remittanceId,
        approve: action === 'approved',
        notes: adminNotes.trim() || null
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        // Apply international transfer charge if transfer was approved
        // Use passed remittance data OR dialog remittance (for quick approve vs dialog approve)
        const remittanceData = remittance || detailsDialogRemittance;
        if (action === 'approved' && remittanceData) {
          try {
            await supabase.rpc('apply_international_transfer_charge', {
              p_account_id: remittanceData.account_id,
              p_reference_number: remittanceData.id.substring(0, 8)
            });
            console.log('International transfer charge applied successfully');
          } catch (chargeError) {
            console.error('Failed to apply transfer charge:', chargeError);
            // Don't fail the approval if charge fails
          }

          // Send approval notification email
          try {
            await supabase.functions.invoke('send-transfer-notification', {
              body: {
                user_id: remittanceData.user_id,
                transfer_type: 'international',
                notification_type: 'approved',
                amount: remittanceData.amount,
                reference_number: remittanceData.id.substring(0, 8),
                from_account: remittanceData.accounts 
                  ? `${remittanceData.accounts.account_type} - ${remittanceData.accounts.account_number}`
                  : 'N/A',
                recipient_name: remittanceData.recipient_name,
                recipient_bank: remittanceData.bank_name,
                swift_code: remittanceData.swift_code || 'N/A'
              }
            });
            console.log('International transfer approval notification email sent');
          } catch (emailError) {
            console.error('Failed to send approval notification email:', emailError);
          }
        }
        
        // Send rejection notification email
        if (action === 'rejected' && remittanceData) {
          try {
            await supabase.functions.invoke('send-transfer-notification', {
              body: {
                user_id: remittanceData.user_id,
                transfer_type: 'international',
                notification_type: 'rejected',
                amount: remittanceData.amount,
                reference_number: remittanceData.id.substring(0, 8),
                from_account: remittanceData.accounts 
                  ? `${remittanceData.accounts.account_type} - ${remittanceData.accounts.account_number}`
                  : 'N/A',
                recipient_name: remittanceData.recipient_name,
                recipient_bank: remittanceData.bank_name,
                swift_code: remittanceData.swift_code || 'N/A',
                admin_notes: adminNotes.trim()
              }
            });
            console.log('International transfer rejection notification email sent');
          } catch (emailError) {
            console.error('Failed to send rejection notification email:', emailError);
          }
        }

        toast({
          title: `Transfer ${action}`,
          description: result.message || `Foreign remittance has been ${action} successfully.`
        });
        setAdminNotes("");
        
        // Close dialog if requested (from dialog buttons, not quick action buttons)
        if (closeDialog) {
          setDetailsDialogRemittance(null);
        }
        
        fetchRemittances();
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error(`Error ${action} remittance:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} remittance: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const filterRemittances = (status: string) => {
    if (status === 'all') return remittances;
    return remittances.filter(r => r.status === status);
  };
  const RemittanceCard = ({
    remittance
  }: {
    remittance: ForeignRemittance;
  }) => {
    return (
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <span className="font-semibold">Transfer ID: {remittance.id.substring(0, 8)}</span>
              <Badge className={getStatusColor(remittance.status)}>
                {remittance.status}
              </Badge>
              <span className="text-sm text-muted-foreground">{remittance.currency}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{remittance.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">{remittance.profiles?.email}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Recipient</p>
                <p className="font-medium">{remittance.recipient_name}</p>
                <p className="text-sm text-muted-foreground">{remittance.bank_name}</p>
                <p className="text-xs text-muted-foreground">{remittance.recipient_country}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-bold text-lg">${formatAmount(remittance.amount)}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(remittance.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {remittance.admin_notes && (
              <div className="mt-2 p-2 bg-muted rounded">
                <p className="text-sm text-muted-foreground">Admin Notes:</p>
                <p className="text-sm">{remittance.admin_notes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setDetailsDialogRemittance(remittance);
                setAdminNotes(remittance.admin_notes || "");
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>

            {remittance.status === 'pending' && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setAdminNotes("");
                    handleApproval(remittance.id, 'approved', false, remittance);
                  }}
                  disabled={loading}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => {
                    setDetailsDialogRemittance(remittance);
                    setAdminNotes("");
                  }}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  return <div className="space-y-6">
      <Tabs defaultValue="international" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="international">
            International Transfers
          </TabsTrigger>
          <TabsTrigger value="domestic">
            Domestic Transfers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="international">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-primary">International Transfer Management</h2>
              <p className="text-muted-foreground">Review and manage international transfer requests</p>
            </div>

            <Tabs defaultValue="pending" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pending" className="text-xs sm:text-sm">
                  Pending <span className="hidden sm:inline">({filterRemittances('pending').length})</span>
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs sm:text-sm">
                  Approved <span className="hidden sm:inline">({filterRemittances('approved').length})</span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs sm:text-sm">
                  Rejected <span className="hidden sm:inline">({filterRemittances('rejected').length})</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  All <span className="hidden sm:inline">({remittances.length})</span>
                </TabsTrigger>
              </TabsList>

              {(['pending', 'approved', 'rejected', 'all'] as const).map(status => <TabsContent key={status} value={status}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} Remittances
                      </CardTitle>
                      <CardDescription>
                        {status === 'pending' && 'Transfers awaiting admin approval'}
                        {status === 'approved' && 'Approved transfers ready for processing'}
                        {status === 'rejected' && 'Rejected transfer requests'}
                        {status === 'all' && 'Complete list of all foreign remittance requests'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filterRemittances(status).length === 0 ? <div className="text-center py-8 text-muted-foreground">
                            No {status === 'all' ? '' : status} foreign remittances found
                          </div> : filterRemittances(status).map(remittance => <RemittanceCard key={remittance.id} remittance={remittance} />)}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>)}
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent value="domestic">
          <AdminPendingExternalTransfers />
        </TabsContent>
      </Tabs>

      {/* Details Dialog - Managed at parent level */}
      <Dialog 
        open={!!detailsDialogRemittance} 
        onOpenChange={(open) => {
          if (!open) {
            setDetailsDialogRemittance(null);
            setAdminNotes("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {detailsDialogRemittance && (
            <>
              <DialogHeader>
                <DialogTitle>Foreign Remittance Details</DialogTitle>
                <DialogDescription>
                  Transfer ID: {detailsDialogRemittance.id}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Customer Information</h4>
                    <p><strong>Name:</strong> {detailsDialogRemittance.profiles?.full_name}</p>
                    <p><strong>Email:</strong> {detailsDialogRemittance.profiles?.email}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Sender Account</h4>
                    <p><strong>Account Type:</strong> {detailsDialogRemittance.accounts?.account_type 
                      ? detailsDialogRemittance.accounts.account_type.charAt(0).toUpperCase() + detailsDialogRemittance.accounts.account_type.slice(1) 
                      : 'Unknown'}</p>
                    <p><strong>Account Number:</strong> {detailsDialogRemittance.accounts?.account_number || 'Unknown'}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Transfer Details</h4>
                    <p><strong>Amount:</strong> {detailsDialogRemittance.currency} ${formatAmount(detailsDialogRemittance.amount)}</p>
                    <p><strong>Purpose:</strong> {detailsDialogRemittance.purpose_of_transfer || 'Not specified'}</p>
                    <p><strong>Priority:</strong> {detailsDialogRemittance.priority ? detailsDialogRemittance.priority.charAt(0).toUpperCase() + detailsDialogRemittance.priority.slice(1) : 'Normal'}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Banking Details</h4>
                    <p><strong>SWIFT/BIC:</strong> {detailsDialogRemittance.swift_code || 'Not provided'}</p>
                    <p><strong>IBAN:</strong> {detailsDialogRemittance.iban || 'Not applicable'}</p>
                    {detailsDialogRemittance.correspondent_bank && (
                      <p><strong>Correspondent Bank:</strong> {detailsDialogRemittance.correspondent_bank}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Recipient Information</h4>
                    <p><strong>Name:</strong> {detailsDialogRemittance.recipient_name}</p>
                    <p><strong>Account:</strong> {detailsDialogRemittance.recipient_account}</p>
                    <p><strong>Address:</strong> {detailsDialogRemittance.recipient_address || 'Not provided'}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Bank Information</h4>
                    <p><strong>Bank Name:</strong> {detailsDialogRemittance.bank_name}</p>
                    <p><strong>Bank Address:</strong> {detailsDialogRemittance.bank_address || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {detailsDialogRemittance.status === 'pending' && (
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialogAdminNotes">Admin Notes</Label>
                    <Textarea 
                      id="dialogAdminNotes" 
                      placeholder="Add notes for approval/rejection..." 
                      value={adminNotes} 
                      onChange={(e) => setAdminNotes(e.target.value)} 
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        handleApproval(detailsDialogRemittance.id, 'approved', true);
                      }} 
                      disabled={loading} 
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve Transfer
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleApproval(detailsDialogRemittance.id, 'rejected', true);
                      }} 
                      disabled={loading} 
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject Transfer
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>;
};