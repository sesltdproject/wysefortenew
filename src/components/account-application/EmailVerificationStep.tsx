import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useTranslation } from '@/i18n';

interface EmailVerificationStepProps {
  email: string;
  onVerified: () => void;
  onSkip: () => void;
}

export const EmailVerificationStep = ({ email, onVerified, onSkip }: EmailVerificationStepProps) => {
  const { settings, isLoading: settingsLoading } = useWebsiteSettings();
  const { t } = useTranslation();
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Auto-skip if auth emails are disabled
  useEffect(() => {
    if (!settingsLoading && settings && !settings.authEmailsEnabled) {
      console.log('Auth emails disabled - skipping verification step');
      onSkip();
    }
  }, [settingsLoading, settings, onSkip]);

  // Show loading while checking settings
  if (settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('accountApplication.checkingRequirements')}</p>
      </div>
    );
  }

  const handleSendCode = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-application-verification', {
        body: { email }
      });

      // When edge function returns non-2xx, extract error message properly
      if (error) {
        let errorMessage = 'Failed to send verification code. Please try again.';
        
        // Try to get error from data first
        if (data?.error) {
          errorMessage = data.error;
        } else if (error.context && typeof error.context.json === 'function') {
          // Parse error from response body
          try {
            const body = await error.context.json();
            if (body?.error) {
              errorMessage = body.error;
            }
          } catch {
            // Body might be consumed, use default
          }
        }
        
        throw new Error(errorMessage);
      }

      // Only skip if explicitly told to skip (verification disabled)
      if (data.skipped === true) {
        toast({
          title: 'Email Verification Skipped',
          description: data.message || 'Email verification is not required.',
        });
        onSkip();
        return;
      }

      // If email wasn't sent and we weren't told to skip, something went wrong
      if (data.emailSent === false) {
        throw new Error(data.error || 'Failed to send verification email. Please contact support.');
      }

      setCodeSent(true);
      toast({
        title: 'Verification Code Sent',
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification code',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-application-code', {
        body: { email, code: verificationCode }
      });

      if (error) throw error;

      if (data.verified) {
        setIsVerified(true);
        toast({
          title: 'Email Verified',
          description: 'Your email has been verified successfully!',
        });
        setTimeout(() => onVerified(), 1000);
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired verification code',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h3 className="text-xl font-semibold">{t('accountApplication.emailVerified')}</h3>
        <p className="text-muted-foreground">{t('accountApplication.proceedingToNext')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t('accountApplication.verifyYourEmail')}</h2>
        <p className="text-muted-foreground">
          {t('accountApplication.verifyEmailDescription')}
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <Label className="text-sm text-muted-foreground">{t('accountApplication.emailAddress')}</Label>
        <p className="font-medium">{email}</p>
      </div>

      {!codeSent ? (
        <Button
          onClick={handleSendCode}
          disabled={isSending}
          className="w-full"
          size="lg"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('accountApplication.sendingCode')}
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              {t('accountApplication.sendVerificationCode')}
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('accountApplication.enterVerificationCode')}</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t('accountApplication.enterCodeHint')}
            </p>
          </div>

          <Button
            onClick={handleVerifyCode}
            disabled={isVerifying || verificationCode.length !== 6}
            className="w-full"
            size="lg"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('accountApplication.verifyingEmail')}
              </>
            ) : (
              t('accountApplication.verifyEmail')
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleSendCode}
            disabled={isSending}
            className="w-full"
          >
            {t('accountApplication.resendCode')}
          </Button>
        </div>
      )}
    </div>
  );
};
