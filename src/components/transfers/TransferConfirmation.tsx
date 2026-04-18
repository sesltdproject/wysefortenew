import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Download, 
  Home, 
  ArrowLeft, 
  Mail, 
  Clock,
  Globe,
  Building,
  ArrowRight,
  Copy,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/utils";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";
import { generateTransferReceipt, ReceiptTranslations } from "@/lib/transferReceiptGenerator";
import { useState } from "react";
import { useTranslation } from "@/i18n";

interface TransferConfirmationProps {
  transferType: 'internal' | 'external' | 'international';
  transferData: {
    referenceNumber: string;
    amount: number;
    fromAccount: string;
    toAccount?: string;
    recipientName?: string;
    bankName?: string;
    bankAddress?: string;
    correspondentBank?: string;
    routingCode?: string;
    timestamp: string;
    status: string;
    priority?: string;
    recipientAccount?: string;
    swiftCode?: string;
    iban?: string;
    recipientCountry?: string;
    recipientAddress?: string;
    description?: string;
    currency?: string;
    // Sender details for international transfer receipts
    senderName?: string;
    senderAccountNumber?: string;
    senderAccountType?: string;
  };
  onReturnToTransfers: () => void;
  onReturnToDashboard: () => void;
}

export const TransferConfirmation = ({
  transferType,
  transferData,
  onReturnToTransfers,
  onReturnToDashboard
}: TransferConfirmationProps) => {
  const { toast } = useToast();
  const { settings } = useWebsiteSettings();
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);

  const copyReferenceNumber = () => {
    navigator.clipboard.writeText(transferData.referenceNumber);
    toast({
      title: t('dashboard.copied'),
      description: t('dashboard.referenceCopied'),
    });
  };

  // Build translations object for PDF receipt
  const getReceiptTranslations = (): ReceiptTranslations => ({
    wireReceiptTitle: t('dashboard.wireReceiptTitle'),
    dateLabel: t('dashboard.dateLabel'),
    destinationCountryLabel: t('dashboard.destinationCountryLabel'),
    countryLabel: t('dashboard.countryLabel'),
    beneficiaryBankDetails: t('dashboard.beneficiaryBankDetails'),
    swiftBicCodeLabel: t('dashboard.swiftBicCodeLabel'),
    bankBranchLabel: t('dashboard.bankBranchLabel'),
    accountNumberLabel: t('dashboard.accountNumberLabel2'),
    ibanLabel: t('dashboard.ibanLabel'),
    accountNameLabel: t('dashboard.accountNameLabel'),
    addressLabel: t('dashboard.addressLabel'),
    transferDetailsLabel: t('dashboard.transferDetailsLabel'),
    fromAccountLabel: t('dashboard.fromAccountLabel'),
    transferCurrencyLabel: t('dashboard.transferCurrencyLabel'),
    transferAmountLabel: t('dashboard.transferAmountLabel'),
    priorityLabel: t('dashboard.priorityLabelReceipt'),
    statusLabel: t('dashboard.statusLabelReceipt'),
    processingTimeLabel: t('dashboard.processingTimeLabelReceipt'),
    otherDetailsLabel: t('dashboard.otherDetailsLabel'),
    purposeOfTransferLabel: t('dashboard.purposeOfTransferLabel'),
    correspondentBankLabel: t('dashboard.correspondentBankLabelReceipt'),
    referenceNumberLabel: t('dashboard.referenceNumberLabelReceipt'),
    forEnquiries: t('dashboard.forEnquiries'),
    importantInformationTitle: t('dashboard.importantInformationTitle'),
    importantText1: t('dashboard.importantText1'),
    importantText2: t('dashboard.importantText2'),
    importantText3: t('dashboard.importantText3'),
    transferConfirmationReceipt: t('dashboard.transferConfirmationReceipt'),
    transferCompletedSuccessfully: t('dashboard.transferCompletedSuccessfully'),
    transferSubmittedSuccessfully: t('dashboard.transferSubmittedSuccessfully'),
    referenceColonLabel: t('dashboard.referenceColonLabel'),
    transferTypeLabel: t('dashboard.transferTypeLabel'),
    internalTransferType: t('dashboard.internalTransferType'),
    externalBankTransferType: t('dashboard.externalBankTransferType'),
    internationalWireTransferType: t('dashboard.internationalWireTransferType'),
    completedStatus: t('dashboard.completedStatus'),
    pendingApprovalStatus: t('dashboard.pendingApprovalStatus'),
    processingStatus: t('dashboard.processingStatus'),
    approvedStatus: t('dashboard.approvedStatus'),
    submittedStatus: t('dashboard.submittedStatus'),
    accountInformationLabel: t('dashboard.accountInformationLabel'),
    toAccountLabel: t('dashboard.toAccountLabel'),
    recipientNameLabel: t('dashboard.recipientNameLabel'),
    recipientAccountLabel: t('dashboard.recipientAccountLabelReceipt'),
    bankNameLabel: t('dashboard.bankNameLabel'),
    routingSortCodeLabel: t('dashboard.routingSortCodeLabel'),
    descriptionLabel: t('dashboard.descriptionLabel'),
    importantNotice: t('dashboard.importantNotice'),
    externalTransferPendingNote: t('dashboard.externalTransferPendingNote'),
    phoneLabel: t('dashboard.phoneLabel'),
    emailLabel: t('dashboard.emailLabel'),
    computerGeneratedReceipt: t('dashboard.computerGeneratedReceipt'),
    instantProcessing: t('dashboard.instantProcessing'),
    oneToThreeDays: t('dashboard.oneToThreeDays'),
    sameDay: t('dashboard.sameDay'),
    oneToTwoDays: t('dashboard.oneToTwoDays'),
    twoToFiveDays: t('dashboard.twoToFiveDays'),
  });

  const handleDownloadReceipt = async () => {
    if (!settings) {
      toast({
        title: t('common.error'),
        description: t('dashboard.unableToLoadSettings'),
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      await generateTransferReceipt(
        {
          referenceNumber: transferData.referenceNumber,
          amount: transferData.amount,
          fromAccount: transferData.fromAccount,
          toAccount: transferData.toAccount,
          recipientName: transferData.recipientName,
          recipientAccount: transferData.recipientAccount,
          bankName: transferData.bankName,
          bankAddress: transferData.bankAddress,
          correspondentBank: transferData.correspondentBank,
          routingCode: transferData.routingCode,
          swiftCode: transferData.swiftCode,
          iban: transferData.iban,
          recipientCountry: transferData.recipientCountry,
          recipientAddress: transferData.recipientAddress,
          timestamp: transferData.timestamp,
          status: transferData.status,
          priority: transferData.priority,
          description: transferData.description,
          transactionType: transferType,
          currency: transferData.currency,
          // Pass sender details for international transfer receipts
          senderName: transferData.senderName,
          senderAccountNumber: transferData.senderAccountNumber,
          senderAccountType: transferData.senderAccountType,
        },
        {
          bankName: settings.bankName,
          bankAddress: settings.bankAddress,
          bankPhone: settings.bankPhone,
          contactEmail: settings.contactEmail,
          logoUrl: settings.consoleLogoUrl || settings.logoUrl,
          receiptHeaderColor: settings.receiptHeaderColor,
          receiptAccentColor: settings.receiptAccentColor,
          receiptTitle: settings.receiptTitle,
          receiptShowLogo: settings.receiptShowLogo,
          receiptShowWatermark: settings.receiptShowWatermark,
          receiptWatermarkText: settings.receiptWatermarkText,
          receiptFooterDisclaimer: settings.receiptFooterDisclaimer,
          receiptCustomMessage: settings.receiptCustomMessage,
          receiptReferencePrefix: settings.receiptReferencePrefix,
        },
        getReceiptTranslations()
      );
      toast({
        title: t('dashboard.receiptDownloaded'),
        description: t('dashboard.receiptDownloadSuccess'),
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: t('dashboard.downloadFailed'),
        description: t('dashboard.receiptGenerateFailed'),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const getTransferIcon = () => {
    switch (transferType) {
      case 'internal': return <ArrowRight className="h-8 w-8 text-green-600" />;
      case 'external': return <Building className="h-8 w-8 text-green-600" />;
      case 'international': return <Globe className="h-8 w-8 text-green-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfirmationMessage = () => {
    switch (transferType) {
      case 'internal':
        return t('dashboard.internalTransferComplete');
      case 'external':
        return t('dashboard.externalTransferProcessing');
      case 'international':
        return t('dashboard.internationalTransferSubmitted');
      default:
        return t('dashboard.internalTransferComplete');
    }
  };

  const getProcessingTime = () => {
    switch (transferType) {
      case 'internal': return t('dashboard.instantProcessing');
      case 'external': return t('dashboard.oneToThreeDays');
      case 'international': 
        return transferData.priority === 'urgent' ? t('dashboard.sameDay') :
               transferData.priority === 'high' ? t('dashboard.oneToTwoDays') :
               t('dashboard.twoToFiveDays');
      default: return t('dashboard.processingStatus');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-green-800 mb-2">
                {transferType === 'internal' ? t('dashboard.transferCompleted') : t('dashboard.transferSubmitted')}
              </h1>
              <p className="text-green-700">
                {getConfirmationMessage()}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-green-600">
              <Mail className="h-4 w-4" />
              <span className="text-sm">
                {transferType === 'international' 
                  ? t('dashboard.confirmationWillBeEmailed')
                  : t('dashboard.confirmationSentToEmail')
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTransferIcon()}
            {t('dashboard.transferDetailsTitle')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.transferConfirmationInfo')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reference Number */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.referenceNumberLabel')}</p>
              <p className="font-mono font-bold text-lg">{transferData.referenceNumber}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferenceNumber}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Amount and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('dashboard.amount')}</p>
              <p className="text-2xl font-bold text-primary">
                ${formatAmount(transferData.amount)}
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('dashboard.status')}</p>
              <Badge className={getStatusColor(transferData.status)}>
                {transferData.status}
              </Badge>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('dashboard.processingTimeLabel')}</p>
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{getProcessingTime()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Account Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.fromAccount')}</p>
                <p className="font-medium">{transferData.fromAccount}</p>
              </div>

              {transferType === 'internal' ? (
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.toAccount')}</p>
                  <p className="font-medium">{transferData.toAccount}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.recipientLabel')}</p>
                  <p className="font-medium">{transferData.recipientName}</p>
                  {transferData.bankName && (
                    <p className="text-sm text-muted-foreground">{transferData.bankName}</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.dateTimeLabel')}</p>
                <p className="font-medium">{transferData.timestamp}</p>
              </div>

              {transferData.priority && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.priority')}</p>
                  <Badge variant="outline">
                    {transferData.priority.charAt(0).toUpperCase() + transferData.priority.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Important Notice for International Transfers */}
          {transferType === 'international' && (
            <>
              <Separator />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">{t('dashboard.importantInformation')}</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {t('dashboard.swiftNetworkNote')}</li>
                  <li>• {t('dashboard.receiptEmailNote')}</li>
                  <li>• {t('dashboard.correspondentBankNote')}</li>
                  <li>• {t('dashboard.exchangeRatesNoteConf')}</li>
                  <li>• {t('dashboard.trackTransferNote')}</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onReturnToTransfers}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('dashboard.submitAnotherTransfer')}
        </Button>
        
        <Button
          onClick={onReturnToDashboard}
          className="flex-1"
        >
          <Home className="h-4 w-4 mr-2" />
          {t('dashboard.returnToDashboard')}
        </Button>
      </div>

      {/* Download Receipt Option - Only for external and international transfers */}
      {(transferType === 'external' || transferType === 'international') && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Download className="h-8 w-8 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium">{t('dashboard.downloadTransferReceipt')}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('dashboard.getPdfCopyDesc')}
                </p>
                <Button 
                  onClick={handleDownloadReceipt} 
                  disabled={isDownloading}
                  variant="outline"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('dashboard.generatingReceipt')}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {t('dashboard.downloadPdfReceipt')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
