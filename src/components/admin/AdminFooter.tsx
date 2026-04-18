import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

export const AdminFooter = () => {
  const { settings } = useWebsiteSettings();
  return <>
      {/* Security Notice */}
      <div className="mt-8 sm:mt-12">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          <AlertDescription className="text-yellow-700 text-sm">
            <strong>Security Reminder:</strong> This administrative console provides access to sensitive{' '}
            {settings?.bankName || 'Wyseforte Bank'} systems. Always log out when finished and report any suspicious activity immediately.
          </AlertDescription>
        </Alert>
      </div>

      {/* Footer Info */}
      <div className="mt-6 sm:mt-8 text-center">
        <p className="text-xs sm:text-sm text-muted-foreground px-2">{settings?.bankName || 'Wyseforte Bank'} Administrative Console v2.1.0</p>
      </div>
    </>;
};