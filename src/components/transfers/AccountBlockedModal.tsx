import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

interface AccountBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const AccountBlockedModal = ({ isOpen, onClose, message }: AccountBlockedModalProps) => {
  // Limit message to 500 characters
  const displayMessage = message.length > 500 ? message.substring(0, 500) + "..." : message;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm border-2 border-destructive bg-background">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Icon */}
          <div className="rounded-full bg-destructive/10 p-3">
            <Ban className="h-8 w-8 text-destructive" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-destructive tracking-wide">
            BLOCKED TRANSFER
          </h2>

          {/* Divider */}
          <div className="w-full border-t-2 border-destructive/30" />

          {/* Message */}
          <div className="px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/20 w-full">
            <p className="text-sm font-medium text-destructive">
              {displayMessage}
            </p>
          </div>

          {/* Divider */}
          <div className="w-full border-t-2 border-destructive/30" />

          {/* OK Button */}
          <Button
            onClick={onClose}
            variant="destructive"
            className="px-6"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
