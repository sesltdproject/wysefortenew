import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface UseSecureNavigationProps {
  isAuthenticated: boolean;
  userRole?: string;
  onLogout: () => void;
  enabled?: boolean;
}

export const useSecureNavigation = ({ 
  isAuthenticated, 
  userRole, 
  onLogout, 
  enabled = true 
}: UseSecureNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const previousLocation = useRef<string>(location.pathname);
  const hasShownWarning = useRef<boolean>(false);

  // Define route categories
  const getRouteCategory = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return 'secure-user';
    if (pathname.startsWith('/admin-dashboard')) return 'secure-admin';
    if (['/auth', '/admin-auth', '/admin-signup'].includes(pathname)) return 'auth';
    if (['/', '/about', '/services', '/contact'].includes(pathname)) return 'public';
    return 'unknown';
  };

  const shouldTriggerLogout = (fromRoute: string, toRoute: string, role?: string) => {
    const fromCategory = getRouteCategory(fromRoute);
    const toCategory = getRouteCategory(toRoute);

    // Allow legitimate admin login transition from auth to dashboard
    if (fromCategory === 'auth' && toCategory === 'secure-admin' && role === 'admin') return false;

    // Don't logout if not coming from a secure route
    if (!fromCategory.startsWith('secure')) return false;

    // Don't logout if going to auth pages
    if (toCategory === 'auth') return false;

    // Logout when going from secure to public
    if (toCategory === 'public') return true;

    // Logout when user tries to access admin area or vice versa
    if (role === 'user' && toCategory === 'secure-admin') return true;
    if (role === 'admin' && toCategory === 'secure-user') return true;

    return false;
  };

  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const currentPath = location.pathname;
    const previousPath = previousLocation.current;

    // Add debug logging to track navigation
    console.log(`[SecureNav] Navigation: ${previousPath} -> ${currentPath}, Role: ${userRole}`);

    // Check if we should trigger logout
    if (shouldTriggerLogout(previousPath, currentPath, userRole)) {
      if (!hasShownWarning.current) {
        hasShownWarning.current = true;
        
        console.log(`[SecureNav] Triggering logout due to navigation violation`);
        
        toast({
          title: "Session Terminated",
          description: "You have been logged out for security reasons.",
          variant: "destructive",
        });

        // Small delay to ensure the toast is visible
        setTimeout(() => {
          onLogout();
          hasShownWarning.current = false;
        }, 1000);
      }
    }

    // Update previous location
    previousLocation.current = currentPath;
  }, [location.pathname, isAuthenticated, userRole, onLogout, enabled, toast]);

  // Handle browser navigation events (back/forward buttons)
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const previousPath = previousLocation.current;

      if (shouldTriggerLogout(previousPath, currentPath, userRole)) {
        toast({
          title: "Session Terminated",
          description: "You have been logged out for security reasons.",
          variant: "destructive",
        });

        setTimeout(() => {
          onLogout();
        }, 1000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, userRole, onLogout, enabled, toast]);

  // Handle window focus events for additional security
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.hidden) return;

      // Check if URL was manually changed while window was not focused
      const currentPath = window.location.pathname;
      const expectedCategory = getRouteCategory(previousLocation.current);
      const actualCategory = getRouteCategory(currentPath);

      // If user manually navigated to a different category while window was hidden
      if (expectedCategory.startsWith('secure') && actualCategory === 'public') {
        toast({
          title: "Session Terminated",
          description: "You have been logged out for security reasons.",
          variant: "destructive",
        });

        setTimeout(() => {
          onLogout();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, userRole, onLogout, enabled, toast]);
};