import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  status: string;
  created_at: string;
  reference_number: string;
  account_id: string;
  user_name: string;
  account_number: string;
  user_email: string;
}

interface EditTransactionModalProps {
  transaction: AdminTransaction;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdated: () => void;
}

export const EditTransactionModal = ({
  transaction,
  isOpen,
  onClose,
  onTransactionUpdated
}: EditTransactionModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    amount: transaction.amount.toString(),
    description: transaction.description,
    date: new Date(transaction.created_at).toISOString().slice(0, 16) // Format for datetime-local input
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      newErrors.amount = "Amount must be a positive number";
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }
    
    if (!formData.date) {
      newErrors.date = "Date is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateTransaction = async () => {
    if (!validateForm()) return;

    try {
      setIsUpdating(true);
      
      const { data, error } = await supabase.rpc('admin_update_transaction', {
        transaction_id: transaction.id,
        new_amount: parseFloat(formData.amount),
        new_description: formData.description.trim(),
        new_date: formData.date ? new Date(formData.date).toISOString() : null
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Success",
          description: "Transaction updated successfully",
        });
        onTransactionUpdated();
        onClose();
      } else {
        throw new Error(result?.error || 'Failed to update transaction');
      }
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Modify transaction details. Changes will update the account balance accordingly.
          </DialogDescription>
        </DialogHeader>

        <Alert className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Modifying this transaction will automatically adjust the account balance.
            Current transaction: {transaction.transaction_type} of ${transaction.amount.toFixed(2)}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">User</Label>
              <p className="font-medium text-sm">{transaction.user_name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Account</Label>
              <p className="font-mono text-sm">{transaction.account_number}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <p className="text-sm capitalize">{transaction.transaction_type}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reference</Label>
              <p className="font-mono text-sm">{transaction.reference_number}</p>
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Date Field */}
          <div>
            <Label htmlFor="date">Transaction Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date ? formData.date.slice(0, 10) : ""}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  handleInputChange('date', `${dateValue}T00:00:00`);
                }
              }}
              className={errors.date ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: YYYY-MM-DD
            </p>
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdateTransaction} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Transaction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};