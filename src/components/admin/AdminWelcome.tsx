import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Settings, LogOut } from "lucide-react";
import { AdminNotificationDropdown } from "./AdminNotificationDropdown";

interface AdminData {
  email: string;
  name: string;
  role: string;
  avatar_url?: string;
}

interface AdminWelcomeProps {
  admin: AdminData;
  onLogout: () => void;
  isLoggingOut: boolean;
  onSettingsClick: () => void;
}

export const AdminWelcome = ({ admin, onLogout, isLoggingOut, onSettingsClick }: AdminWelcomeProps) => {
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          <Avatar className="h-12 w-12 sm:h-16 sm:w-16 bg-primary flex-shrink-0">
            {admin.avatar_url && (
              <AvatarImage 
                src={admin.avatar_url} 
                alt={admin.name}
                className="object-cover"
              />
            )}
            <AvatarFallback className="text-white text-sm sm:text-lg font-semibold">
              {getInitials(admin.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary flex items-center space-x-1 sm:space-x-2">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <span className="truncate">{admin.name}</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground truncate">{admin.email}</p>
            <Badge variant="secondary" className="mt-1">
              <Shield className="w-3 h-3 mr-1" />
              {admin.role}
            </Badge>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0">
          <AdminNotificationDropdown />
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none"
            onClick={onSettingsClick}
          >
            <Settings className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
};