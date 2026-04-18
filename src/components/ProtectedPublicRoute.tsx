import { Navigate } from 'react-router-dom';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Loader2 } from 'lucide-react';

interface ProtectedPublicRouteProps {
  children: React.ReactNode;
}

export const ProtectedPublicRoute = ({ children }: ProtectedPublicRouteProps) => {
  const { settings, isLoading } = useWebsiteSettings();
  
  // Show loading state while fetching settings
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If website visibility is disabled, redirect to login page
  if (settings?.websiteVisibility === false) {
    return <Navigate to="/auth" replace />;
  }
  
  // Otherwise, render the public page
  return <>{children}</>;
};

