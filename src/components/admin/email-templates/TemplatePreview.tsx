import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Monitor, Smartphone, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface EmailTemplate {
  id: string;
  template_name: string;
  subject_template: string;
  html_template: string;
  template_variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplatePreviewProps {
  template: EmailTemplate;
  onClose: () => void;
}

export const TemplatePreview = ({ template, onClose }: TemplatePreviewProps) => {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();
  const { settings } = useWebsiteSettings();

  // Sample data for preview
  const sampleData = {
    user_name: "John Doe",
    user_email: "john.doe@example.com",
    bank_name: settings?.bankName || "Your Bank",
    bank_address: settings?.bankAddress || "123 Main Street, Cityville, ST 12345",
    contact_email: settings?.contactEmail || "info@yourbank.com",
    transaction_type: template.template_name === 'credit_alert' ? 'deposit' : 'withdrawal',
    amount: template.template_name === 'credit_alert' ? '1,250.00' : '89.50',
    description: template.template_name === 'credit_alert' ? 'Salary Deposit' : 'Online Purchase - Amazon',
    reference_number: 'TXN-ABC123XYZ',
    transaction_date: new Date().toLocaleString(),
    account_number: 'CHK-1234567890',
    new_balance: template.template_name === 'credit_alert' ? '5,475.22' : '4,385.72',
    admin_notes: 'Transfer did not meet compliance requirements'
  };

  const processTemplate = (template: string) => {
    let processed = template;
    // Support both {var} and {{var}} formats
    Object.entries(sampleData).forEach(([key, value]) => {
      const singleBrace = new RegExp(`\\{${key}\\}`, 'g');
      const doubleBrace = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(singleBrace, value).replace(doubleBrace, value);
    });
    return processed;
  };

  const processedSubject = processTemplate(template.subject_template);
  const processedHtml = processTemplate(template.html_template);

  const getTemplateDisplayName = (templateName: string) => {
    switch (templateName) {
      case 'credit_alert':
        return 'Credit Alert Template';
      case 'debit_alert':
        return 'Debit Alert Template';
      case 'crypto_deposit_pending':
        return 'Crypto Deposit Pending Template';
      case 'crypto_deposit_approved':
        return 'Crypto Deposit Approved Template';
      case 'domestic_transfer_rejected':
        return 'Domestic Transfer Rejected Template';
      case 'international_transfer_rejected':
        return 'International Transfer Rejected Template';
      default:
        return templateName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({ 
        title: "Error", 
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast({ 
        title: "Error", 
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-email-smtp', {
        body: {
          to: testEmail,
          subject: `[TEST] ${processedSubject}`,
          html: processedHtml,
          from_name: sampleData.bank_name
        }
      });

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: `Test email sent successfully to ${testEmail}` 
      });
      setTestEmail("");
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to send test email. Please check your email settings.",
        variant: "destructive"
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Preview {getTemplateDisplayName(template.template_name)}
            </h2>
            <p className="text-muted-foreground">
              Preview how the email will look to recipients
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={template.is_active ? "default" : "secondary"}>
            {template.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Preview</CardTitle>
                  <CardDescription>See how your email will appear to recipients</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={previewMode === "desktop" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("desktop")}
                    className="flex items-center gap-1"
                  >
                    <Monitor className="w-4 h-4" />
                    Desktop
                  </Button>
                  <Button
                    variant={previewMode === "mobile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("mobile")}
                    className="flex items-center gap-1"
                  >
                    <Smartphone className="w-4 h-4" />
                    Mobile
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="rendered" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="rendered">Rendered Email</TabsTrigger>
                  <TabsTrigger value="subject">Subject Line</TabsTrigger>
                  <TabsTrigger value="html">HTML Source</TabsTrigger>
                </TabsList>

                <TabsContent value="rendered" className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-4 border-b">
                      <div className="text-sm font-medium">Subject: {processedSubject}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        From: {sampleData.bank_name} &lt;{sampleData.contact_email}&gt;
                      </div>
                    </div>
                    <div 
                      className={`transition-all duration-300 ${
                        previewMode === "mobile" ? "max-w-sm mx-auto" : "w-full"
                      }`}
                    >
                      <iframe
                        srcDoc={processedHtml}
                        className="w-full h-96 border-0"
                        title="Email Preview"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="subject" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Processed Subject Line</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="font-medium">{processedSubject}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Subject Template</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <code className="text-sm">{template.subject_template}</code>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="html" className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Processed HTML</h4>
                    <div className="p-3 bg-muted rounded-lg max-h-64 overflow-auto">
                      <pre className="text-xs whitespace-pre-wrap">{processedHtml}</pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sample Data</CardTitle>
              <CardDescription>Data used for this preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(sampleData).map(([key, value]) => (
                <div key={key} className="text-xs">
                  <code className="bg-muted px-1 rounded">{"{" + key + "}"}</code>
                  <div className="text-muted-foreground mt-1">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Email</CardTitle>
              <CardDescription>Send a test email to verify the template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="email"
                placeholder="Enter email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !sendingTest && testEmail) {
                    handleSendTestEmail();
                  }
                }}
              />
              <Button 
                className="w-full flex items-center gap-2" 
                onClick={handleSendTestEmail}
                disabled={sendingTest || !testEmail}
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test Email
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                The test email will be sent with sample data
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};