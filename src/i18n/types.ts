export type LanguageCode = 'en' | 'zh' | 'es' | 'de' | 'fr' | 'ru' | 'ja' | 'pt';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
];

export interface TranslationKeys {
  accountApplication: {
    // Main page
    pageTitle: string;
    pageSubtitle: string;
    
    // Step names
    stepPersonalDetails: string;
    stepEmailVerification: string;
    stepAccountDetails: string;
    stepIdentityVerification: string;
    stepSecurity: string;
    stepReview: string;
    
    // Personal Information
    personalInformation: string;
    personalInfoDescription: string;
    titleLabel: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dateOfBirth: string;
    ageRequirement: string;
    month: string;
    day: string;
    year: string;
    
    // Address
    residentialAddress: string;
    streetAddress: string;
    suiteApt: string;
    cityTown: string;
    stateRegion: string;
    postalCode: string;
    country: string;
    
    // Contact
    contactDetails: string;
    primaryPhone: string;
    emailAddress: string;
    confirmEmail: string;
    
    // Email Verification
    verifyYourEmail: string;
    verifyEmailDescription: string;
    emailVerified: string;
    proceedingToNext: string;
    sendVerificationCode: string;
    sendingCode: string;
    enterVerificationCode: string;
    enterCodeHint: string;
    verifyEmail: string;
    verifyingEmail: string;
    resendCode: string;
    checkingRequirements: string;
    
    // Account Details
    accountDetailsTitle: string;
    accountDetailsDescription: string;
    accountOwnership: string;
    individual: string;
    joint: string;
    jointWithCoApplicant: string;
    corporate: string;
    corporateBusiness: string;
    
    // Business Info
    businessInformation: string;
    companyName: string;
    businessRegistrationNumber: string;
    
    // Joint Applicant
    jointApplicantInfo: string;
    jointApplicantDescription: string;
    pickDate: string;
    
    // Account Setup
    accountName: string;
    accountNameDescription: string;
    desiredAccountType: string;
    selectAccountType: string;
    accountCurrency: string;
    selectCurrency: string;
    
    // Tax & Financial
    taxFinancialInfo: string;
    countryOfTaxResidence: string;
    taxIdentificationNumber: string;
    employmentStatus: string;
    selectStatus: string;
    sourceOfFunds: string;
    selectSource: string;
    
    // Identity Verification
    identityVerificationTitle: string;
    kycDescription: string;
    governmentId: string;
    idType: string;
    selectIdType: string;
    fullNameOnId: string;
    idNumber: string;
    uploadIdDocument: string;
    acceptedFormats: string;
    
    // Proof of Address
    proofOfAddress: string;
    documentType: string;
    selectDocumentType: string;
    issueDate: string;
    issueDateFormat: string;
    uploadAddressDocument: string;
    documentWithin3Months: string;
    
    // Security
    securityNextOfKin: string;
    securityDescription: string;
    passwordGeneratedInfo: string;
    accountCredentials: string;
    desiredUsername: string;
    usernameRequirements: string;
    securityCode: string;
    securityCodeDescription: string;
    confirmSecurityCode: string;
    confirmSecurityCodeDescription: string;
    
    // Next of Kin
    nextOfKinTitle: string;
    nextOfKinDescription: string;
    fullName: string;
    relationship: string;
    selectRelationship: string;
    phoneNumber: string;
    nokResidentialAddress: string;
    nokAddressDescription: string;
    
    // Marketing
    marketingPreferences: string;
    marketingConsent: string;
    marketingOptional: string;
    
    // Review & Submit
    reviewDeclaration: string;
    reviewDescription: string;
    edit: string;
    address: string;
    phone: string;
    email: string;
    accountOwnershipLabel: string;
    accountTypeLabel: string;
    accountNameLabel: string;
    registrationNumber: string;
    sourceOfFundsLabel: string;
    idTypeLabel: string;
    idNumberLabel: string;
    fullNameOnIdLabel: string;
    idDocument: string;
    proofOfAddressDoc: string;
    username: string;
    password: string;
    nextOfKin: string;
    contactPhone: string;
    contactEmail: string;
    
    // Terms
    termsConditions: string;
    agreeTerms: string;
    confirmAccuracy: string;
    electronicConsent: string;
    
    // Form Navigation
    previous: string;
    next: string;
    submitting: string;
    submitApplication: string;
    
    // Success Dialog
    applicationReceived: string;
    referenceNumber: string;
    confirmationEmailSent: string;
    applicationReviewMessage: string;
    returnToHome: string;
    
    // Back Warning Dialog
    leaveApplication: string;
    leaveWarningMessage: string;
    continueApplication: string;
    leaveAndReset: string;
    applicationReset: string;
    applicationResetDescription: string;
  };
  
