import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Vault, LogOut } from "lucide-react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface AdminHeaderProps {
  onLogout: () => void;
  isLoggingOut: boolean;
}

export const AdminHeader = ({ onLogout, isLoggingOut }: AdminHeaderProps) => {
  const { settings, isLoading } = useWebsiteSettings();
  
  return (
    <header className="bg-background shadow-banking border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
            {!isLoading && settings && (
              <>
                {(settings.consoleLogoUrl || settings.logoUrl) ? (
                  <img 
                    src={settings.consoleLogoUrl || settings.logoUrl || ''} 
                    alt={`${settings.bankName} logo`}
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <Vault className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                      {settings.bankName}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">Admin Console</span>
                </div>
              </>
            )}
          </div>

          {/* Admin Info & Logout */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
            <Badge variant="secondary" className="bg-destructive/10 text-destructive hidden sm:flex">
              <span className="hidden md:inline">Admin Access</span>
              <span className="md:hidden">Admin</span>
            </Badge>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={onLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};