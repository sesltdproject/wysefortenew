import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Eye, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/utils";

interface PendingTransfer {
  id: string;
  account_id: string;
  user_id: string;
  amount: number;
  description: string;
  recipient_name: string;
  recipient_account: string;
  reference_number: string;
  created_at: string;
  status: string;
  user_name?: string;
  user_email?: string;
  account_number?: string;
  account_type?: string;
  bank_name?: string;
  routing_code?: string;
}

export const AdminPendingExternalTransfers = () => {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<PendingTransfer | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchPendingTransfers();
  }, []);

  const fetchPendingTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts(
            user_id,
            account_number,
            account_type,
            profiles!fk_accounts_user_id(full_name, email)
          )
        `)
        .eq('status', 'pending')
        .eq('transaction_type', 'transfer')
        .not('created_by', 'is', null) // User-created transfers only
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTransfers = (data || []).map(t => {
        const accounts = t.accounts as any;
        const profiles = accounts?.profiles as any;
        
        return {
          id: t.id,
          account_id: t.account_id,
          user_id: accounts?.user_id || '',
          amount: Math.abs(t.amount),
          description: t.description,
          recipient_name: t.recipient_name || 'Unknown',
          recipient_account: t.recipient_account || 'N/A',
          reference_number: t.reference_number,
          created_at: t.created_at,
          status: t.status,
          user_name: profiles?.full_name || 'Unknown',
          user_email: profiles?.email || '',
          account_number: accounts?.account_number || 'N/A',
          account_type: accounts?.account_type || 'Unknown',
          bank_name: t.bank_name || 'N/A',
          routing_code: t.routing_code || 'N/A'
        };
      });

      setTransfers(formattedTransfers);
    } catch (error) {
      console.error('Error fetching pending transfers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending transfers.",
        variant: "destructive"
      });
    }
  };

  const handleApproval = async (transferId: string, approve: boolean, transfer?: PendingTransfer) => {
    if (!approve && !adminNotes.trim()) {
      toast({
        title: "Error",
        description: "Admin notes are required for rejecting transfers.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('approve_external_transfer', {
        p_transaction_id: transferId,
        p_approve: approve,
        p_admin_notes: adminNotes.trim() || null
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };

      if (result.success) {
        // Apply domestic transfer charge if transfer was approved
        const transferData = transfer || selectedTransfer;
        if (approve && transferData) {
          try {
            await supabase.rpc('apply_domestic_transfer_charge', {
              p_account_id: transferData.account_id,
              p_reference_number: transferData.reference_number
            });
            console.log('Domestic transfer charge applied successfully');
          } catch (chargeError) {
            console.error('Failed to apply transfer charge:', chargeError);
            // Don't fail the approval if charge fails
          }

          // Send approval notification email
          try {
            await supabase.functions.invoke('send-transfer-notification', {
              body: {
              user_id: transferData.user_id,
              transfer_type: 'domestic',
              notification_type: 'approved',
              amount: transferData.amount,
              reference_number: transferData.reference_number,
              from_account: `${transferData.account_type} - ${transferData.account_number}`,
              recipient_name: transferData.recipient_name,
              recipient_account: transferData.recipient_account,
              recipient_bank: transferData.bank_name || 'N/A'
              }
            });
            console.log('Transfer approval notification email sent');
          } catch (emailError) {
            console.error('Failed to send approval notification email:', emailError);
          }
        }
        
        // Send rejection notification email
        if (!approve && transferData) {
          try {
            await supabase.functions.invoke('send-transfer-notification', {
              body: {
                user_id: transferData.user_id,
                transfer_type: 'domestic',
                notification_type: 'rejected',
                amount: transferData.amount,
                reference_number: transferData.reference_number,
                from_account: `${transferData.account_type} - ${transferData.account_number}`,
                recipient_name: transferData.recipient_name,
                recipient_account: transferData.recipient_account,
                recipient_bank: transferData.bank_name || 'N/A',
                admin_notes: adminNotes.trim()
              }
            });
            console.log('Transfer rejection notification email sent');
          } catch (emailError) {
            console.error('Failed to send rejection notification email:', emailError);
          }
        }

        toast({
          title: approve ? "Transfer Approved" : "Transfer Rejected",
          description: result.message || `Transfer has been ${approve ? 'approved' : 'rejected'} successfully.`
        });
        setAdminNotes("");
        setSelectedTransfer(null);
        setDetailsOpen(false);
        fetchPendingTransfers();
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error processing transfer:', error);
      toast({
        title: "Error",
        description: `Failed to process transfer: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Pending External Transfers
        </CardTitle>
        <CardDescription>
          External domestic transfers awaiting admin approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending external transfers found
            </div>
          ) : (
            transfers.map(transfer => (
              <div key={transfer.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{transfer.reference_number}</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        PENDING
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer</p>
                        <p className="font-medium">{transfer.user_name}</p>
                        <p className="text-sm text-muted-foreground">{transfer.user_email}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Account</p>
                        <p className="font-medium capitalize">{transfer.account_type}</p>
                        <p className="text-sm text-muted-foreground">{transfer.account_number}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Recipient</p>
                        <p className="font-medium">{transfer.recipient_name}</p>
                        <p className="text-sm text-muted-foreground">{transfer.recipient_account}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-bold text-lg">${formatAmount(transfer.amount)}</p>
                      </div>
                      
                      <div className="md:col-span-2">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-sm">{transfer.description}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Created</p>
                        <p className="text-sm">{new Date(transfer.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setAdminNotes("");
                        setDetailsOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setAdminNotes("");
                        handleApproval(transfer.id, true, transfer);
                      }}
                      disabled={loading}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setAdminNotes("");
                        setDetailsOpen(true);
                      }}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Details/Review Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review External Transfer</DialogTitle>
              <DialogDescription>
                Reference: {selectedTransfer?.reference_number}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTransfer && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Customer</h4>
                    <p><strong>Name:</strong> {selectedTransfer.user_name}</p>
                    <p><strong>Email:</strong> {selectedTransfer.user_email}</p>
                    <p><strong>Account:</strong> {selectedTransfer.account_type} ({selectedTransfer.account_number})</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Transfer Details</h4>
                    <p><strong>Amount:</strong> ${formatAmount(selectedTransfer.amount)}</p>
                    <p><strong>Recipient:</strong> {selectedTransfer.recipient_name}</p>
                    <p><strong>Account:</strong> {selectedTransfer.recipient_account}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <h4 className="font-semibold mb-2">Recipient Bank Details</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <p><strong>Bank Name:</strong> {selectedTransfer.bank_name}</p>
                      <p><strong>Routing/Sort Code:</strong> {selectedTransfer.routing_code}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p>{selectedTransfer.description}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Admin Notes</Label>
                  <Textarea 
                    id="adminNotes" 
                    placeholder="Add notes for approval/rejection..." 
                    value={adminNotes} 
                    onChange={(e) => setAdminNotes(e.target.value)} 
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleApproval(selectedTransfer.id, true)} 
                    disabled={loading} 
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve Transfer
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleApproval(selectedTransfer.id, false)} 
                    disabled={loading} 
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject Transfer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};