  common: {
    login: string;
    logout: string;
    submit: string;
    cancel: string;
    back: string;
    next: string;
    loading: string;
    save: string;
    edit: string;
    delete: string;
    confirm: string;
    close: string;
    search: string;
    filter: string;
    all: string;
    yes: string;
    no: string;
    or: string;
    and: string;
    welcome: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    required: string;
    optional: string;
    selectLanguage: string;
    verifiedAccount: string;
    verified: string;
    secureSession: string;
    secure: string;
    personalBanking: string;
    lastLoginIP: string;
    loggingOut: string;
  };
  
  nav: {
    home: string;
    about: string;
    services: string;
    contact: string;
    openAccount: string;
    customerLogin: string;
    legal: string;
    careers: string;
  };
  
  auth: {
    signIn: string;
    signInTitle: string;
    signInSubtitle: string;
    emailOrUsername: string;
    emailOrUsernamePlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    forgotPassword: string;
    rememberMe: string;
    noAccount: string;
    createAccount: string;
    signInButton: string;
    signingIn: string;
    invalidCredentials: string;
    accountLocked: string;
    emailNotConfirmed: string;
    securityCode: string;
    securityCodeTitle: string;
    securityCodeSubtitle: string;
    enterSecurityCode: string;
    verifyCode: string;
    backToLogin: string;
    email2faTitle: string;
    email2faSubtitle: string;
    enterVerificationCode: string;
    resendCode: string;
    verificationCodeSent: string;
    changePassword: string;
    newPassword: string;
    confirmNewPassword: string;
    passwordChanged: string;
    passwordRequirements: string;
    resetPassword: string;
    resetPasswordTitle: string;
    resetPasswordSubtitle: string;
    dateOfBirth: string;
    phoneLast4: string;
    sendResetCode: string;
    enterResetCode: string;
    setNewPassword: string;
    welcomeBack: string;
    signInToAccount: string;
    encryption256: string;
    fdicInsured: string;
    monitoring24x7: string;
    secureSupport: string;
    convenientTransfers: string;
    fastDeposits: string;
    verificationCode: string;
    codeExpires: string;
    verifySecurityCode: string;
    verifying: string;
    useBackupCode: string;
    updatingPassword: string;
    firstLoginSecurity: string;
    sending: string;
    needHelp: string;
    contactSupport: string;
  };
  
