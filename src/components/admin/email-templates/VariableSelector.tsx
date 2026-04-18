import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface VariableSelectorProps {
  onInsert: (variable: string) => void;
}

interface VariableGroup {
  name: string;
  variables: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

const variableGroups: VariableGroup[] = [
  {
    name: "User",
    variables: [
      { key: "user_name", label: "User Name", description: "Full name of the user" },
      { key: "user_email", label: "User Email", description: "User's email address" }
    ]
  },
  {
    name: "Bank",
    variables: [
      { key: "bank_name", label: "Bank Name", description: "Name of the bank" },
      { key: "bank_address", label: "Bank Address", description: "Bank's physical address" },
      { key: "contact_email", label: "Contact Email", description: "Bank's support email" }
    ]
  },
  {
    name: "Transaction",
    variables: [
      { key: "transaction_type", label: "Transaction Type", description: "Type of transaction" },
      { key: "amount", label: "Amount", description: "Transaction amount" },
      { key: "description", label: "Description", description: "Transaction description" },
      { key: "reference_number", label: "Reference", description: "Transaction reference number" },
      { key: "transaction_date", label: "Date & Time", description: "When the transaction occurred" },
      { key: "admin_notes", label: "Admin Notes", description: "Admin rejection/approval notes" }
    ]
  },
  {
    name: "Account",
    variables: [
      { key: "account_number", label: "Account Number", description: "User's account number" },
      { key: "new_balance", label: "New Balance", description: "Account balance after transaction" },
      { key: "account_type", label: "Account Type", description: "Type of account (e.g. checking, savings)" }
    ]
  },
  {
    name: "2FA / Security",
    variables: [
      { key: "verification_code", label: "Verification Code", description: "6-digit verification code" },
      { key: "login_ip", label: "Login IP", description: "IP address of login attempt" },
      { key: "login_time", label: "Login Time", description: "Time of login attempt" },
      { key: "login_location", label: "Login Location", description: "Approximate location of login" },
      { key: "ip_address", label: "IP Address", description: "Client IP address" },
      { key: "attempt_count", label: "Attempt Count", description: "Number of failed login attempts" },
      { key: "attempt_time", label: "Attempt Time", description: "Time of last failed attempt" },
      { key: "locked_until", label: "Locked Until", description: "Account lock expiry time" }
    ]
  },
  {
    name: "Application",
    variables: [
      { key: "expiry_time", label: "Expiry Time", description: "Code expiration duration" },
      { key: "applicant_email", label: "Applicant Email", description: "Applicant's email address" },
      { key: "username", label: "Username", description: "Assigned username" },
      { key: "temporary_password", label: "Temporary Password", description: "Generated temporary password" },
      { key: "rejection_reason", label: "Rejection Reason", description: "Reason for application rejection" }
    ]
  },
  {
    name: "Crypto",
    variables: [
      { key: "crypto_type", label: "Crypto Type", description: "Type of cryptocurrency" },
      { key: "transaction_hash", label: "Transaction Hash", description: "Blockchain transaction hash" }
    ]
  }
];

export const VariableSelector = ({ onInsert }: VariableSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Variables</CardTitle>
        <CardDescription>
          Click to insert variables into your template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {variableGroups.map((group) => (
          <div key={group.name} className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">{group.name}</h4>
            <div className="space-y-1">
              {group.variables.map((variable) => (
                <Button
                  key={variable.key}
                  variant="ghost"
                  size="sm"
                  onClick={() => onInsert(variable.key)}
                  className="w-full justify-between h-auto p-2 hover:bg-muted"
                >
                  <div className="text-left">
                    <div className="font-medium text-xs">{variable.label}</div>
                    <div className="text-xs text-muted-foreground">{variable.description}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs font-mono">
                      {"{" + variable.key + "}"}
                    </Badge>
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};