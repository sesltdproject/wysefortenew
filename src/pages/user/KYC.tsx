import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Download,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n";

interface KYCDocument {
  id: string;
  document_type: string;
  document_url: string;
  verification_status: string;
  uploaded_at: string;
  rejection_reason?: string;
}

export const KYC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocType, setSelectedDocType] = useState<string>("");

  const documentTypes = [
    { value: "Passport", label: "Passport" },
    { value: "Driver's License", label: "Driver's License" },
    { value: "National ID Card", label: "National ID Card" },
    { value: "Utility Bill", label: "Utility Bill" },
    { value: "Bank Statement", label: "Bank Statement" },
    { value: "Tax Notice", label: "Tax Notice" },
    { value: "Lease Agreement", label: "Lease Agreement" },
    { value: "Other", label: "Other Document" }
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to view your documents",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedDocType) {
      toast({
        title: "Document type required",
        description: "Please select a document type before uploading.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { error: insertError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: user.id,
          document_type: selectedDocType,
          document_url: fileName,
          verification_status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded and is pending review.",
      });

      setSelectedDocType("");
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (doc: KYCDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(doc.document_url, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const approvedDocs = documents.filter(doc => doc.verification_status === 'approved').length;
  const totalDocs = documents.length;
  const verificationProgress = totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">{t('dashboard.kycVerification')}</h1>
        <p className="text-muted-foreground">{t('dashboard.kycVerificationDesc')}</p>
      </div>

      {/* Verification Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('dashboard.verificationStatus')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.verificationStatusDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('dashboard.progress')}</span>
              <span className="text-sm text-muted-foreground">
                {approvedDocs} {t('dashboard.of')} {totalDocs} {t('dashboard.documentsApproved')}
              </span>
            </div>
            <Progress value={verificationProgress} className="h-2" />
            <div className="flex items-center gap-2">
              {approvedDocs > 0 && approvedDocs === totalDocs ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    {t('dashboard.allDocumentsVerified')}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600 font-medium">
                    {t('dashboard.verificationInProgress')}
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('dashboard.uploadDocuments')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.uploadDocumentsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">{t('dashboard.documentType')}</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder={t('dashboard.selectDocumentType')} />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Click to upload documents</p>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, JPEG or PNG. Max file size 5MB.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !selectedDocType}
                className="mt-4"
              >
                {uploading ? "Uploading..." : "Select File"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('dashboard.uploadedDocuments')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.uploadedDocumentsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>{t('dashboard.noDocumentsUploaded')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{document.document_type}</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}
                      </p>
                      {document.rejection_reason && (
                        <p className="text-sm text-destructive mt-1">
                          Reason: {document.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(document.verification_status)}
                      <Badge className={getStatusColor(document.verification_status)}>
                        {document.verification_status}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => handleDownload(document)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help & Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.verificationRequirements')}</CardTitle>
          <CardDescription>
            {t('dashboard.verificationRequirementsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Acceptable Documents</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Government-issued photo ID</li>
                  <li>• Passport or driver's license</li>
                  <li>• Utility bills (recent)</li>
                  <li>• Bank statements</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Document Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Clear, readable images</li>
                  <li>• All corners visible</li>
                  <li>• No glare or shadows</li>
                  <li>• File size under 5MB</li>
                </ul>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Verification typically takes 1-3 business days. 
                You'll receive an email notification once your documents are reviewed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};