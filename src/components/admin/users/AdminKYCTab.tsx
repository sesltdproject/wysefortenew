
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, XCircle, Eye, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface KYCDocument {
  id: string;
  user_name: string;
  user_email: string;
  document_type: string;
  verification_status: string;
  uploaded_at: string;
  document_url: string;
  admin_notes?: string;
  rejection_reason?: string;
}

export const AdminKYCTab = () => {
  const { toast } = useToast();
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string>("");

  const fetchKYC = async () => {
    try {
      setKycLoading(true);
      
      // Fetch KYC documents
      const { data: kycDocs, error: kycError } = await supabase
        .from('kyc_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (kycError) throw kycError;

      if (!kycDocs || kycDocs.length === 0) {
        setKycDocuments([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(kycDocs.map(doc => doc.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user profiles
      const profileMap = new Map(
        (profiles || []).map(p => [p.id, p])
      );

      // Transform data to match interface
      const transformedDocs: KYCDocument[] = kycDocs.map((doc: any) => {
        const profile = profileMap.get(doc.user_id);
        return {
          id: doc.id,
          user_name: profile?.full_name || 'Unknown User',
          user_email: profile?.email || 'No email',
          document_type: doc.document_type,
          verification_status: doc.verification_status,
          uploaded_at: doc.uploaded_at,
          document_url: doc.document_url,
          admin_notes: doc.admin_notes || '',
          rejection_reason: doc.rejection_reason || ''
        };
      });

      setKycDocuments(transformedDocs);
    } catch (error) {
      console.error('Error fetching KYC documents:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC documents.",
        variant: "destructive",
      });
    } finally {
      setKycLoading(false);
    }
  };

  useEffect(() => {
    fetchKYC();
  }, []);

  const handleKycApproval = async (documentId: string, status: 'approved' | 'rejected', notes: string = '') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          verification_status: status,
          admin_notes: notes,
          rejection_reason: status === 'rejected' ? notes : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', documentId);

      if (error) throw error;

      // Call edge function for notifications
      try {
        await supabase.functions.invoke('process-kyc-documents', {
          body: {
            document_id: documentId,
            action: status === 'approved' ? 'approve' : 'reject',
            admin_notes: notes
          }
        });
      } catch (fnError) {
        console.error('Error sending notification:', fnError);
        // Don't fail the whole operation if notification fails
      }

      toast({
        title: "Success",
        description: `KYC document ${status} successfully`,
      });

      fetchKYC();
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error updating KYC document:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC document",
        variant: "destructive",
      });
    }
  };

  const handleViewDocument = async (doc: KYCDocument) => {
    try {
      // Get signed URL for the document
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(doc.document_url, 3600); // 1 hour expiry

      if (error) throw error;

      if (data?.signedUrl) {
        setDocumentUrl(data.signedUrl);
        setShowDocumentViewer(true);
      }
    } catch (error) {
      console.error('Error fetching document:', error);
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive",
      });
    }
  };

  const handleRejectClick = (doc: KYCDocument) => {
    setSelectedDocument(doc);
    setShowRejectDialog(true);
  };

  const handleConfirmReject = () => {
    if (!selectedDocument || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    handleKycApproval(selectedDocument.id, 'rejected', rejectionReason);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          KYC Document Management
        </CardTitle>
        <CardDescription>
          Review and manage Know Your Customer documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {kycLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {kycDocuments.map((kyc) => (
                <Card key={kyc.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{kyc.user_name}</h3>
                        <p className="text-sm text-muted-foreground">{kyc.user_email}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {kyc.document_type?.replace('_', ' ')}
                          </Badge>
                          <Badge className={getStatusColor(kyc.verification_status)}>
                            {kyc.verification_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Uploaded {new Date(kyc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(kyc)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {kyc.verification_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleKycApproval(kyc.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectClick(kyc)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {(kyc.admin_notes || kyc.rejection_reason) && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        {kyc.rejection_reason && (
                          <>
                            <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                            <p className="text-sm mb-2">{kyc.rejection_reason}</p>
                          </>
                        )}
                        {kyc.admin_notes && kyc.admin_notes !== kyc.rejection_reason && (
                          <>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Admin Notes:</p>
                            <p className="text-sm">{kyc.admin_notes}</p>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejection..."
                className="min-h-[100px]"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>KYC Document Preview</DialogTitle>
            <DialogDescription>
              Review the uploaded document
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {documentUrl && (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(documentUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <iframe
                  src={documentUrl}
                  className="w-full h-[60vh] border rounded-lg"
                  title="Document Preview"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
