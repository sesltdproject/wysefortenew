import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseInactivityTimerProps {
  timeout: number; // in milliseconds
  onTimeout: () => void;
  enabled?: boolean;
}

export const useInactivityTimer = ({ timeout, onTimeout, enabled = true }: UseInactivityTimerProps) => {
  const { toast } = useToast();
  const timeoutId = useRef<NodeJS.Timeout>();
  const lastActivity = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    lastActivity.current = Date.now();
    
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    
    timeoutId.current = setTimeout(() => {
      toast({
        title: "Session Expired",
        description: "You have been logged out due to inactivity. Redirecting to login...",
        variant: "destructive",
      });
      
      // Redirect after 10 seconds
      setTimeout(() => {
        onTimeout();
      }, 10000);
    }, timeout);
  }, [timeout, onTimeout, enabled, toast]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) return;

    // Track various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the timer
    resetTimer();

    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [handleActivity, resetTimer, enabled]);

  return { resetTimer };
};