import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X } from 'lucide-react';

interface EmailAvailabilityCheckerProps {
  email: string;
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

export const EmailAvailabilityChecker = ({
  email,
  onAvailabilityChange,
}: EmailAvailabilityCheckerProps) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [reason, setReason] = useState<string>('');
  const debouncedEmail = useDebounce(email, 500);

  useEffect(() => {
    const checkAvailability = async () => {
      // Basic email validation before checking
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!debouncedEmail || !emailRegex.test(debouncedEmail)) {
        setStatus('idle');
        setReason('');
        onAvailabilityChange?.(false);
        return;
      }

      setStatus('checking');
      setReason('');

      try {
        // Use edge function to check all sources including auth.users
        const { data, error } = await supabase.functions.invoke('check-email-availability', {
          body: { email: debouncedEmail }
        });

        if (error) {
          console.error('Error checking email availability:', error);
          setStatus('error');
          setReason('Could not verify email');
          onAvailabilityChange?.(false);
          return;
        }

        if (data.error) {
          console.error('Email check error:', data.error);
          setStatus('error');
          setReason('Could not verify email');
          onAvailabilityChange?.(false);
          return;
        }

        setStatus(data.available ? 'available' : 'taken');
        setReason(data.reason || '');
        onAvailabilityChange?.(data.available);
      } catch (error) {
        console.error('Error checking email:', error);
        setStatus('error');
        setReason('Could not verify email');
        onAvailabilityChange?.(false);
      }
    };

    checkAvailability();
  }, [debouncedEmail, onAvailabilityChange]);

  if (status === 'idle' || !email) return null;

  return (
    <div className="flex items-center gap-2 text-sm mt-1">
      {status === 'checking' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Checking availability...</span>
        </>
      )}
      {status === 'available' && (
        <>
          <Check className="w-4 h-4 text-success" />
          <span className="text-success">Email is available</span>
        </>
      )}
      {status === 'taken' && (
        <>
          <X className="w-4 h-4 text-destructive" />
          <span className="text-destructive">{reason || 'Email is already registered'}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <X className="w-4 h-4 text-warning" />
          <span className="text-warning">{reason || 'Could not verify email'}</span>
        </>
      )}
    </div>
  );
};
