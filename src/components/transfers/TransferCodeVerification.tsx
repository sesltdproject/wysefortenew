import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle, X } from "lucide-react";
import { useTranslation } from "@/i18n";

interface TransferCodeVerificationProps {
  open: boolean;
  codeName: string;
  onSuccess: () => void;
  onCancel: () => void;
  onVerify: (code: string) => Promise<boolean>;
}

export const TransferCodeVerification = ({
  open,
  codeName,
  onSuccess,
  onCancel,
  onVerify
}: TransferCodeVerificationProps) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const maxAttempts = 3;

  useEffect(() => {
    if (open) {
      setCode("");
      setAttempts(0);
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError(t('dashboard.pleaseEnterVerificationCode'));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isValid = await onVerify(code.trim());
      
      if (isValid) {
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= maxAttempts) {
          setError(t('dashboard.wrongCode3Times'));
          setTimeout(() => {
            onCancel();
          }, 3000);
        } else {
          setError(t('dashboard.incorrectCodeAttempts').replace('{n}', String(maxAttempts - newAttempts)));
        }
        setCode("");
      }
    } catch (error) {
      setError(t('dashboard.verificationError'));
    } finally {
      setLoading(false);
    }
  };

  const remainingAttempts = maxAttempts - attempts;
  const isFinalAttempt = attempts >= maxAttempts;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-primary">
            <Shield className="h-6 w-6" />
            {t('dashboard.complianceVerificationTitle')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('dashboard.enterCodeToProceed').replace('{codeName}', codeName)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prominent verification prompt */}
          <div className="text-center p-6 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
            <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-primary mb-2">
              {t('dashboard.securityVerificationRequiredTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('dashboard.completeIntlTransferCode').replace('{codeName}', codeName)}
            </p>
          </div>

          {error && (
            <Alert variant={isFinalAttempt ? "destructive" : "default"} className="border-l-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {!isFinalAttempt && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode" className="text-base font-medium">
                  {t('dashboard.codeNameLabel').replace('{codeName}', codeName)}
                </Label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                  placeholder={t('dashboard.enter10CharCode')}
                  className="text-center text-lg font-mono tracking-wider"
                  maxLength={10}
                  disabled={loading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  {t('dashboard.attemptsRemainingText').replace('{n}', String(remainingAttempts))}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('dashboard.cancelTransferBtn')}
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !code.trim() || code.length !== 10}
                  className="flex-1"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {loading ? t('dashboard.verifyingBtn') : t('dashboard.verifyCodeBtn')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
