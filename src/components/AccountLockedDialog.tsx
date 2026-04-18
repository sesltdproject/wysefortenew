import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface AccountLockedDialogProps {
  open: boolean;
  onClose?: () => void;
}

export const AccountLockedDialog = ({ open, onClose }: AccountLockedDialogProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { settings } = useWebsiteSettings();

  const handleClose = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      navigate("/auth");
      onClose?.();
    }
  };
  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-red-600 text-center">Account Locked</DialogTitle>
          <DialogDescription className="text-center space-y-4">
            <p className="text-base">Your account has been temporarily locked for security reasons.</p>
            <p className="text-sm text-muted-foreground">
              Please contact {settings?.bankName || "Wyseforte Bank"} customer service for immediate assistance and to
              unlock your account.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <Phone className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="font-semibold text-blue-800">Contact Customer Service</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{settings?.bankPhone || "800-WYS-FORT"}</p>
            <p className="text-sm text-blue-600">Available 24/7</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-600">{settings?.contactEmail || "support@wyseforte.co.uk"}</p>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Available 24/7 for your convenience</p>
            <p>Have your account information ready when you call</p>
          </div>

          <Button variant="outline" className="w-full" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
