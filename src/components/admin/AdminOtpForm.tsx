import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertCircle } from "lucide-react";

interface AdminOtpFormProps {
  newOtp: string;
  confirmOtp: string;
  otpMessage: string;
  onNewOtpChange: (value: string) => void;
  onConfirmOtpChange: (value: string) => void;
  onOtpSubmit: () => void;
  onCancel: () => void;
}

export const AdminOtpForm = ({
  newOtp,
  confirmOtp,
  otpMessage,
  onNewOtpChange,
  onConfirmOtpChange,
  onOtpSubmit,
  onCancel
}: AdminOtpFormProps) => {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Change Admin OTP Pin</CardTitle>
        <CardDescription>Update your administrative 6-10 digit security pin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {otpMessage && (
          <Alert className={otpMessage.includes("successfully") ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <AlertCircle className={`h-4 w-4 ${otpMessage.includes("successfully") ? "text-green-600" : "text-red-600"}`} />
            <AlertDescription className={otpMessage.includes("successfully") ? "text-green-700" : "text-red-700"}>
              {otpMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label>New Admin OTP Pin</Label>
          <div className="flex justify-center">
            <InputOTP 
              maxLength={10}
              value={newOtp}
              onChange={onNewOtpChange}
              className="gap-1 sm:gap-2"
            >
              <InputOTPGroup className="gap-1 sm:gap-2">
                <InputOTPSlot index={0} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={1} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={2} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={3} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={4} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={5} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Confirm Admin OTP Pin</Label>
          <div className="flex justify-center">
            <InputOTP 
              maxLength={10}
              value={confirmOtp}
              onChange={onConfirmOtpChange}
              className="gap-1 sm:gap-2"
            >
              <InputOTPGroup className="gap-1 sm:gap-2">
                <InputOTPSlot index={0} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={1} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={2} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={3} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={4} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
                <InputOTPSlot index={5} className="w-8 h-8 sm:w-10 sm:h-10 border-2 text-sm" />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={onOtpSubmit} variant="banking" className="flex-1">
            Update Admin OTP
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};