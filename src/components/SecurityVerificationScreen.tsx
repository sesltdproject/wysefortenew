import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, AlertCircle } from "lucide-react";
import { useSecurityCode } from "@/hooks/useSecurityCode";
import { AccountLockedDialog } from "@/components/AccountLockedDialog";


interface SecurityVerificationScreenProps {
  userId: string;
  onVerified: () => void;
  onBack: () => void;
}

export const SecurityVerificationScreen = ({ 
  userId, 
  onVerified, 
  onBack 
}: SecurityVerificationScreenProps) => {
  const [securityCode, setSecurityCode] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  const { verifySecurityCode } = useSecurityCode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityCode.length !== 6) {
      setErrors(["Please enter a 6-digit security code."]);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const result = await verifySecurityCode(userId, securityCode);
      const typedResult = result as { success: boolean; error?: string; type?: string; hard_locked?: boolean };
      
      if (typedResult.success) {
        onVerified();
      } else {
        setSecurityCode(""); // Clear the code
        
        if (typedResult.hard_locked) {
          setShowLockedDialog(true);
        } else {
          setErrors([typedResult.error || "Invalid security code. Please try again."]);
        }
      }
    } catch (error) {
      console.error('Security code verification error:', error);
      setErrors(["An error occurred while verifying your security code."]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      
      <Card className="w-full max-w-md shadow-banking animate-scale-in transition-all duration-500 hover:shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-primary animate-slide-in-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards]">Security Verification</CardTitle>
          <CardDescription className="animate-slide-in-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
            Please enter your 6-digit security code to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Error Messages */}
          {errors.length > 0 && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <ul className="list-disc pl-4 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 animate-slide-in-up [animation-delay:300ms] opacity-0 [animation-fill-mode:forwards]">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={securityCode}
                  onChange={(value) => setSecurityCode(value)}
                  className="transition-all duration-300 hover:scale-105"
                  type="password"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <InputOTPSlot key={index} index={index} className="transition-all duration-200 hover:border-primary focus:ring-2 focus:ring-primary/20" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                You can also use a backup code if you have one
              </p>
            </div>

            <div className="space-y-3 animate-slide-in-up [animation-delay:400ms] opacity-0 [animation-fill-mode:forwards]">
              <Button 
                type="submit" 
                variant="banking" 
                className="w-full transition-all duration-300 hover:scale-105 active:scale-95" 
                disabled={isLoading || securityCode.length !== 6}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify Security Code"
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full transition-all duration-300 hover:scale-105 active:scale-95" 
                onClick={onBack}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </div>
          </form>

        </CardContent>
      </Card>
      <AccountLockedDialog 
        open={showLockedDialog} 
        onClose={() => {
          setShowLockedDialog(false);
          onBack();
        }} 
      />
    </div>
  );
};