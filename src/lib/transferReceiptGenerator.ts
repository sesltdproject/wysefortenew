import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TransferReceiptData {
  referenceNumber: string;
  amount: number;
  fromAccount: string;
  toAccount?: string;
  recipientName?: string;
  recipientAccount?: string;
  bankName?: string;
  bankAddress?: string;
  correspondentBank?: string;
  routingCode?: string;
  swiftCode?: string;
  iban?: string;
  recipientCountry?: string;
  recipientAddress?: string;
  timestamp: string;
  status: string;
  priority?: string;
  description?: string;
  transactionType: 'internal' | 'external' | 'international';
  currency?: string;
  // Sender details for international transfers
  senderName?: string;
  senderAccountNumber?: string;
  senderAccountType?: string;
}

interface BankSettings {
  bankName: string;
  bankAddress: string;
  bankPhone: string;
  contactEmail: string;
  logoUrl: string | null;
  receiptHeaderColor?: string;
  receiptAccentColor?: string;
  receiptTitle?: string;
  receiptShowLogo?: boolean;
  receiptShowWatermark?: boolean;
  receiptWatermarkText?: string;
  receiptFooterDisclaimer?: string;
  receiptCustomMessage?: string | null;
  receiptReferencePrefix?: string;
}

export interface ReceiptTranslations {
  wireReceiptTitle: string;
  dateLabel: string;
  destinationCountryLabel: string;
  countryLabel: string;
  beneficiaryBankDetails: string;
  swiftBicCodeLabel: string;
  bankBranchLabel: string;
  accountNumberLabel: string;
  ibanLabel: string;
  accountNameLabel: string;
  addressLabel: string;
  transferDetailsLabel: string;
  fromAccountLabel: string;
  transferCurrencyLabel: string;
  transferAmountLabel: string;
  priorityLabel: string;
  statusLabel: string;
  processingTimeLabel: string;
  otherDetailsLabel: string;
  purposeOfTransferLabel: string;
  correspondentBankLabel: string;
  referenceNumberLabel: string;
  forEnquiries: string;
  importantInformationTitle: string;
  importantText1: string;
  importantText2: string;
  importantText3: string;
  transferConfirmationReceipt: string;
  transferCompletedSuccessfully: string;
  transferSubmittedSuccessfully: string;
  referenceColonLabel: string;
  transferTypeLabel: string;
  internalTransferType: string;
  externalBankTransferType: string;
  internationalWireTransferType: string;
  completedStatus: string;
  pendingApprovalStatus: string;
  processingStatus: string;
  approvedStatus: string;
  submittedStatus: string;
  accountInformationLabel: string;
  toAccountLabel: string;
  recipientNameLabel: string;
  recipientAccountLabel: string;
  bankNameLabel: string;
  routingSortCodeLabel: string;
  descriptionLabel: string;
  importantNotice: string;
  externalTransferPendingNote: string;
  phoneLabel: string;
  emailLabel: string;
  computerGeneratedReceipt: string;
  instantProcessing: string;
  oneToThreeDays: string;
  sameDay: string;
  oneToTwoDays: string;
  twoToFiveDays: string;
}

const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo:', error);
    return null;
  }
};

const getTransferTypeLabel = (type: string, t?: ReceiptTranslations): string => {
  switch (type) {
    case 'internal': return t?.internalTransferType || 'Internal Transfer';
    case 'external': return t?.externalBankTransferType || 'External Bank Transfer';
    case 'international': return t?.internationalWireTransferType || 'International Wire Transfer';
    default: return 'Transfer';
  }
};

const getStatusLabel = (status: string, t?: ReceiptTranslations): string => {
  switch (status.toLowerCase()) {
    case 'completed': return t?.completedStatus || 'Completed';
    case 'pending': return t?.pendingApprovalStatus || 'Pending Approval';
    case 'processing': return t?.processingStatus || 'Processing';
    case 'approved': return t?.approvedStatus || 'Approved';
    case 'submitted': return t?.submittedStatus || 'Submitted';
    default: return status;
  }
};

