import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TransferLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountNumber: string;
  onSuccess: () => void;
}

interface TransferLimit {
  transfer_limit: number;
  custom_message?: string;
}

export function TransferLimitDialog({ isOpen, onClose, accountId, accountNumber, onSuccess }: TransferLimitDialogProps) {
  const [transferLimit, setTransferLimit] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const defaultMessage = `Your transfer request exceeds the current limit of $[AMOUNT] for your account. Please contact customer support at accounts@bank.com or submit a support ticket to review your account restrictions or request an increase.`;

  // Fetch existing transfer limit when dialog opens
  useEffect(() => {
    if (isOpen && accountId) {
      fetchExistingLimit();
    }
  }, [isOpen, accountId]);


  const fetchExistingLimit = async () => {
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase.rpc('get_account_transfer_limit', {
        p_account_id: accountId
      });

      if (error) {
        console.error('Error fetching transfer limit:', error);
        return;
      }

      const result = data as any;
      if (result && typeof result === 'object') {
        setTransferLimit(result.daily_limit?.toString() || '');
        setCustomMessage(result.custom_message || defaultMessage);
      } else {
        // No existing limit - set default message
        setTransferLimit('');
        setCustomMessage(defaultMessage);
      }
    } catch (error) {
      console.error('Error fetching transfer limit:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const limitAmount = parseFloat(transferLimit);
    if (isNaN(limitAmount) || limitAmount <= 0) {
      toast.error('Please enter a valid transfer limit amount');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('set_account_transfer_limit', {
        p_account_id: accountId,
        p_daily_limit: limitAmount,
        p_single_transaction_limit: limitAmount,
        p_custom_message: customMessage || null
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast.success('Transfer limit set successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Failed to set transfer limit');
      }
    } catch (error: any) {
      console.error('Error setting transfer limit:', error);
      toast.error(error.message || 'An error occurred while setting the transfer limit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTransferLimit('');
    setCustomMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Transfer Limit</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Account: {accountNumber}
          </p>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading current limit...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transferLimit">Transfer Limit Amount ($)</Label>
              <Input
                id="transferLimit"
                type="number"
                step="0.01"
                min="0.01"
                value={transferLimit}
                onChange={(e) => setTransferLimit(e.target.value)}
                placeholder="Enter maximum transfer amount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Notification Message</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={defaultMessage}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                You can edit this message as needed. The amount will be automatically formatted in the notification.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Setting Limit...' : 'Set Limit'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}