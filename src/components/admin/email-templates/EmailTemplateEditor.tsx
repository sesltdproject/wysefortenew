import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { VariableSelector } from "./VariableSelector";
import { TemplatePreview } from "./TemplatePreview";

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

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onSave: (templateData: {
    template_name: string;
    subject_template: string;
    html_template: string;
    template_variables: string[];
    is_active: boolean;
  }) => void;
  onCancel: () => void;
}

export const EmailTemplateEditor = ({ template, onSave, onCancel }: EmailTemplateEditorProps) => {
  const [subjectTemplate, setSubjectTemplate] = useState(template.subject_template);
  const [htmlTemplate, setHtmlTemplate] = useState(template.html_template);
  const [isActive, setIsActive] = useState(template.is_active);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("subject");

  const variables = [
    "user_name", "user_email", "bank_name", "bank_address", "contact_email", "bank_email",
    "transaction_type", "amount", "description", "reference_number", 
    "transaction_date", "account_number", "new_balance",
    "verification_code", "login_ip", "login_time", "login_location", "expiry_time",
    "applicant_email", "account_type", "username", "temporary_password", "rejection_reason",
    "crypto_type", "transaction_hash",
    "ip_address", "attempt_time", "attempt_count", "locked_until"
  ];

  const handleSave = () => {
    onSave({
      template_name: template.template_name,
      subject_template: subjectTemplate,
      html_template: htmlTemplate,
      template_variables: variables,
      is_active: isActive
    });
  };

  const insertVariable = (variable: string) => {
    const placeholder = `{${variable}}`;
    if (activeTab === "subject") {
      setSubjectTemplate(prev => prev + placeholder);
    } else if (activeTab === "html") {
      setHtmlTemplate(prev => prev + placeholder);
    }
  };

  const getTemplateDisplayName = (templateName: string) => {
    switch (templateName) {
      case 'credit_alert':
        return 'Credit Alert Template';
      case 'debit_alert':
        return 'Debit Alert Template';
      default:
        return templateName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (showPreview) {
    return (
      <TemplatePreview
        template={{
          ...template,
          subject_template: subjectTemplate,
          html_template: htmlTemplate,
          is_active: isActive
        }}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onCancel} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Edit {getTemplateDisplayName(template.template_name)}
            </h2>
            <p className="text-muted-foreground">
              Customize the email template content and settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)} className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-1">
            <Save className="w-4 h-4" />
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Template Settings</CardTitle>
                  <CardDescription>Configure template status and basic settings</CardDescription>
                </div>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="is-active">Active Template</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
              <CardDescription>Edit the subject line and HTML content of your email template</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="subject">Subject Line</TabsTrigger>
                  <TabsTrigger value="html">HTML Content</TabsTrigger>
                </TabsList>

                <TabsContent value="subject" className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Subject Template</Label>
                    <Input
                      id="subject"
                      value={subjectTemplate}
                      onChange={(e) => setSubjectTemplate(e.target.value)}
                      placeholder="Enter email subject template..."
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Use variables like {"{bank_name}"} to personalize the subject line
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="html" className="space-y-4">
                  <div>
                    <Label htmlFor="html">HTML Template</Label>
                    <Textarea
                      id="html"
                      value={htmlTemplate}
                      onChange={(e) => setHtmlTemplate(e.target.value)}
                      placeholder="Enter HTML email template..."
                      className="mt-1 min-h-[400px] font-mono text-sm"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Write HTML with inline CSS for best email client compatibility
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <VariableSelector onInsert={insertVariable} />
          
          <Card>
            <CardHeader>
              <CardTitle>Tips for Email Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Mobile-First:</strong> Use responsive design with media queries for mobile devices.
              </div>
              <div>
                <strong>Inline CSS:</strong> Email clients don't support external stylesheets well.
              </div>
              <div>
                <strong>Test Variables:</strong> Ensure all variables are properly formatted with curly braces.
              </div>
              <div>
                <strong>Color Contrast:</strong> Use high contrast colors for better accessibility.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};