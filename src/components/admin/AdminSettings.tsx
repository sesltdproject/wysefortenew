import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Lock, Database, Shield, Server } from "lucide-react";
import { AdminOtpForm } from "./AdminOtpForm";

interface AdminSettingsProps {
  showOtpForm: boolean;
  newOtp: string;
  confirmOtp: string;
  otpMessage: string;
  onShowOtpForm: () => void;
  onNewOtpChange: (value: string) => void;
  onConfirmOtpChange: (value: string) => void;
  onOtpSubmit: () => void;
  onCancelOtp: () => void;
}

export const AdminSettings = ({
  showOtpForm,
  newOtp,
  confirmOtp,
  otpMessage,
  onShowOtpForm,
  onNewOtpChange,
  onConfirmOtpChange,
  onOtpSubmit,
  onCancelOtp
}: AdminSettingsProps) => {
  return (
    <div className="space-y-6">
      <Card className="shadow-banking">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>System Settings</span>
          </CardTitle>
          <CardDescription>Administrative system configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-16 sm:h-20 flex-col hover-lift"
              onClick={onShowOtpForm}
            >
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
              <span className="text-sm">Change Admin OTP</span>
            </Button>
            <Button variant="outline" className="h-16 sm:h-20 flex-col hover-lift">
              <Database className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
              <span className="text-sm">Database Config</span>
            </Button>
            <Button variant="outline" className="h-16 sm:h-20 flex-col hover-lift">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
              <span className="text-sm">Security Policies</span>
            </Button>
            <Button variant="outline" className="h-16 sm:h-20 flex-col hover-lift">
              <Server className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
              <span className="text-sm">Server Status</span>
            </Button>
          </div>
          
          {showOtpForm && (
            <AdminOtpForm
              newOtp={newOtp}
              confirmOtp={confirmOtp}
              otpMessage={otpMessage}
              onNewOtpChange={onNewOtpChange}
              onConfirmOtpChange={onConfirmOtpChange}
              onOtpSubmit={onOtpSubmit}
              onCancel={onCancelOtp}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};