import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface TransferLimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  limit: number;
}

export function TransferLimitExceededModal({ isOpen, onClose, message, limit }: TransferLimitExceededModalProps) {
  const formattedMessage = message.replace(
    '$[AMOUNT]',
    `$${limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-semibold text-destructive text-center">
            Transfer Limit Exceeded
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Current Transfer Limit
              </p>
              <p className="text-2xl font-bold text-foreground">
                ${limit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="text-sm font-semibold text-foreground leading-relaxed">
              {formattedMessage}
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={onClose}
              className="w-full max-w-xs"
              size="lg"
            >
              I Understand
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}