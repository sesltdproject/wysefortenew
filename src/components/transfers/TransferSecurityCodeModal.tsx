import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useSecurityCode } from "@/hooks/useSecurityCode";

interface TransferSecurityCodeModalProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
  userId: string;
  transferType: "domestic" | "international";
}

export const TransferSecurityCodeModal = ({
  open,
  onVerified,
  onCancel,
  userId,
  transferType,
}: TransferSecurityCodeModalProps) => {
  const [securityCode, setSecurityCode] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { verifySecurityCode } = useSecurityCode();

  const handleVerify = async () => {
    if (securityCode.length !== 6) {
      setError("Please enter your complete 6-digit security code");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const result = await verifySecurityCode(userId, securityCode);
      
      if (result.success) {
        setSecurityCode("");
        setAttempts(0);
        onVerified();
      } else {
        setAttempts(prev => prev + 1);
        setError(result.error || "Invalid security code. Please try again.");
        setSecurityCode("");
        
        if (attempts >= 3) {
          setError("Too many failed attempts. Please try again later.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setSecurityCode("");
    setError("");
    setAttempts(0);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security Verification Required
          </DialogTitle>
          <DialogDescription>
            Enter your 6-digit security code to authorize this {transferType} transfer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={securityCode}
              onChange={setSecurityCode}
              disabled={isVerifying || attempts > 3}
              type="password"
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {attempts > 0 && attempts <= 3 && (
            <p className="text-sm text-center text-muted-foreground">
              {4 - attempts} attempts remaining
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isVerifying}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerify} 
            disabled={isVerifying || securityCode.length !== 6 || attempts > 3}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