const getProcessingTime = (type: string, priority?: string, t?: ReceiptTranslations): string => {
  switch (type) {
    case 'internal': return t?.instantProcessing || 'Instant';
    case 'external': return t?.oneToThreeDays || '1-3 business days';
    case 'international': 
      return priority === 'urgent' ? (t?.sameDay || 'Same day') :
             priority === 'high' ? (t?.oneToTwoDays || '1-2 business days') :
             (t?.twoToFiveDays || '2-5 business days');
    default: return t?.processingStatus || 'Processing';
  }
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 51, 102];
};

// Calculate logo dimensions preserving aspect ratio
const calculateLogoDimensions = (
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number = 30,
  maxHeight: number = 20
): { width: number; height: number } => {
  if (!naturalWidth || !naturalHeight) {
    return { width: maxWidth, height: maxHeight };
  }
  
  const aspectRatio = naturalWidth / naturalHeight;
  let width = maxWidth;
  let height = width / aspectRatio;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return { width, height };
};

export const generateTransferReceipt = async (
  data: TransferReceiptData,
  bankSettings: BankSettings,
  translations?: ReceiptTranslations
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = 12;

  // Get customization settings with defaults
  const headerColor = bankSettings.receiptHeaderColor || '#0066b3';
  const showLogo = bankSettings.receiptShowLogo !== false;
  const showWatermark = bankSettings.receiptShowWatermark || false;
  const watermarkText = bankSettings.receiptWatermarkText || 'COPY';
  const footerDisclaimer = bankSettings.receiptFooterDisclaimer || 
    'This is a computer-generated receipt and is valid without signature.';
  const referencePrefix = bankSettings.receiptReferencePrefix || 'TXN';

  // Parse header color
  const [headerR, headerG, headerB] = hexToRgb(headerColor);

  // Add watermark if enabled
  if (showWatermark && watermarkText) {
    doc.setTextColor(245, 245, 245);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: -45,
    });
  }

  // Load logo
  let logoBase64: string | null = null;
  let logoDimensions = { width: 35, height: 12 };
  
  if (showLogo && bankSettings.logoUrl) {
    logoBase64 = await loadImageAsBase64(bankSettings.logoUrl);
    if (logoBase64) {
      const img = new Image();
      img.src = logoBase64;
      await new Promise<void>((resolve) => {
        img.onload = () => {
          logoDimensions = calculateLogoDimensions(img.naturalWidth, img.naturalHeight, 40, 14);
          resolve();
        };
        img.onerror = () => resolve();
        setTimeout(resolve, 500);
      });
    }
  }

  // Reference number with prefix
  const displayReference = referencePrefix && !data.referenceNumber.startsWith(referencePrefix) 
    ? `${referencePrefix}-${data.referenceNumber}` 
    : data.referenceNumber;

  // For international transfers, use compact single-page layout
  if (data.transactionType === 'international') {
    // ===== HEADER: Right-aligned Bank Name with Address =====
    const rightMargin = pageWidth - margin;
    
    // Logo on the left
    if (logoBase64 && showLogo) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, yPosition, logoDimensions.width, logoDimensions.height);
      } catch {
        // Skip logo if it fails
      }
    }
    
    // Bank name and address right-aligned
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(headerR, headerG, headerB);
    doc.text(bankSettings.bankName, rightMargin, yPosition + 6, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    // Split address into lines if it's long
    const addressLines = doc.splitTextToSize(bankSettings.bankAddress, 80);
    let addressY = yPosition + 12;
    addressLines.forEach((line: string) => {
      doc.text(line, rightMargin, addressY, { align: 'right' });
      addressY += 4;
    });
    
    yPosition += Math.max(20, addressLines.length * 4 + 14);

    // Thin separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // ===== TITLE: Wire Receipt - International Money Transfer =====
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(translations?.wireReceiptTitle || 'Wire Receipt - International Money Transfer', margin, yPosition);
    yPosition += 8;

    // Date line
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text((translations?.dateLabel || 'Date') + ':', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.timestamp, margin + 22, yPosition);
    yPosition += 8;

    // Helper function to render section header (blue text)
    const renderSectionHeader = (title: string) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(headerR, headerG, headerB);
      doc.text(title, margin, yPosition);
      yPosition += 7;
    };

    // Helper function to render a field row (right-aligned label, left-aligned value)
    const labelWidth = 45;
    const valueStartX = margin + labelWidth + 3;
    
    const renderField = (label: string, value: string, boldValue: boolean = false) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      // Right-align label
      doc.text(label + ':', margin + labelWidth, yPosition, { align: 'right' });
      // Left-align value
      doc.setTextColor(30, 30, 30);
      if (boldValue) {
        doc.setFont('helvetica', 'bold');
      }
      // Handle long values by wrapping
      const maxValueWidth = pageWidth - valueStartX - margin;
      const lines = doc.splitTextToSize(value, maxValueWidth);
      doc.text(lines, valueStartX, yPosition);
      yPosition += lines.length * 5 + 2;
    };

    // ===== SECTION: Destination Country =====
    renderSectionHeader(translations?.destinationCountryLabel || 'Destination country');
    if (data.recipientCountry) {
      renderField(translations?.countryLabel || 'Country', data.recipientCountry);
    }
    yPosition += 2;

    // ===== SECTION: Beneficiary Bank Details =====
    renderSectionHeader(translations?.beneficiaryBankDetails || 'Beneficiary bank details');
    if (data.swiftCode) {
      renderField(translations?.swiftBicCodeLabel || 'SWIFT / BIC code', data.swiftCode);
    }
    if (data.bankName) {
      const bankInfo = data.bankAddress 
        ? `${data.bankName}\n${data.bankAddress}`
        : data.bankName;
      renderField(translations?.bankBranchLabel || 'Bank / branch', bankInfo);
    }
    if (data.recipientAccount) {
      renderField(translations?.accountNumberLabel || 'Account number', data.recipientAccount);
    }
    if (data.iban) {
      renderField(translations?.ibanLabel || 'IBAN', data.iban);
    }
    if (data.recipientName) {
      renderField(translations?.accountNameLabel || 'Account name', data.recipientName);
    }
    if (data.recipientAddress) {
      renderField(translations?.addressLabel || 'Address', data.recipientAddress);
    }
    yPosition += 2;

    // ===== SECTION: Transfer Details =====
    renderSectionHeader(translations?.transferDetailsLabel || 'Transfer details');
    
    // From account with account type and number - ensure we have valid values
    const hasValidSenderDetails = data.senderAccountType && 
      data.senderAccountNumber && 
      data.senderAccountType !== 'N/A' && 
      data.senderAccountNumber !== 'N/A';
    
    const fromAccountDisplay = hasValidSenderDetails
      ? `${data.senderAccountType} (${data.senderAccountNumber})`
      : (data.fromAccount && data.fromAccount !== 'N/A' ? data.fromAccount : 'Not Available');
    renderField(translations?.fromAccountLabel || 'From account', fromAccountDisplay);
    
    renderField(translations?.transferCurrencyLabel || 'Transfer currency', data.currency || 'USD');
    renderField(translations?.transferAmountLabel || 'Transfer amount', `$${formatAmount(data.amount)}`, true);
    if (data.priority) {
      renderField(translations?.priorityLabel || 'Priority', data.priority.charAt(0).toUpperCase() + data.priority.slice(1));
    }
    renderField(translations?.statusLabel || 'Status', getStatusLabel(data.status, translations));
    renderField(translations?.processingTimeLabel || 'Processing time', getProcessingTime(data.transactionType, data.priority, translations));
    yPosition += 2;

    // ===== SECTION: Other Details =====
    if (data.description || data.correspondentBank) {
      renderSectionHeader(translations?.otherDetailsLabel || 'Other details');
      if (data.description) {
        renderField(translations?.purposeOfTransferLabel || 'Purpose of transfer', data.description);
      }
      if (data.correspondentBank) {
        renderField(translations?.correspondentBankLabel || 'Correspondent bank', data.correspondentBank);
      }
      yPosition += 2;
    }

    // ===== SECTION: Reference Number (highlighted) =====
    yPosition += 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const refLabel = translations?.referenceNumberLabel || 'Reference number:';
    doc.text(refLabel, margin, yPosition);
    
    // Small info icon (blue circle with i)
    const refLabelWidth = doc.getTextWidth(refLabel) + 3;
    const refX = margin + refLabelWidth;
    doc.setFillColor(headerR, headerG, headerB);
    doc.circle(refX, yPosition - 1.5, 2.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('i', refX, yPosition - 0.5, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(displayReference, refX + 5, yPosition);
    
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('(' + (translations?.forEnquiries || 'FOR ENQUIRIES') + ')', margin + refLabelWidth, yPosition + 4);
    yPosition += 12;

    // ===== IMPORTANT INFORMATION SECTION =====
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(translations?.importantInformationTitle || 'IMPORTANT INFORMATION', margin, yPosition);
    yPosition += 5;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const importantText1 = translations?.importantText1 || 
      `It is your responsibility to ensure that the details provided by you in making your ${bankSettings.bankName} International Money Transfer request are correct.`;
    const importantText2 = translations?.importantText2 || 
      `If incorrect details are provided by you, your ${bankSettings.bankName} International Money Transfer may be unsuccessful or may be paid to an unintended recipient and they may not be recovered. We do not check that the details provided by you are correct.`;
    const importantText3 = translations?.importantText3 || 
      `You cannot delete or cancel an International Money Transfer payment instruction within Internet Banking. If you wish to delete or cancel a payment instruction please contact us.`;
    
    const textWidth = pageWidth - 2 * margin;
    
    const lines1 = doc.splitTextToSize(importantText1, textWidth);
    doc.text(lines1, margin, yPosition);
    yPosition += lines1.length * 3 + 2;
    
    const lines2 = doc.splitTextToSize(importantText2, textWidth);
    doc.text(lines2, margin, yPosition);
    yPosition += lines2.length * 3 + 2;
    
    const lines3 = doc.splitTextToSize(importantText3, textWidth);
    doc.text(lines3, margin, yPosition);
    yPosition += lines3.length * 3 + 4;

    // Footer disclaimer
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(translations?.computerGeneratedReceipt || footerDisclaimer, pageWidth / 2, pageHeight - 10, { align: 'center' });

  } else {
    // ===== ORIGINAL LAYOUT FOR INTERNAL AND EXTERNAL TRANSFERS =====
    
    // Header with logo and bank name
    if (logoBase64 && showLogo) {
      try {
        doc.addImage(logoBase64, 'PNG', margin, yPosition, logoDimensions.width, logoDimensions.height);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(headerR, headerG, headerB);
        doc.text(bankSettings.bankName, margin + logoDimensions.width + 5, yPosition + 8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const receiptTitle = bankSettings.receiptTitle || translations?.transferConfirmationReceipt || 'Transfer Confirmation Receipt';
        doc.text(receiptTitle, margin + logoDimensions.width + 5, yPosition + 14);
        yPosition += Math.max(logoDimensions.height, 18) + 5;
      } catch {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(headerR, headerG, headerB);
        doc.text(bankSettings.bankName, margin, yPosition + 8);
        yPosition += 18;
      }
    } else {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(headerR, headerG, headerB);
      doc.text(bankSettings.bankName, margin, yPosition + 8);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const receiptTitle = bankSettings.receiptTitle || translations?.transferConfirmationReceipt || 'Transfer Confirmation Receipt';
      doc.text(receiptTitle, margin, yPosition + 14);
      yPosition += 18;
    }

    // Divider line
    doc.setDrawColor(headerR, headerG, headerB);
    doc.setLineWidth(0.4);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Success indicator box
    const accentColor = bankSettings.receiptAccentColor || '#22c55e';
    const [accentR, accentG, accentB] = hexToRgb(accentColor);
    const bgR = Math.min(255, accentR + (255 - accentR) * 0.9);
    const bgG = Math.min(255, accentG + (255 - accentG) * 0.9);
    const bgB = Math.min(255, accentB + (255 - accentB) * 0.9);
    
    doc.setFillColor(bgR, bgG, bgB);
    doc.setDrawColor(accentR, accentG, accentB);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 18, 2, 2, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentR * 0.7, accentG * 0.7, accentB * 0.7);
    const successText = data.transactionType === 'internal' 
      ? (translations?.transferCompletedSuccessfully || 'Transfer Completed Successfully')
      : (translations?.transferSubmittedSuccessfully || 'Transfer Submitted Successfully');
    doc.text(successText, pageWidth / 2, yPosition + 7, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(accentR * 0.5, accentG * 0.5, accentB * 0.5);
    doc.text(`${translations?.referenceColonLabel || 'Reference:'} ${displayReference}`, pageWidth / 2, yPosition + 13, { align: 'center' });
    
    yPosition += 24;

    // Transfer Details Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(headerR, headerG, headerB);
    doc.text(translations?.transferDetailsLabel || 'Transfer Details', margin, yPosition);
    yPosition += 4;

    const mainDetails: [string, string][] = [
      [translations?.transferTypeLabel || 'Transfer Type', getTransferTypeLabel(data.transactionType, translations)],
      [translations?.transferAmountLabel || 'Amount', `$${formatAmount(data.amount)}${data.currency && data.currency !== 'USD' ? ` (${data.currency})` : ''}`],
      [translations?.statusLabel || 'Status', getStatusLabel(data.status, translations)],
      [translations?.processingTimeLabel || 'Processing Time', getProcessingTime(data.transactionType, data.priority, translations)],
      [translations?.dateLabel || 'Date & Time', data.timestamp],
      [translations?.referenceNumberLabel || 'Reference Number', displayReference],
    ];

    if (data.priority) {
      mainDetails.push([translations?.priorityLabel || 'Priority', data.priority.charAt(0).toUpperCase() + data.priority.slice(1)]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: mainDetails,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42, textColor: [60, 60, 60] },
        1: { cellWidth: 'auto', textColor: [30, 30, 30] },
      },
      margin: { left: margin, right: margin },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 8;

    // Account Information Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(headerR, headerG, headerB);
    doc.text(translations?.accountInformationLabel || 'Account Information', margin, yPosition);
    yPosition += 4;

    const accountDetails: [string, string][] = [
      [translations?.fromAccountLabel || 'From Account', data.fromAccount],
    ];

    if (data.transactionType === 'internal') {
      accountDetails.push([translations?.toAccountLabel || 'To Account', data.toAccount || '-']);
    } else {
      accountDetails.push([translations?.recipientNameLabel || 'Recipient Name', data.recipientName || '-']);
      if (data.recipientAccount) {
        accountDetails.push([translations?.recipientAccountLabel || 'Recipient Account', data.recipientAccount]);
      }
      accountDetails.push([translations?.bankNameLabel || 'Bank Name', data.bankName || '-']);
      
      if (data.routingCode) {
        accountDetails.push([translations?.routingSortCodeLabel || 'Routing/Sort Code', data.routingCode]);
      }
    }

    if (data.description) {
      accountDetails.push([translations?.descriptionLabel || 'Description', data.description]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: accountDetails,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42, textColor: [60, 60, 60] },
        1: { cellWidth: 'auto', textColor: [30, 30, 30] },
      },
      margin: { left: margin, right: margin },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 8;

    // Important Notice for External Transfers
    if (data.transactionType === 'external') {
      doc.setFillColor(254, 249, 195);
      doc.setDrawColor(234, 179, 8);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 20, 2, 2, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(161, 98, 7);
      doc.text((translations?.importantNotice || 'Important Notice') + ':', margin + 4, yPosition + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(113, 63, 18);
      doc.text('• ' + (translations?.externalTransferPendingNote || 'This transfer is pending approval and may take 1-3 business days.'), margin + 4, yPosition + 12);
      
      yPosition += 26;
    }

    // Custom message if provided
    const customMessage = bankSettings.receiptCustomMessage;
    if (customMessage) {
      const textLines = doc.splitTextToSize(customMessage, pageWidth - 2 * margin - 8);
      const messageHeight = Math.max(16, textLines.length * 4 + 8);
      
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(headerR, headerG, headerB);
      doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, messageHeight, 2, 2, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(headerR, headerG, headerB);
      doc.text(textLines, margin + 4, yPosition + 6);
      
      yPosition += messageHeight + 6;
    }

    // Footer
    const footerY = pageHeight - 30;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    doc.text(bankSettings.bankName, pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(bankSettings.bankAddress, pageWidth / 2, footerY + 10, { align: 'center' });
    doc.text(`${translations?.phoneLabel || 'Phone'}: ${bankSettings.bankPhone} | ${translations?.emailLabel || 'Email'}: ${bankSettings.contactEmail}`, pageWidth / 2, footerY + 15, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(translations?.computerGeneratedReceipt || footerDisclaimer, pageWidth / 2, footerY + 22, { align: 'center' });
  }

  // Save the PDF
  const fileName = `Transfer_Receipt_${displayReference}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export type { TransferReceiptData, BankSettings };
