import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, User, Building, Shield, DollarSign, FileText, Users, Download, Eye, Loader2, Banknote } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ApplicationDetailsDialogProps {
  application: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ApplicationDetailsDialog = ({
  application,
  open,
  onOpenChange,
  onUpdate,
}: ApplicationDetailsDialogProps) => {
  const [adminNotes, setAdminNotes] = useState(application.admin_notes || "");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [requiredInitialDeposit, setRequiredInitialDeposit] = useState("");
  const { toast } = useToast();

  // Generate signed URL for document access
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    if (!filePath) return null;
    
    try {
      const { data, error } = await supabase.storage
        .from('kyc-applications')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      if (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }
      
      return data?.signedUrl || null;
    } catch (err) {
      console.error('Error getting signed URL:', err);
      return null;
    }
  };

  // Handle view full size - opens in new tab
  const handleViewFullSize = async (filePath: string, docType: string) => {
    const url = await getSignedUrl(filePath);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Error",
        description: `Unable to load ${docType}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Handle download - fetches blob and triggers download
  const handleDownload = async (filePath: string, docType: string) => {
    setDownloadingDoc(docType);
    
    try {
      const { data, error } = await supabase.storage
        .from('kyc-applications')
        .download(filePath);
      
      if (error) {
        throw error;
      }
      
      // Create blob URL and trigger download
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract file extension from path
      const extension = filePath.split('.').pop() || 'file';
      link.download = `${docType}-${application.reference_number}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: `${docType} downloaded successfully`,
      });
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: `Failed to download ${docType}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      
      // Parse the required initial deposit amount
      const depositAmount = requiredInitialDeposit ? parseFloat(requiredInitialDeposit) : null;
      
      // Use the new edge function that creates user account automatically
      const { data, error } = await supabase.functions.invoke('approve-account-application', {
        body: {
          application_id: application.id,
          admin_notes: adminNotes || null,
          required_initial_deposit: depositAmount,
        }
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to approve application');
      }

      // Note: Approval email with temporary password is sent by the edge function

      toast({
        title: "Success",
        description: `Application approved! Account ${data.account_number} created. User can login with their email.`,
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowApproveDialog(false);
      setRequiredInitialDeposit("");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);
      const { data, error } = await supabase.rpc('reject_account_application', {
        p_application_id: application.id,
        p_rejection_reason: rejectionReason,
        p_admin_notes: adminNotes || null,
      });

      if (error) throw error;

      // Send rejection email notification
      try {
        await supabase.functions.invoke('send-application-decision', {
          body: {
            application_id: application.id,
            decision: 'rejected',
            rejection_reason: rejectionReason,
            admin_notes: adminNotes,
          }
        });
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError);
        // Don't fail the rejection if email fails
      }

      toast({
        title: "Success",
        description: "Application rejected and notification sent",
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject application",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-b-0">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="col-span-2 text-sm">{value || "N/A"}</div>
    </div>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Document action buttons component
  const DocumentActions = ({ filePath, docType }: { filePath: string; docType: string }) => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleViewFullSize(filePath, docType)}
      >
        <Eye className="h-4 w-4 mr-2" />
        View Full Size
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownload(filePath, docType)}
        disabled={downloadingDoc === docType}
      >
        {downloadingDoc === docType ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download
      </Button>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">Application Details</DialogTitle>
                <DialogDescription>
                  Reference: {application.reference_number}
                </DialogDescription>
              </div>
              {getStatusBadge(application.status)}
            </div>
          </DialogHeader>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="consents">Consents</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow label="Title" value={application.title} />
                  <InfoRow label="First Name" value={application.first_name} />
                  <InfoRow label="Middle Name" value={application.middle_name} />
                  <InfoRow label="Last Name" value={application.last_name} />
                  <InfoRow label="Date of Birth" value={application.date_of_birth} />
                  <InfoRow label="Email" value={application.email} />
                  <InfoRow label="Phone" value={application.phone_number} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow label="Street Address" value={application.street_address} />
                  <InfoRow label="Apartment/Unit" value={application.apartment} />
                  <InfoRow label="City" value={application.city} />
                  <InfoRow label="State/Province" value={application.state} />
                  <InfoRow label="Postal Code" value={application.postal_code} />
                  <InfoRow label="Country" value={application.country} />
                </CardContent>
              </Card>

              {application.joint_applicant_data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Joint Applicant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <InfoRow label="Name" value={`${application.joint_applicant_data.firstName} ${application.joint_applicant_data.lastName}`} />
                    <InfoRow label="Date of Birth" value={application.joint_applicant_data.dateOfBirth} />
                    <InfoRow label="Email" value={application.joint_applicant_data.email} />
                    <InfoRow label="Phone" value={application.joint_applicant_data.phone} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Account Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow label="Account Ownership" value={application.account_ownership} />
                  <InfoRow label="Account Type" value={application.account_type} />
                  <InfoRow label="Account Name" value={application.account_name} />
                  {application.account_ownership === 'corporate' && (
                    <>
                      <InfoRow label="Company Name" value={application.company_name} />
                      <InfoRow label="Registration Number" value={application.business_registration_number} />
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="identity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Identity Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoRow label="ID Type" value={application.id_type} />
                  <InfoRow label="ID Number" value={application.id_number} />
                  <InfoRow label="Full Name on ID" value={application.id_full_name} />
                  
                  {/* ID Document */}
                  <div className="py-3 border-b">
                    <div className="text-sm font-medium text-muted-foreground mb-3">ID Document</div>
                    {application.id_document_url ? (
                      <DocumentActions filePath={application.id_document_url} docType="ID Document" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Not uploaded</span>
                    )}
                  </div>

                  <InfoRow label="Proof of Address Type" value={application.proof_of_address_type} />
                  <InfoRow label="Proof of Address Date" value={application.proof_of_address_date} />
                  
                  {/* Proof of Address */}
                  <div className="py-3">
                    <div className="text-sm font-medium text-muted-foreground mb-3">Proof of Address</div>
                    {application.proof_of_address_url ? (
                      <DocumentActions filePath={application.proof_of_address_url} docType="Proof of Address" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Not uploaded</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow label="Employment Status" value={application.employment_status} />
                  <InfoRow label="Source of Funds" value={application.source_of_funds} />
                  <InfoRow label="Tax Country" value={application.tax_country} />
                  <InfoRow label="Tax ID Number" value={application.tax_identification_number} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security & Next of Kin
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow label="Desired Username" value={application.desired_username} />
                  <div className="border-t my-4" />
                  <div className="text-sm font-medium mb-2">Next of Kin</div>
                  <InfoRow label="Name" value={application.next_of_kin_name} />
                  <InfoRow label="Relationship" value={application.next_of_kin_relationship} />
                  <InfoRow label="Phone" value={application.next_of_kin_phone} />
                  <InfoRow label="Email" value={application.next_of_kin_email} />
                  <InfoRow label="Address" value={application.next_of_kin_address} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Consents & Agreements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow 
                    label="Terms Accepted" 
                    value={application.terms_accepted ? "Yes" : "No"} 
                  />
                  <InfoRow 
                    label="Accuracy Confirmed" 
                    value={application.accuracy_confirmed ? "Yes" : "No"} 
                  />
                  <InfoRow 
                    label="Electronic Consent" 
                    value={application.electronic_consent ? "Yes" : "No"} 
                  />
                  <InfoRow 
                    label="Marketing Consent" 
                    value={application.marketing_consent ? "Yes" : "No"} 
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {application.status === 'pending' && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add internal notes about this application..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-4 justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Application
                </Button>
                <Button
                  variant="default"
                  onClick={() => setShowApproveDialog(true)}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Application
                </Button>
              </div>
            </div>
          )}

          {application.status !== 'pending' && (
            <div className="pt-4 border-t">
              <Card>
                <CardHeader>
                  <CardTitle>Review Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow label="Status" value={application.status} />
                  <InfoRow label="Reviewed At" value={application.reviewed_at ? new Date(application.reviewed_at).toLocaleString() : null} />
                  <InfoRow label="Admin Notes" value={application.admin_notes} />
                  {application.rejection_reason && (
                    <InfoRow label="Rejection Reason" value={application.rejection_reason} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog with Initial Deposit */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              Approve Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new user account for <strong>{application.email}</strong> and send them login credentials.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="requiredDeposit" className="text-sm font-medium">
                Required Initial Deposit Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {application.currency || 'USD'}
                </span>
                <Input
                  id="requiredDeposit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={requiredInitialDeposit}
                  onChange={(e) => setRequiredInitialDeposit(e.target.value)}
                  className="pl-14"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty if no specific deposit amount is required. This amount will be shown to the user and included in the approval email.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="approvalNotes" className="text-sm font-medium">
                Admin Notes (Optional)
              </Label>
              <Textarea
                id="approvalNotes"
                placeholder="Add internal notes about this approval..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? "Processing..." : "Approve & Send Notification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this application. This will be included in the notification email to the applicant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? "Processing..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
