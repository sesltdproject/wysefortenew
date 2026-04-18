import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsernameAvailabilityCheckerProps {
  username: string;
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

export const UsernameAvailabilityChecker = ({
  username,
  onAvailabilityChange,
}: UsernameAvailabilityCheckerProps) => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debouncedUsername = useDebounce(username, 500);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setStatus('idle');
        onAvailabilityChange?.(false);
        return;
      }

      setStatus('checking');

      try {
        // Check if username exists in profiles table (case-insensitive)
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', debouncedUsername)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking username in profiles:', profileError);
          setStatus('idle');
          onAvailabilityChange?.(false);
          return;
        }

        // Also check pending applications
        const { data: existingApplication, error: appError } = await supabase
          .from('account_applications')
          .select('id')
          .ilike('desired_username', debouncedUsername)
          .eq('status', 'pending')
          .maybeSingle();

        if (appError) {
          console.error('Error checking username in applications:', appError);
          setStatus('idle');
          onAvailabilityChange?.(false);
          return;
        }

        const isAvailable = !existingProfile && !existingApplication;
        setStatus(isAvailable ? 'available' : 'taken');
        onAvailabilityChange?.(isAvailable);
      } catch (error) {
        console.error('Error checking username:', error);
        setStatus('idle');
        onAvailabilityChange?.(false);
      }
    };

    checkAvailability();
  }, [debouncedUsername, onAvailabilityChange]);

  if (status === 'idle' || !username) return null;

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
          <span className="text-success">Username is available</span>
        </>
      )}
      {status === 'taken' && (
        <>
          <X className="w-4 h-4 text-destructive" />
          <span className="text-destructive">Username is already taken</span>
        </>
      )}
    </div>
  );
};