  dashboard: {
    welcome: string;
    welcomeBack: string;
    accountSummary: string;
    accountSummaryDesc: string;
    recentTransactions: string;
    quickActions: string;
    transactions: string;
    transfers: string;
    deposits: string;
    payBills: string;
    loans: string;
    statements: string;
    bioDetails: string;
    security: string;
    kyc: string;
    support: string;
    noTransactions: string;
    viewAll: string;
    totalBalance: string;
    availableBalance: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    status: string;
    active: string;
    inactive: string;
    frozen: string;
    pending: string;
    completed: string;
    failed: string;
    lastLogin: string;
    upcomingPayments: string;
    noUpcomingPayments: string;
    totalAccounts: string;
    account: string;
    accounts: string;
   rejected: string;
   approved: string;
   inProgress: string;
   resolved: string;
   closed: string;
   
   // Transactions page
   transactionHistory: string;
   transactionHistoryDesc: string;
   filterTransactions: string;
   searchTransactions: string;
   exportCsv: string;
   allAccounts: string;
   allTypes: string;
   allStatus: string;
   clearFilters: string;
   transactionsCount: string;
   transactionsShown: string;
   noTransactionsMatch: string;
   noTransactionsFound: string;
   downloadReceipt: string;
   
   // Transfers page
   moneyTransfers: string;
   moneyTransfersDesc: string;
   domesticTransfer: string;
   internationalTransfer: string;
   transferHistory: string;
   betweenMyAccounts: string;
   sameBankTransfer: string;
   otherBanks: string;
   viewTransferActivities: string;
    noTransfersFound: string;
    selectSourceAccountToContinue: string;
   
   // Deposits page
   depositsTitle: string;
   checkDeposit: string;
   cryptoDeposit: string;
   depositHistory: string;
   depositToAccount: string;
   selectAccount: string;
   amount: string;
   frontOfCheck: string;
   backOfCheck: string;
   uploadFrontImage: string;
   uploadBackImage: string;
   submitCheckDeposit: string;
   selectCryptoType: string;
   walletAddress: string;
   transactionHash: string;
   submitCryptoDeposit: string;
   depositsDisabled: string;
   noActiveAccounts: string;
   checkDepositDesc: string;
   cryptoDepositDesc: string;
   cryptocurrency: string;
   selectCrypto: string;
   sendCryptoTo: string;
   importantInstructions: string;
   cryptoInstruction1: string;
   cryptoInstruction2: string;
   cryptoInstruction3: string;
   cryptoInstruction4: string;
   amountUSD: string;
   transactionHashLabel: string;
   transactionHashPlaceholder: string;
   transactionHashRequired: string;
   recordCryptoDeposit: string;
   viewRecentDeposits: string;
   noDepositsFound: string;
   
   // Pay Bills page
   payBillsTitle: string;
   payBillsDesc: string;
   makePayment: string;
   makePaymentDesc: string;
   sendMoneyToPayees: string;
   selectPayee: string;
   choosePayee: string;
   fromAccount: string;
   chooseAccount: string;
   description: string;
   descriptionOptional: string;
   processPayment: string;
   processing: string;
   managePayees: string;
   addPayee: string;
   addNewPayee: string;
   addNewPayeeDesc: string;
   payeeName: string;
   enterPayeeName: string;
   accountNumberLabel: string;
   enterAccountNumber: string;
   bankNameOptional: string;
   enterBankName: string;
   yourSavedPayees: string;
   noPayeesFound: string;
   recentPayments: string;
   recentPaymentsDesc: string;
   paymentDescription: string;
   yourLatestPayments: string;
   noPaymentsFound: string;
   billPayment: string;
   
   // Loans page
   myLoans: string;
   myLoansDesc: string;
   applyForLoan: string;
   loanApplicationsNotAvailable: string;
   notQualifiedForLoan: string;
   overview: string;
   applications: string;
   paymentHistory: string;
   upcomingPaymentsTab: string;
   settings: string;
   activeLoans: string;
   totalOutstanding: string;
   totalOutstandingBalance: string;
   monthlyPayment: string;
   dueThisMonth: string;
   paymentScore: string;
   onTimePayments: string;
   loanDetails: string;
   interestRate: string;
   termMonths: string;
   disbursementDate: string;
   maturityDate: string;
   remainingBalance: string;
   noActiveLoans: string;
   noLoanApplications: string;
   requestedAmount: string;
   loanType: string;
   loanPurpose: string;
   employmentStatusLabel: string;
   monthlyIncome: string;
   disbursementAccount: string;
   loanTerm: string;
   submitApplicationBtn: string;
   cancelBtn: string;
   
   // Statements page
   accountStatements: string;
   accountStatementsDesc: string;
   filterStatements: string;
   filterStatementsDesc: string;
   filterByAccountType: string;
   yearFilter: string;
   monthFilter: string;
   allAccountTypes: string;
   allMonths: string;
   generateNewStatement: string;
   generateNewStatementDesc: string;
   selectPeriod: string;
   lastWeek: string;
   lastMonth: string;
   last3Months: string;
   last6Months: string;
   customRange: string;
   startDate: string;
   endDate: string;
   generateStatement: string;
   generating: string;
   previousStatements: string;
   previousStatementsDesc: string;
   noStatementsFound: string;
   viewStatement: string;
   downloadStatement: string;
   statementPeriod: string;
   openingBalance: string;
   closingBalance: string;
   totalCredits: string;
   totalDebits: string;
   
   // Profile page
   profileBioDetails: string;
   profileBioDetailsDesc: string;
   personalInformation: string;
   contactDetails: string;
   profilePhoto: string;
   updateProfilePicture: string;
   uploadPhoto: string;
   uploading: string;
   maxFileSize: string;
   fullNameLabel: string;
   fullNameCannotChange: string;
   dateOfBirthLabel: string;
   dateOfBirthCannotChange: string;
   emailAddressLabel: string;
   emailCannotChange: string;
   saveChanges: string;
   updating: string;
   contactInformation: string;
   manageContactDetails: string;
   phoneNumberIntl: string;
   includeCountryCode: string;
   billingAddress: string;
   
   // Security page
   securitySettings: string;
   securitySettingsDesc: string;
   passwordTab: string;
   twoFactorTab: string;
   securityCodeTab: string;
   changePassword: string;
   updatePasswordDesc: string;
   currentPassword: string;
   newPassword: string;
   confirmNewPassword: string;
   passwordRequirements: string;
   updatePassword: string;
   twoFactorAuth: string;
   twoFactorAuthDesc: string;
   emailAuthentication: string;
   emailAuthDesc: string;
   securityCodeAuth: string;
   securityCodeAuthDesc: string;
   securityCodeForTransfers: string;
   securityCodeForTransfersDesc: string;
   updateSecurityCode: string;
   oldSecurityCode: string;
   newSecurityCode: string;
   confirmSecurityCode: string;
   backupCodes: string;
   generateBackupCodes: string;
   downloadBackupCodes: string;
   
   // KYC page
   kycVerification: string;
   kycVerificationDesc: string;
   verificationStatus: string;
   verificationProgress: string;
   documentsApproved: string;
   allDocumentsVerified: string;
   verificationInProgress: string;
   uploadDocuments: string;
   uploadDocumentsDesc: string;
   documentTypeLabel: string;
   selectDocumentType: string;
   clickToUpload: string;
   acceptedFormatsKyc: string;
   selectFile: string;
   uploadedDocuments: string;
   uploadedDocumentsDesc: string;
   noDocumentsUploaded: string;
   verificationRequirements: string;
   verificationRequirementsDesc: string;
   acceptableDocuments: string;
   documentRequirements: string;
   verificationNote: string;
   
   // Support page
   supportCenter: string;
   supportCenterDesc: string;
   supportTickets: string;
   newTicket: string;
   faq: string;
   contact: string;
   mySupportTickets: string;
   mySupportTicketsDesc: string;
   noTicketsFound: string;
   viewTrackRequests: string;
   searchTickets: string;
   loadingTickets: string;
   noSupportTickets: string;
   ticketNumber: string;
   created: string;
   updated: string;
   viewTicket: string;
   replyToSupport: string;
   typeYourReply: string;
   sendReply: string;
   sending: string;
   ticketClosed: string;
   createNewTicket: string;
   createNewTicketDesc: string;
   subject: string;
   enterSubject: string;
   messageLabel: string;
   describeIssue: string;
   priority: string;
   low: string;
   medium: string;
   high: string;
   urgent: string;
   submitTicket: string;
   submittingTicket: string;
   frequentlyAskedQuestions: string;
   faqDesc: string;
   contactUs: string;
   contactUsDesc: string;
   phoneSupport: string;
   available24x7: string;
   emailSupport: string;
   responseTime: string;
   generalSupportHours: string;
   nonUrgentInquiries: string;
   liveChat: string;
   chatWithSupport: string;
   liveChatHours: string;
   startChat: string;
   you: string;
   supportTeam: string;
   ticketClosedMessage: string;
   createNewToDiscuss: string;
   supportTicketResponse: string;
   newSupportMessage: string;
   replySentSuccess: string;
   failedSendReply: string;
   failedLoadTickets: string;
   fillRequiredFields: string;
   ticketCreatedTitle: string;
   ticketCreatedDesc: string;
   failedCreateTicket: string;
   faqResetPassword: string;
   faqResetPasswordAnswer: string;
   faqTransferLimits: string;
   faqTransferLimitsAnswer: string;
   faqTransferTime: string;
   faqTransferTimeAnswer: string;
   faqMobileSecurity: string;
   faqMobileSecurityAnswer: string;
   
   // Account Summary (Dashboard Overview)
   bankingAccountsOverview: string;
   latestAccountActivity: string;
   viewAllTransactions: string;
   manageBankingNeeds: string;
   transferMoney: string;
   viewStatements: string;
   accountSettings: string;
   needAssistance: string;
   contactSupport: string;
   awaitingDeposit: string;
   balance: string;
   upcomingLoanPayments: string;
   paymentsDueSoon: string;
   paymentDue: string;
   principal: string;
   viewAllLoans: string;
   allAccountsOption: string;
   transaction: string;
   
   // Internal Transfer Form
   internalTransfer: string;
   internalTransferDesc: string;
   toAccount: string;
   selectSourceAccount: string;
   selectDestinationAccount: string;
   whatsThisTransferFor: string;
   reviewTransfer: string;
   currencyConversionApply: string;
   
   // External Transfer Form
   externalTransfer: string;
   externalTransferDesc: string;
   recipientName: string;
   recipientAccountNumber: string;
   recipientAccountNumberDesc: string;
   bankName: string;
   routingCode: string;
   manualApprovalRequired: string;
   manualApprovalDesc: string;
   
   // Intra-Bank Transfer Form
   sameBankTransferDesc: string;
   recipientAccountLabel: string;
   accountHolderName: string;
   recipientVerified: string;
   verifyingRecipient: string;
   
   // Profile Page - Missing keys (Fix for displayed function names)
   personalInformationDesc: string;
   profilePhotoDesc: string;
   photoRequirements: string;
   fullName: string;
   fullNameNote: string;
   dateOfBirth: string;
   dateOfBirthNote: string;
   emailAddress: string;
   emailAddressNote: string;
   phoneNumberNote: string;
   
   // Security Page - Missing keys
   password: string;
   securityCode: string;
   changePasswordDesc: string;
   enterCurrentPassword: string;
   enterNewPassword: string;
   confirmNewPasswordPlaceholder: string;
   twoFactorAuthentication: string;
   
   // Security Page - 2FA Section
   emailAuthenticationTitle: string;
   emailAuthenticationDesc: string;
   email2faActive: string;
   email2faActiveDesc: string;
   smsAuthentication: string;
   smsAuthenticationDesc: string;
   sms2faActive: string;
   sms2faActiveDesc: string;
   twoFactorDisabled: string;
   twoFactorDisabledDesc: string;
   
   // Security Recommendations
   securityRecommendations: string;
   securityRecommendationsDesc: string;
   strongPassword: string;
   strongPasswordDesc: string;
   regularUpdates: string;
   regularUpdatesDesc: string;
   secureConnections: string;
   secureConnectionsDesc: string;
   
   // Security Code Settings
   securityCodeSettings: string;
   securityCodeSettingsDesc: string;
   securityCodeAuthTitle: string;
   securityCodeAuthDescTitle: string;
   lastUpdated: string;
   securityCodeActive: string;
   securityCodeActiveDesc: string;
   securityCodeDisabled: string;
   securityCodeDisabledDesc: string;
   useCodeForTransfers: string;
   useCodeForTransfersDesc: string;
   transferSecurityCodeActive: string;
   transferSecurityCodeActiveDesc: string;
   changeSecurityCodeTitle: string;
   setSecurityCodeTitle: string;
   updateExistingCode: string;
   createNewCode: string;
   currentSecurityCode: string;
   enterAlphanumericCode: string;
   
   // Backup Codes
   backupCodesTitle: string;
   backupCodesDesc: string;
   backupCodesInfo: string;
   generatingCodes: string;
   saveCodesWarning: string;
   codesUsageNote: string;
   downloadCodes: string;
   done: string;
   
   // Security Dialogs
   enableEmail2faTitle: string;
   enableEmail2faDesc: string;
   enableEmail2faNote: string;
   okEnableEmail2fa: string;
   enableSecurityCodeTitle: string;
   enableSecurityCodeDesc: string;
   enableSecurityCodeNote: string;
   okEnableSecurityCode: string;
   
   // Next of Kin Section
   nextOfKinDetails: string;
   emergencyContactInfo: string;
   addNextOfKin: string;
   editNextOfKin: string;
   noNextOfKinAdded: string;
   addEmergencyContactInfo: string;
   addEmergencyContactDesc: string;
   allFieldsRequired: string;
   phoneMissing: string;
   emailMissing: string;
   updateMissingDetails: string;
   enterFullName: string;
   selectRelationship: string;
   enterPhoneNumber: string;
   enterEmailAddress: string;
   updateNextOfKin: string;
   nextOfKinUpdated: string;
   nextOfKinAdded: string;
   unableToSaveNextOfKin: string;
   spouse: string;
   parent: string;
   child: string;
   sibling: string;
   friend: string;
   other: string;
   relationship: string;
   email: string;
   phoneNumber: string;
   
   // Transfer History
   viewRecentTransferActivities: string;
   noTransfersFoundHistory: string;
   
   // International Transfer
   internationalTransferTitle: string;
   internationalTransferDesc: string;
   createTransfer: string;
   newInternationalTransfer: string;
   newInternationalTransferDesc: string;
   selectAccountToTransfer: string;
   swiftBicCode: string;
   swiftCodeFormat: string;
   ibanIfApplicable: string;
   correspondentBank: string;
   correspondentBankPlaceholder: string;
   recipientBankName: string;
   recipientBankNamePlaceholder: string;
   bankAddress: string;
   bankAddressPlaceholder: string;
   recipientAddress: string;
   recipientAddressPlaceholder: string;
   recipientNamePlaceholder: string;
   recipientAccountNumberPlaceholder: string;
   recipientCountry: string;
   selectCountry: string;
   transferCurrency: string;
   selectCurrency: string;
   purposeOfTransfer: string;
   purposeOfTransferPlaceholder: string;
   transferPriority: string;
   urgentPriority: string;
   highPriority: string;
   normalPriority: string;
    submitTransfer: string;
    internationalTransferHistory: string;
    internationalTransferHistoryDesc: string;
    noInternationalTransfers: string;
    reference: string;
    referenceLabel: string;
    swiftCodeLabel: string;
    priorityLabel: string;
    createdLabel: string;
    purposeLabel: string;
    importantInformation: string;
    complianceReviewNote: string;
    correspondentFeesNote: string;
    exchangeRatesNote: string;
    processingTimeNote: string;
    intlTransferNote1: string;
    intlTransferNote2: string;
    intlTransferNote3: string;
    intlTransferNote4: string;
   
   // Security Code - additional keys
   securityCodeHint: string;
   updateSecurityCodeBtn: string;
   setSecurityCodeBtn: string;
   saveBackupCodesWarning: string;
   backupCodesOnceUse: string;
   
    // Transfer Security Code Modal
    securityVerificationRequired: string;
    enterSecurityCodeForTransfer: string;
    enterCompleteSecurityCode: string;
    attemptsRemaining: string;
    tooManyAttempts: string;
    verifyAndContinue: string;
    
    // Transfer Confirmation Page
    copied: string;
    referenceCopied: string;
    unableToLoadSettings: string;
    receiptDownloaded: string;
    receiptDownloadSuccess: string;
    downloadFailed: string;
    receiptGenerateFailed: string;
    transferCompleted: string;
    transferSubmitted: string;
    internalTransferComplete: string;
    externalTransferProcessing: string;
    internationalTransferSubmitted: string;
    confirmationWillBeEmailed: string;
    confirmationSentToEmail: string;
    transferDetailsTitle: string;
    transferConfirmationInfo: string;
    referenceNumberLabel: string;
    processingTimeLabel: string;
    instantProcessing: string;
    oneToThreeDays: string;
    sameDay: string;
    oneToTwoDays: string;
    twoToFiveDays: string;
    dateTimeLabel: string;
    recipientLabel: string;
    swiftNetworkNote: string;
    receiptEmailNote: string;
    correspondentBankNote: string;
    exchangeRatesNoteConf: string;
    trackTransferNote: string;
    submitAnotherTransfer: string;
    returnToDashboard: string;
    downloadTransferReceipt: string;
    getPdfCopyDesc: string;
    downloadPdfReceipt: string;
    generatingReceipt: string;
    
    // PDF Receipt Labels
    wireReceiptTitle: string;
    dateLabel: string;
    destinationCountryLabel: string;
    countryLabel: string;
    beneficiaryBankDetails: string;
    swiftBicCodeLabel: string;
    bankBranchLabel: string;
    accountNumberLabel2: string;
    ibanLabel: string;
    accountNameLabel: string;
    addressLabel: string;
    transferDetailsLabel: string;
    fromAccountLabel: string;
    transferCurrencyLabel: string;
    transferAmountLabel: string;
    priorityLabelReceipt: string;
    statusLabelReceipt: string;
    processingTimeLabelReceipt: string;
    otherDetailsLabel: string;
    purposeOfTransferLabel: string;
    correspondentBankLabelReceipt: string;
    referenceNumberLabelReceipt: string;
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
    recipientAccountLabelReceipt: string;
    bankNameLabel: string;
    routingSortCodeLabel: string;
    descriptionLabel: string;
    importantNotice: string;
    externalTransferPendingNote: string;
    phoneLabel: string;
    emailLabel: string;
    computerGeneratedReceipt: string;
    
    // Transfer Review Modal
    transferReviewSameBank: string;
    transferReviewExternal: string;
    transferReviewInternational: string;
    transferReviewTitle: string;
    reviewTransferDesc: string;
    accountDetailsLabel: string;
    balanceLabel: string;
    recipientLabelReview: string;
    accountLabel: string;
    accountNumberLabelReview: string;
    addressLabelReview: string;
    bankInformationLabel: string;
    bankNameLabelReview: string;
    routingSortCodeLabelReview: string;
    swiftBicCodeLabelReview: string;
    ibanLabelReview: string;
    recipientBankAddressLabel: string;
    correspondentBankLabelReview: string;
    descriptionLabelReview: string;
    priorityLabelReview: string;
    purposeOfTransferLabelReview: string;
    processingInformationTitle: string;
    intlComplianceNote: string;
    intlProcessingTimeNote: string;
    intlExchangeRateNote: string;
    intlCorrespondentFeesNote: string;
    editTransferBtn: string;
    confirmTransferBtn: string;
    processingBtn: string;
    
    // Transfer Progress Modal
    processingInternalTransfer: string;
    processingExternalTransfer: string;
    processingInternationalTransfer: string;
    pleaseWaitProcessing: string;
    processingProgressLabel: string;
    transferCancelledTitle: string;
    transferCancelledDesc: string;
    validatingAccounts: string;
    processingTransferStep: string;
    updatingBalances: string;
    transferCompletedStep: string;
    validatingRecipientDetails: string;
    processingWithExternalBank: string;
    confirmingTransaction: string;
    transferInitiated: string;
    validatingSWIFTDetails: string;
    complianceVerificationStep: string;
    processingThroughSWIFT: string;
    transferSubmittedForProcessing: string;
    waitingForVerificationCodes: string;
    transferSubmittedSuccess: string;
    transferCompletedSuccess: string;
    redirectingToConfirmation: string;
    
    // Transfer Code Verification Modal
    complianceVerificationTitle: string;
    enterCodeToProceed: string;
    securityVerificationRequiredTitle: string;
    completeIntlTransferCode: string;
    pleaseEnterVerificationCode: string;
    codeNameLabel: string;
    enter10CharCode: string;
    attemptsRemainingText: string;
    wrongCode3Times: string;
    incorrectCodeAttempts: string;
    verificationError: string;
    cancelTransferBtn: string;
    verifyingBtn: string;
    verifyCodeBtn: string;
  };
  
