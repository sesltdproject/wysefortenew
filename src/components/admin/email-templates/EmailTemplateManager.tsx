import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Edit, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplateEditor } from "./EmailTemplateEditor";
import { TemplatePreview } from "./TemplatePreview";

interface EmailTemplate {
  id: string;
  template_name: string;
  subject_template: string;
  html_template: string;
  template_variables: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const EmailTemplateManager = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase.rpc('get_email_templates');
      
      console.log('Email templates fetch result:', { data, error });
      
      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      // Handle the response more defensively
      let templateArray = [];
      if (Array.isArray(data)) {
        templateArray = data;
      } else if (data && typeof data === 'object') {
        templateArray = [data];
      }
      
      const processedTemplates = templateArray.map((template: any) => {
        let templateVars = [];
        try {
          if (Array.isArray(template.template_variables)) {
            templateVars = template.template_variables;
          } else if (typeof template.template_variables === 'string') {
            templateVars = JSON.parse(template.template_variables);
          } else if (template.template_variables) {
            templateVars = template.template_variables;
          }
        } catch (e) {
          console.warn('Failed to parse template variables:', e);
          templateVars = [];
        }
        
        return {
          ...template,
          template_variables: templateVars
        };
      });
      
      setTemplates(processedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: `Failed to fetch email templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      // Set empty array instead of leaving it undefined
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: {
    template_name: string;
    subject_template: string;
    html_template: string;
    template_variables: string[];
    is_active: boolean;
  }) => {
    try {
      const { data, error } = await supabase.rpc('update_email_template', {
        template_id: templateData.template_name,
        new_subject: templateData.subject_template,
        new_body: templateData.html_template
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      if (result.success) {
        toast({
          title: "Success",
          description: "Email template updated successfully"
        });
        setEditingTemplate(null);
        fetchTemplates();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save email template",
        variant: "destructive"
      });
    }
  };

  const getTemplateDisplayName = (templateName: string) => {
    switch (templateName) {
      case 'credit_alert':
        return 'Credit Alert Template';
      case 'debit_alert':
        return 'Debit Alert Template';
      case 'account_application_verification':
        return 'Account Application Verification';
      case 'application_submitted':
        return 'Application Submission Confirmation';
      case 'application_approved':
        return 'Application Approved Notification';
      case 'application_rejected':
        return 'Application Rejected Notification';
      case 'crypto_deposit_pending':
        return 'Crypto Deposit Pending Confirmation';
      case 'crypto_deposit_approved':
        return 'Crypto Deposit Approved Notification';
      case 'email_2fa_login':
        return 'Email 2FA Login Verification';
      case 'failed_login_alert':
        return 'Failed Login Security Alert';
      case 'password_reset':
        return 'Password Reset';
      case 'email_verification':
        return 'Email Verification';
      case 'domestic_transfer_submitted':
        return 'Domestic Transfer Submitted';
      case 'domestic_transfer_approved':
        return 'Domestic Transfer Approved';
      case 'international_transfer_submitted':
        return 'International Transfer Submitted';
      case 'international_transfer_approved':
        return 'International Transfer Approved';
      case 'domestic_transfer_rejected':
        return 'Domestic Transfer Rejected';
      case 'international_transfer_rejected':
        return 'International Transfer Rejected';
      default:
        return templateName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTemplateDescription = (templateName: string) => {
    switch (templateName) {
      case 'credit_alert':
        return 'Used for deposits, loan disbursements, and refunds';
      case 'debit_alert':
        return 'Used for withdrawals, bill payments, and transfers';
      case 'account_application_verification':
        return 'Email verification code sent during account application process';
      case 'application_submitted':
        return 'Sent when a new account application is submitted for review';
      case 'application_approved':
        return 'Sent when an account application is approved with account details';
      case 'application_rejected':
        return 'Sent when an account application is rejected with reason';
      case 'crypto_deposit_pending':
        return 'Sent when a user submits a crypto deposit for approval';
      case 'crypto_deposit_approved':
        return 'Sent when a crypto deposit is approved by admin with balance';
      case 'email_2fa_login':
        return 'Verification code sent during two-factor authentication login';
      case 'failed_login_alert':
        return 'Security alert sent when account is locked after failed login attempts';
      case 'password_reset':
        return 'Sent when a user requests a password reset with verification code';
      case 'email_verification':
        return 'General email verification code for user identity confirmation';
      case 'domestic_transfer_submitted':
        return 'Sent when a domestic transfer is submitted and pending approval';
      case 'domestic_transfer_approved':
        return 'Sent when a domestic transfer is approved and processed';
      case 'international_transfer_submitted':
        return 'Sent when an international transfer is submitted and pending approval';
      case 'international_transfer_approved':
        return 'Sent when an international transfer is approved and processed';
      case 'domestic_transfer_rejected':
        return 'Sent when a domestic transfer is rejected by admin with reason';
      case 'international_transfer_rejected':
        return 'Sent when an international transfer is rejected by admin with reason';
      default:
        return 'Custom email template';
    }
  };

  if (editingTemplate) {
    return (
      <EmailTemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => setEditingTemplate(null)}
      />
    );
  }

  if (previewTemplate) {
    return (
      <TemplatePreview
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Email Templates</h2>
        <p className="text-muted-foreground">
          Manage transactional email templates for customer notifications
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="variables">Template Variables</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading templates...</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {getTemplateDisplayName(template.template_name)}
                        </CardTitle>
                        <CardDescription>
                          {getTemplateDescription(template.template_name)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.is_active ? "default" : "secondary"}>
                          {template.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Subject Template</h4>
                        <p className="text-sm">{template.subject_template}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewTemplate(template)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Template Variables</CardTitle>
              <CardDescription>
                Use these variables in your email templates. They will be replaced with actual values when sending emails.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3 text-foreground">User Variables</h4>
                  <div className="space-y-1 text-sm">
                    <div><code className="bg-muted px-1 rounded">{"{user_name}"}</code> - User's full name</div>
                    <div><code className="bg-muted px-1 rounded">{"{user_email}"}</code> - User's email address</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-foreground">Bank Variables</h4>
                  <div className="space-y-1 text-sm">
                    <div><code className="bg-muted px-1 rounded">{"{bank_name}"}</code> - Bank name</div>
                    <div><code className="bg-muted px-1 rounded">{"{bank_address}"}</code> - Bank address</div>
                    <div><code className="bg-muted px-1 rounded">{"{contact_email}"}</code> - Support email</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-foreground">Transaction Variables</h4>
                  <div className="space-y-1 text-sm">
                    <div><code className="bg-muted px-1 rounded">{"{transaction_type}"}</code> - Type of transaction</div>
                    <div><code className="bg-muted px-1 rounded">{"{amount}"}</code> - Transaction amount</div>
                    <div><code className="bg-muted px-1 rounded">{"{description}"}</code> - Transaction description</div>
                    <div><code className="bg-muted px-1 rounded">{"{reference_number}"}</code> - Reference number</div>
                    <div><code className="bg-muted px-1 rounded">{"{transaction_date}"}</code> - Date and time</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-foreground">Account Variables</h4>
                  <div className="space-y-1 text-sm">
                    <div><code className="bg-muted px-1 rounded">{"{account_number}"}</code> - Account number</div>
                    <div><code className="bg-muted px-1 rounded">{"{new_balance}"}</code> - Balance after transaction</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-foreground">2FA Variables</h4>
                  <div className="space-y-1 text-sm">
                    <div><code className="bg-muted px-1 rounded">{"{verification_code}"}</code> - The 6-digit verification code</div>
                    <div><code className="bg-muted px-1 rounded">{"{login_ip}"}</code> - IP address of login attempt</div>
                    <div><code className="bg-muted px-1 rounded">{"{login_location}"}</code> - Approximate location</div>
                    <div><code className="bg-muted px-1 rounded">{"{login_time}"}</code> - Time of login attempt</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-foreground">Application Variables</h4>
                  <div className="space-y-1 text-sm">
                    <div><code className="bg-muted px-1 rounded">{"{verification_code}"}</code> - 6-digit verification code</div>
                    <div><code className="bg-muted px-1 rounded">{"{expiry_time}"}</code> - Code expiry time (e.g., "15 minutes")</div>
                    <div><code className="bg-muted px-1 rounded">{"{applicant_email}"}</code> - Applicant's email address</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};