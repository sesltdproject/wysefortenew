import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ArrowRightLeft } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  status: string;
  reference_number: string;
  created_at: string;
}

interface TransferHistoryProps {
  transfers: Transfer[];
}

export const TransferHistory = ({ transfers }: TransferHistoryProps) => {
  const { t } = useTranslation();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t('dashboard.transferHistory')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.viewRecentTransferActivities')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('dashboard.noTransfersFoundHistory')}
          </div>
        ) : (
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-card gap-3"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{transfer.description}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
                      <span>{transfer.reference_number}</span>
                      <span>•</span>
                      <span>{new Date(transfer.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 pl-11 sm:pl-0 flex-shrink-0">
                  <div className="font-semibold">${formatAmount(transfer.amount)}</div>
                  <Badge className={getStatusColor(transfer.status)}>
                    {transfer.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};