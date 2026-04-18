import { BarChart3, Users, Activity, FileText, Archive, Settings, Lock, Upload, Globe, Mail } from "lucide-react";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AdminNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems: NavigationItem[] = [
  { id: "overview", label: "Dashboard Overview", icon: BarChart3 },
  { id: "users", label: "User Management", icon: Users },
  { id: "transactions", label: "Transactions", icon: Activity },
  { id: "deposits", label: "Deposits", icon: Upload },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "website", label: "Website Settings", icon: Globe },
  { id: "email-templates", label: "Email Templates", icon: Mail },
  { id: "settings", label: "Admin Settings", icon: Settings }
];

export const AdminNavigation = ({ activeSection, onSectionChange }: AdminNavigationProps) => {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="border-b border-border">
        <nav className="flex space-x-2 sm:space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide pb-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                activeSection === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};