  home: {
    heroTitle: string;
    heroTitleHighlight: string;
    heroSubtitle: string;
    whyChooseUs: string;
    whyChooseUsSubtitle: string;
    bankGradeSecurity: string;
    bankGradeSecurityDesc: string;
    premiumServices: string;
    premiumServicesDesc: string;
    trustedLegacy: string;
    trustedLegacyDesc: string;
    ourServices: string;
    ourServicesSubtitle: string;
    checkingAccounts: string;
    checkingAccountsDesc: string;
    savingsAccounts: string;
    savingsAccountsDesc: string;
    investmentServices: string;
    investmentServicesDesc: string;
    businessBanking: string;
    businessBankingDesc: string;
    exploreServices: string;
    readyToStart: string;
    readyToStartSubtitle: string;
    openAccountToday: string;
    contactUs: string;
  };
  
  about: {
    title: string;
    subtitle: string;
    ourStory: string;
    ourStoryText: string;
    ourMission: string;
    ourMissionText: string;
    ourVision: string;
    ourVisionText: string;
    coreValues: string;
    securityValue: string;
    securityValueDesc: string;
    trustValue: string;
    trustValueDesc: string;
    excellenceValue: string;
    excellenceValueDesc: string;
    byTheNumbers: string;
    yearsOfService: string;
    happyCustomers: string;
    branchLocations: string;
    assetsUnderManagement: string;
  };
  
