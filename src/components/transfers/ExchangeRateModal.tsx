import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { formatCurrencyAmount, getCurrencySymbol } from "@/lib/utils";

interface ExchangeRateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

// Hardcoded exchange rates (in production, these would come from an API)
export const EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: { EUR: 0.92, GBP: 0.79, USD: 1 },
  EUR: { USD: 1.09, GBP: 0.86, EUR: 1 },
  GBP: { USD: 1.27, EUR: 1.16, GBP: 1 }
};

export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1;
  return EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1;
}

export function convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
  const rate = getExchangeRate(fromCurrency, toCurrency);
  return parseFloat((amount * rate).toFixed(2));
}

export const ExchangeRateModal = ({
  open,
  onOpenChange,
  fromCurrency,
  toCurrency,
  fromAmount,
  toAmount,
  exchangeRate,
  onConfirm,
  onCancel,
  loading = false
}: ExchangeRateModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Currency Conversion
          </DialogTitle>
          <DialogDescription>
            This transfer involves different currencies. Please review the exchange rate below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Exchange Rate Display */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Exchange Rate</p>
            <p className="text-2xl font-bold text-primary">
              1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
            </p>
          </div>

          {/* Amount Conversion */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">You Send</p>
              <p className="text-xl font-bold">
                {getCurrencySymbol(fromCurrency)}{fromAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">{fromCurrency}</p>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            
            <div className="flex-1 p-4 border rounded-lg text-center bg-green-50 border-green-200">
              <p className="text-sm text-green-700 mb-1">Recipient Gets</p>
              <p className="text-xl font-bold text-green-700">
                {getCurrencySymbol(toCurrency)}{toAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-green-600">{toCurrency}</p>
            </div>
          </div>

          {/* Info Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Exchange rates are indicative and may vary slightly at the time of processing.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              "Confirm Transfer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
