import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, DollarSign, User, Building, Globe, Edit } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface Account {
  id: string;
  account_type: string;
  account_number: string;
  balance: number;
  status: string;
}

interface TransferReviewData {
  type: 'internal' | 'external' | 'international';
  fromAccount?: Account;
  toAccount?: Account;
  amount: number;
  description?: string;
  // External transfer fields
  recipientName?: string;
  recipientAccount?: string;
  bankName?: string;
  routingCode?: string;
  // International transfer fields
  swiftCode?: string;
  iban?: string;
  correspondentBank?: string;
  bankAddress?: string;
  recipientAddress?: string;
  purposeOfTransfer?: string;
  priority?: string;
}

interface TransferReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewData: TransferReviewData;
  onEdit: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const TransferReviewModal = ({ 
  open, 
  onOpenChange, 
  reviewData, 
  onEdit, 
  onConfirm, 
  loading = false 
}: TransferReviewModalProps) => {
  const { t } = useTranslation();

  const getTransferTitle = () => {
    switch (reviewData.type) {
      case 'internal': return t('dashboard.transferReviewSameBank');
      case 'external': return t('dashboard.transferReviewExternal');
      case 'international': return t('dashboard.transferReviewInternational');
      default: return t('dashboard.transferReviewTitle');
    }
  };

  const getTransferIcon = () => {
    switch (reviewData.type) {
      case 'internal': return <ArrowRight className="h-5 w-5" />;
      case 'external': return <Building className="h-5 w-5" />;
      case 'international': return <Globe className="h-5 w-5" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  const capitalizeFirstLetter = (text: string) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return t('dashboard.urgent');
      case 'high': return t('dashboard.high');
      case 'normal': return t('dashboard.normalPriority');
      default: return priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTransferIcon()}
            {getTransferTitle()}
          </DialogTitle>
          <DialogDescription>
            {t('dashboard.reviewTransferDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Transfer Amount */}
          <div className="text-center py-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="h-6 w-6 text-primary" />
              <span className="text-3xl font-bold text-primary">
                {formatAmount(reviewData.amount)}
              </span>
            </div>
            <p className="text-muted-foreground">{t('dashboard.transferAmountLabel')}</p>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('dashboard.accountDetailsLabel')}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewData.fromAccount && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('dashboard.fromAccountLabel')}</p>
                  <p className="font-medium">{capitalizeFirstLetter(reviewData.fromAccount.account_type)}</p>
                  <p className="text-sm text-muted-foreground">{reviewData.fromAccount.account_number}</p>
                  <p className="text-sm">{t('dashboard.balanceLabel')} ${formatAmount(reviewData.fromAccount.balance)}</p>
                </div>
              )}

              {reviewData.type === 'internal' && reviewData.toAccount && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('dashboard.toAccountLabel')}</p>
                  <p className="font-medium">{capitalizeFirstLetter(reviewData.toAccount.account_type)}</p>
                  <p className="text-sm text-muted-foreground">{reviewData.toAccount.account_number}</p>
                </div>
              )}

              {/* Same Bank Transfer recipient info (when no toAccount but has recipientName) */}
              {reviewData.type === 'internal' && !reviewData.toAccount && reviewData.recipientName && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('dashboard.recipientLabelReview')}</p>
                  <p className="font-medium">{reviewData.recipientName}</p>
                  {reviewData.recipientAccount && (
                    <p className="text-sm text-muted-foreground">{t('dashboard.accountLabel')} {reviewData.recipientAccount}</p>
                  )}
                </div>
              )}

              {(reviewData.type === 'external' || reviewData.type === 'international') && reviewData.recipientName && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">{t('dashboard.recipientLabelReview')}</p>
                  <p className="font-medium">{reviewData.recipientName}</p>
                  {reviewData.recipientAccount && (
                    <p className="text-sm text-muted-foreground">{t('dashboard.accountNumberLabelReview')} {reviewData.recipientAccount}</p>
                  )}
                  {reviewData.recipientAddress && (
                    <p className="text-sm text-muted-foreground">{t('dashboard.addressLabelReview')} {reviewData.recipientAddress}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bank Information for External/International */}
          {(reviewData.type === 'external' || reviewData.type === 'international') && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {t('dashboard.bankInformationLabel')}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviewData.bankName && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.bankNameLabelReview')}</p>
                      <p className="font-medium">{reviewData.bankName}</p>
                    </div>
                  )}

                  {reviewData.routingCode && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.routingSortCodeLabelReview')}</p>
                      <p className="font-medium">{reviewData.routingCode}</p>
                    </div>
                  )}

                  {reviewData.swiftCode && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.swiftBicCodeLabelReview')}</p>
                      <p className="font-medium">{reviewData.swiftCode}</p>
                    </div>
                  )}

                  {reviewData.iban && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.ibanLabelReview')}</p>
                      <p className="font-medium">{reviewData.iban}</p>
                    </div>
                  )}

                  {reviewData.bankAddress && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">{t('dashboard.recipientBankAddressLabel')}</p>
                      <p className="font-medium">{reviewData.bankAddress}</p>
                    </div>
                  )}

                  {reviewData.correspondentBank && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">{t('dashboard.correspondentBankLabelReview')}</p>
                      <p className="font-medium">{reviewData.correspondentBank}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Description/Transfer Details */}
          {(reviewData.description || reviewData.priority || reviewData.purposeOfTransfer) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold">
                  {t('dashboard.descriptionLabelReview')}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(reviewData.type === 'internal' || reviewData.type === 'external') && reviewData.description && (
                    <div className="md:col-span-2">
                      <p className="font-medium">{reviewData.description}</p>
                    </div>
                  )}

                  {reviewData.priority && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('dashboard.priorityLabelReview')}</p>
                      <Badge className={getPriorityColor(reviewData.priority)}>
                        {getPriorityLabel(reviewData.priority)}
                      </Badge>
                    </div>
                  )}

                  {reviewData.purposeOfTransfer && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">{t('dashboard.purposeOfTransferLabelReview')}</p>
                      <p className="font-medium">{reviewData.purposeOfTransfer}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Processing Information */}
          {reviewData.type === 'international' && (
            <>
              <Separator />
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">{t('dashboard.processingInformationTitle')}</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• {t('dashboard.intlComplianceNote')}</li>
                  <li>• {t('dashboard.intlProcessingTimeNote')}</li>
                  <li>• {t('dashboard.intlExchangeRateNote')}</li>
                  <li>• {t('dashboard.intlCorrespondentFeesNote')}</li>
                </ul>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onEdit}
              disabled={loading}
              className="flex-1"
            >
              <Edit className="h-4 w-4 mr-2" />
              {t('dashboard.editTransferBtn')}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('dashboard.processingBtn')}
                </div>
              ) : (
                t('dashboard.confirmTransferBtn')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