  services: {
    title: string;
    subtitle: string;
    personalBanking: string;
    personalBankingDesc: string;
    checkingSavings: string;
    checkingSavingsDesc: string;
    premiumCreditCards: string;
    premiumCreditCardsDesc: string;
    personalLoans: string;
    personalLoansDesc: string;
    businessBanking: string;
    businessBankingDesc: string;
    businessChecking: string;
    businessCheckingDesc: string;
    businessLoans: string;
    businessLoansDesc: string;
    merchantServices: string;
    merchantServicesDesc: string;
    investmentServices: string;
    investmentServicesDesc: string;
    portfolioManagement: string;
    portfolioManagementDesc: string;
    retirementPlanning: string;
    retirementPlanningDesc: string;
    digitalBanking: string;
    digitalBankingDesc: string;
    mobileApp: string;
    mobileAppDesc: string;
    onlineBanking: string;
    onlineBankingDesc: string;
    getStarted: string;
    learnMore: string;
    openPersonalAccount: string;
    contactBusinessSpecialist: string;
    loanServices: string;
    loanServicesDesc: string;
    applyForLoan: string;
    personalChecking: string;
    personalCheckingDesc: string;
    highYieldSavings: string;
    highYieldSavingsDesc: string;
    treasuryManagement: string;
    treasuryManagementDesc: string;
    homeMortgages: string;
    homeMortgagesDesc: string;
    autoLoans: string;
    autoLoansDesc: string;
    studentLoans: string;
    studentLoansDesc: string;
    homeEquityLoans: string;
    homeEquityLoansDesc: string;
    smallBusinessLoans: string;
    smallBusinessLoansDesc: string;
    personalCreditLines: string;
    personalCreditLinesDesc: string;
    financialAdvisory: string;
    financialAdvisoryDesc: string;
    startingRate: string;
    maxLoanAmount: string;
    termOptions: string;
    creditLimit: string;
    access: string;
    loanToValue: string;
    repayment: string;
    freeOnlineBanking: string;
    mobileCheckDeposit: string;
    customerSupport24x7: string;
    atmFeeReimbursement: string;
    noMinimumBalance: string;
    automaticSavingsPlans: string;
    goalBasedSavings: string;
    cashBackRewards: string;
    travelBenefits: string;
    purchaseProtection: string;
    fraudMonitoring: string;
    competitiveRates: string;
    quickApproval: string;
    flexibleTerms: string;
    noPrepaymentPenalties: string;
    noTransactionLimits: string;
    businessDebitCards: string;
    cashManagement: string;
    sbaLoans: string;
    equipmentFinancing: string;
    linesOfCredit: string;
    commercialRealEstate: string;
    wireTransfers: string;
    achProcessing: string;
    remoteDeposit: string;
    accountReconciliation: string;
    creditCardProcessing: string;
    mobilePayments: string;
    onlinePayments: string;
    reportingTools: string;
  };
  
  contact: {
    title: string;
    subtitle: string;
    sendMessage: string;
    sendMessageDesc: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    messagePlaceholder: string;
    sendButton: string;
    getInTouch: string;
    customerService: string;
    emergencyHotline: string;
    hours24x7: string;
    urgentMatters: string;
    branchLocations: string;
    branchLocationsSubtitle: string;
    address: string;
    hoursLabel: string;
  };
  
  footer: {
    description: string;
    quickLinks: string;
    aboutUs: string;
    services: string;
    contact: string;
    customerLogin: string;
    contactInfo: string;
    allRightsReserved: string;
    memberFDIC: string;
    digitalBankingFeatures: string;
    bankGradeSecurity: string;
    access24x7: string;
    instantTransfers: string;
    fdicInsured: string;
    sslSecured: string;
    pciCompliant: string;
    legal: string;
    careers: string;
  };
}

export type Translations = {
  [key in LanguageCode]: TranslationKeys;
};
