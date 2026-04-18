// Shared email translations for all edge functions
// These translations are applied at runtime - no non-English content is stored in the database

export type SupportedLanguage = 'en' | 'zh' | 'es' | 'de' | 'fr' | 'ru' | 'ja' | 'pt';

export interface EmailTranslations {
  // Common
  dear: string;
  securityNotice: string;
  contactUs: string;
  secureNotice: string;
  automatedMessage: string;
  confidentialityNotice: string;
  
  // 2FA Email
  loginVerification: string;
  loginVerificationDesc: string;
  codeExpiresIn: string;
  codeExpiresIn10: string;
  ipAddress: string;
  location: string;
  time: string;
  didNotAttemptLogin: string;
  
  // Password Reset
  passwordReset: string;
  passwordResetDesc: string;
  codeExpiresIn15: string;
  didNotRequestReset: string;
  
  // Email Verification
  emailVerification: string;
  emailVerificationDesc: string;
  verifyYourEmail: string;
  
  // Transfer Notifications
  transferSubmitted: string;
  transferApproved: string;
  transferRejected: string;
  domesticTransfer: string;
  internationalTransfer: string;
  transferDetails: string;
  amount: string;
  recipient: string;
  recipientName: string;
  recipientBank: string;
  recipientAccount: string;
  referenceNumber: string;
  fromAccount: string;
  status: string;
  pending: string;
  pendingReview: string;
  completed: string;
  approved: string;
  rejected: string;
  processingTime: string;
  
  // Transaction Alerts
  creditAlert: string;
  debitAlert: string;
  accountCredited: string;
  accountDebited: string;
  newBalance: string;
  transactionType: string;
  description: string;
  transactionNotification: string;
  transactionDate: string;
  didNotAuthorize: string;
  
  // Application Decision
  applicationApproved: string;
  applicationRejected: string;
  welcomeMessage: string;
  rejectionMessage: string;
  accountDetails: string;
  loginCredentials: string;
  
  // Crypto Deposit
  cryptoDepositPending: string;
  cryptoDepositApproved: string;
  cryptoType: string;
  transactionHash: string;
  walletAddress: string;
  
  // Support
  newSupportTicket: string;
  newMessageOnTicket: string;
  ticketStatusUpdated: string;
  supportNotification: string;
  from: string;
  subject: string;
  message: string;
  pleaseLogin: string;
}

const translations: Record<SupportedLanguage, EmailTranslations> = {
  en: {
    // Common
    dear: 'Dear',
    securityNotice: 'Security Notice',
    contactUs: 'Contact Us',
    secureNotice: 'This is an automated message. Please do not reply directly to this email.',
    automatedMessage: 'This is an automated notification',
    confidentialityNotice: 'This email contains confidential information. If you received this email in error, please delete it immediately.',
    
    // 2FA
    loginVerification: 'Login Verification',
    loginVerificationDesc: 'A login attempt was detected on your account. Use the verification code below to complete your sign in:',
    codeExpiresIn: 'This code expires in',
    codeExpiresIn10: 'This code expires in 10 minutes',
    ipAddress: 'IP Address',
    location: 'Location',
    time: 'Time',
    didNotAttemptLogin: 'If you did not attempt to log in, please contact us immediately at',
    
    // Password Reset
    passwordReset: 'Password Reset',
    passwordResetDesc: 'We received a request to reset your password. Use the verification code below to complete your password reset:',
    codeExpiresIn15: 'This code expires in 15 minutes',
    didNotRequestReset: 'If you did not request a password reset, please ignore this email or contact us immediately at',
    
    // Email Verification
    emailVerification: 'Email Verification',
    emailVerificationDesc: 'Thank you for signing up. Please verify your email address by entering the following verification code:',
    verifyYourEmail: 'Verify Your Email',
    
    // Transfer Notifications
    transferSubmitted: 'Transfer Submitted',
    transferApproved: 'Transfer Approved',
    transferRejected: 'Transfer Rejected',
    domesticTransfer: 'Domestic Transfer',
    internationalTransfer: 'International Transfer',
    transferDetails: 'Transfer Details',
    amount: 'Amount',
    recipient: 'Recipient',
    recipientName: 'Recipient Name',
    recipientBank: 'Recipient Bank',
    recipientAccount: 'Recipient Account',
    referenceNumber: 'Reference Number',
    fromAccount: 'From Account',
    status: 'Status',
    pending: 'Pending',
    pendingReview: 'Pending Review',
    completed: 'Completed',
    approved: 'Approved',
    rejected: 'Rejected',
    processingTime: 'Processing Time',
    
    // Transaction Alerts
    creditAlert: 'Credit Alert',
    debitAlert: 'Debit Alert',
    accountCredited: 'Your account has been credited with the following transaction:',
    accountDebited: 'Your account has been debited with the following transaction:',
    newBalance: 'New Balance',
    transactionType: 'Transaction Type',
    description: 'Description',
    transactionNotification: 'Transaction Notification',
    transactionDate: 'Date & Time',
    didNotAuthorize: 'If you did not authorize this transaction, please contact us immediately at',
    
    // Application Decision
    applicationApproved: 'Application Approved',
    applicationRejected: 'Application Rejected',
    welcomeMessage: 'Welcome! Your account application has been approved.',
    rejectionMessage: 'We regret to inform you that your application has been declined.',
    accountDetails: 'Account Details',
    loginCredentials: 'Login Credentials',
    
    // Crypto Deposit
    cryptoDepositPending: 'Crypto Deposit Pending',
    cryptoDepositApproved: 'Crypto Deposit Approved',
    cryptoType: 'Cryptocurrency',
    transactionHash: 'Transaction Hash',
    walletAddress: 'Wallet Address',
    
    // Support
    newSupportTicket: 'New Support Ticket Created',
    newMessageOnTicket: 'New Message on Support Ticket',
    ticketStatusUpdated: 'Support Ticket Status Updated',
    supportNotification: 'Support Notification',
    from: 'From',
    subject: 'Subject',
    message: 'Message',
    pleaseLogin: 'Please log in to the dashboard to respond.',
  },
  
  zh: {
    // Common
    dear: '尊敬的',
    securityNotice: '安全通知',
    contactUs: '联系我们',
    secureNotice: '这是一封自动邮件，请勿直接回复。',
    automatedMessage: '这是一封自动通知',
    confidentialityNotice: '此邮件包含机密信息。如果您错误收到此邮件，请立即删除。',
    
    // 2FA
    loginVerification: '登录验证',
    loginVerificationDesc: '检测到您的账户有登录尝试。请使用以下验证码完成登录：',
    codeExpiresIn: '验证码有效期为',
    codeExpiresIn10: '此验证码将在10分钟后过期',
    ipAddress: 'IP地址',
    location: '位置',
    time: '时间',
    didNotAttemptLogin: '如果您没有尝试登录，请立即联系我们：',
    
    // Password Reset
    passwordReset: '密码重置',
    passwordResetDesc: '我们收到了重置您密码的请求。请使用以下验证码完成密码重置：',
    codeExpiresIn15: '此验证码将在15分钟后过期',
    didNotRequestReset: '如果您没有请求重置密码，请忽略此邮件或立即联系我们：',
    
    // Email Verification
    emailVerification: '邮箱验证',
    emailVerificationDesc: '感谢您的注册。请输入以下验证码验证您的邮箱地址：',
    verifyYourEmail: '验证您的邮箱',
    
    // Transfer Notifications
    transferSubmitted: '转账已提交',
    transferApproved: '转账已批准',
    transferRejected: '转账被拒绝',
    domesticTransfer: '国内转账',
    internationalTransfer: '国际转账',
    transferDetails: '转账详情',
    amount: '金额',
    recipient: '收款人',
    recipientName: '收款人姓名',
    recipientBank: '收款银行',
    recipientAccount: '收款账户',
    referenceNumber: '参考编号',
    fromAccount: '转出账户',
    status: '状态',
    pending: '待处理',
    pendingReview: '待审核',
    completed: '已完成',
    approved: '已批准',
    rejected: '已拒绝',
    processingTime: '处理时间',
    
    // Transaction Alerts
    creditAlert: '入账通知',
    debitAlert: '出账通知',
    accountCredited: '您的账户已收到以下交易入账：',
    accountDebited: '您的账户已发生以下交易扣款：',
    newBalance: '新余额',
    transactionType: '交易类型',
    description: '描述',
    transactionNotification: '交易通知',
    transactionDate: '日期和时间',
    didNotAuthorize: '如果您没有授权此交易，请立即联系我们：',
    
    // Application Decision
    applicationApproved: '申请已批准',
    applicationRejected: '申请被拒绝',
    welcomeMessage: '欢迎！您的账户申请已获批准。',
    rejectionMessage: '很遗憾，您的申请未获批准。',
    accountDetails: '账户详情',
    loginCredentials: '登录凭证',
    
    // Crypto Deposit
    cryptoDepositPending: '加密货币存款待处理',
    cryptoDepositApproved: '加密货币存款已批准',
    cryptoType: '加密货币类型',
    transactionHash: '交易哈希',
    walletAddress: '钱包地址',
    
    // Support
    newSupportTicket: '新工单已创建',
    newMessageOnTicket: '工单有新消息',
    ticketStatusUpdated: '工单状态已更新',
    supportNotification: '支持通知',
    from: '来自',
    subject: '主题',
    message: '消息',
    pleaseLogin: '请登录后台进行回复。',
  },
  
  es: {
    // Common
    dear: 'Estimado/a',
    securityNotice: 'Aviso de Seguridad',
    contactUs: 'Contáctenos',
    secureNotice: 'Este es un mensaje automático. Por favor, no responda directamente a este correo.',
    automatedMessage: 'Esta es una notificación automática',
    confidentialityNotice: 'Este correo contiene información confidencial. Si lo recibió por error, elimínelo inmediatamente.',
    
    // 2FA
    loginVerification: 'Verificación de Inicio de Sesión',
    loginVerificationDesc: 'Se detectó un intento de inicio de sesión en su cuenta. Use el código de verificación a continuación para completar su inicio de sesión:',
    codeExpiresIn: 'Este código expira en',
    codeExpiresIn10: 'Este código expira en 10 minutos',
    ipAddress: 'Dirección IP',
    location: 'Ubicación',
    time: 'Hora',
    didNotAttemptLogin: 'Si no intentó iniciar sesión, contáctenos inmediatamente en',
    
    // Password Reset
    passwordReset: 'Restablecimiento de Contraseña',
    passwordResetDesc: 'Recibimos una solicitud para restablecer su contraseña. Use el código de verificación a continuación:',
    codeExpiresIn15: 'Este código expira en 15 minutos',
    didNotRequestReset: 'Si no solicitó restablecer su contraseña, ignore este correo o contáctenos en',
    
    // Email Verification
    emailVerification: 'Verificación de Correo',
    emailVerificationDesc: 'Gracias por registrarse. Por favor, verifique su correo electrónico ingresando el siguiente código:',
    verifyYourEmail: 'Verifique su Correo',
    
    // Transfer Notifications
    transferSubmitted: 'Transferencia Enviada',
    transferApproved: 'Transferencia Aprobada',
    transferRejected: 'Transferencia Rechazada',
    domesticTransfer: 'Transferencia Nacional',
    internationalTransfer: 'Transferencia Internacional',
    transferDetails: 'Detalles de la Transferencia',
    amount: 'Monto',
    recipient: 'Destinatario',
    recipientName: 'Nombre del Destinatario',
    recipientBank: 'Banco Destinatario',
    recipientAccount: 'Cuenta Destinataria',
    referenceNumber: 'Número de Referencia',
    fromAccount: 'Cuenta de Origen',
    status: 'Estado',
    pending: 'Pendiente',
    pendingReview: 'Pendiente de Revisión',
    completed: 'Completado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    processingTime: 'Tiempo de Procesamiento',
    
    // Transaction Alerts
    creditAlert: 'Alerta de Crédito',
    debitAlert: 'Alerta de Débito',
    accountCredited: 'Su cuenta ha sido acreditada con la siguiente transacción:',
    accountDebited: 'Su cuenta ha sido debitada con la siguiente transacción:',
    newBalance: 'Nuevo Saldo',
    transactionType: 'Tipo de Transacción',
    description: 'Descripción',
    transactionNotification: 'Notificación de Transacción',
    transactionDate: 'Fecha y Hora',
    didNotAuthorize: 'Si no autorizó esta transacción, contáctenos inmediatamente en',
    
    // Application Decision
    applicationApproved: 'Solicitud Aprobada',
    applicationRejected: 'Solicitud Rechazada',
    welcomeMessage: '¡Bienvenido! Su solicitud de cuenta ha sido aprobada.',
    rejectionMessage: 'Lamentamos informarle que su solicitud ha sido rechazada.',
    accountDetails: 'Detalles de la Cuenta',
    loginCredentials: 'Credenciales de Acceso',
    
    // Crypto Deposit
    cryptoDepositPending: 'Depósito Cripto Pendiente',
    cryptoDepositApproved: 'Depósito Cripto Aprobado',
    cryptoType: 'Criptomoneda',
    transactionHash: 'Hash de Transacción',
    walletAddress: 'Dirección de Billetera',
    
    // Support
    newSupportTicket: 'Nuevo Ticket de Soporte Creado',
    newMessageOnTicket: 'Nuevo Mensaje en Ticket de Soporte',
    ticketStatusUpdated: 'Estado del Ticket Actualizado',
    supportNotification: 'Notificación de Soporte',
    from: 'De',
    subject: 'Asunto',
    message: 'Mensaje',
    pleaseLogin: 'Por favor, inicie sesión en el panel para responder.',
  },
  
  de: {
    // Common
    dear: 'Sehr geehrte/r',
    securityNotice: 'Sicherheitshinweis',
    contactUs: 'Kontaktieren Sie uns',
    secureNotice: 'Dies ist eine automatische Nachricht. Bitte antworten Sie nicht direkt auf diese E-Mail.',
    automatedMessage: 'Dies ist eine automatische Benachrichtigung',
    confidentialityNotice: 'Diese E-Mail enthält vertrauliche Informationen. Wenn Sie diese E-Mail irrtümlich erhalten haben, löschen Sie sie bitte sofort.',
    
    // 2FA
    loginVerification: 'Anmeldeverifizierung',
    loginVerificationDesc: 'Ein Anmeldeversuch wurde auf Ihrem Konto erkannt. Verwenden Sie den folgenden Verifizierungscode, um Ihre Anmeldung abzuschließen:',
    codeExpiresIn: 'Dieser Code läuft ab in',
    codeExpiresIn10: 'Dieser Code läuft in 10 Minuten ab',
    ipAddress: 'IP-Adresse',
    location: 'Standort',
    time: 'Zeit',
    didNotAttemptLogin: 'Wenn Sie keinen Anmeldeversuch unternommen haben, kontaktieren Sie uns sofort unter',
    
    // Password Reset
    passwordReset: 'Passwort Zurücksetzen',
    passwordResetDesc: 'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten. Verwenden Sie den folgenden Verifizierungscode:',
    codeExpiresIn15: 'Dieser Code läuft in 15 Minuten ab',
    didNotRequestReset: 'Wenn Sie kein Passwort-Zurücksetzen angefordert haben, ignorieren Sie diese E-Mail oder kontaktieren Sie uns unter',
    
    // Email Verification
    emailVerification: 'E-Mail-Verifizierung',
    emailVerificationDesc: 'Vielen Dank für Ihre Registrierung. Bitte verifizieren Sie Ihre E-Mail-Adresse mit folgendem Code:',
    verifyYourEmail: 'Verifizieren Sie Ihre E-Mail',
    
    // Transfer Notifications
    transferSubmitted: 'Überweisung Eingereicht',
    transferApproved: 'Überweisung Genehmigt',
    transferRejected: 'Überweisung Abgelehnt',
    domesticTransfer: 'Inlandsüberweisung',
    internationalTransfer: 'Auslandsüberweisung',
    transferDetails: 'Überweisungsdetails',
    amount: 'Betrag',
    recipient: 'Empfänger',
    recipientName: 'Empfängername',
    recipientBank: 'Empfängerbank',
    recipientAccount: 'Empfängerkonto',
    referenceNumber: 'Referenznummer',
    fromAccount: 'Von Konto',
    status: 'Status',
    pending: 'Ausstehend',
    pendingReview: 'In Prüfung',
    completed: 'Abgeschlossen',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    processingTime: 'Bearbeitungszeit',
    
    // Transaction Alerts
    creditAlert: 'Gutschrift-Benachrichtigung',
    debitAlert: 'Abbuchungs-Benachrichtigung',
    accountCredited: 'Ihrem Konto wurde folgende Transaktion gutgeschrieben:',
    accountDebited: 'Von Ihrem Konto wurde folgende Transaktion abgebucht:',
    newBalance: 'Neuer Kontostand',
    transactionType: 'Transaktionstyp',
    description: 'Beschreibung',
    transactionNotification: 'Transaktionsbenachrichtigung',
    transactionDate: 'Datum & Uhrzeit',
    didNotAuthorize: 'Wenn Sie diese Transaktion nicht autorisiert haben, kontaktieren Sie uns sofort unter',
    
    // Application Decision
    applicationApproved: 'Antrag Genehmigt',
    applicationRejected: 'Antrag Abgelehnt',
    welcomeMessage: 'Willkommen! Ihr Kontoantrag wurde genehmigt.',
    rejectionMessage: 'Wir bedauern, Ihnen mitteilen zu müssen, dass Ihr Antrag abgelehnt wurde.',
    accountDetails: 'Kontodetails',
    loginCredentials: 'Anmeldedaten',
    
    // Crypto Deposit
    cryptoDepositPending: 'Krypto-Einzahlung Ausstehend',
    cryptoDepositApproved: 'Krypto-Einzahlung Genehmigt',
    cryptoType: 'Kryptowährung',
    transactionHash: 'Transaktions-Hash',
    walletAddress: 'Wallet-Adresse',
    
    // Support
    newSupportTicket: 'Neues Support-Ticket Erstellt',
    newMessageOnTicket: 'Neue Nachricht im Support-Ticket',
    ticketStatusUpdated: 'Support-Ticket Status Aktualisiert',
    supportNotification: 'Support-Benachrichtigung',
    from: 'Von',
    subject: 'Betreff',
    message: 'Nachricht',
    pleaseLogin: 'Bitte melden Sie sich im Dashboard an, um zu antworten.',
  },
  
  fr: {
    // Common
    dear: 'Cher/Chère',
    securityNotice: 'Avis de Sécurité',
    contactUs: 'Contactez-nous',
    secureNotice: 'Ceci est un message automatique. Veuillez ne pas répondre directement à cet e-mail.',
    automatedMessage: 'Ceci est une notification automatique',
    confidentialityNotice: 'Cet e-mail contient des informations confidentielles. Si vous l\'avez reçu par erreur, veuillez le supprimer immédiatement.',
    
    // 2FA
    loginVerification: 'Vérification de Connexion',
    loginVerificationDesc: 'Une tentative de connexion a été détectée sur votre compte. Utilisez le code de vérification ci-dessous pour terminer votre connexion:',
    codeExpiresIn: 'Ce code expire dans',
    codeExpiresIn10: 'Ce code expire dans 10 minutes',
    ipAddress: 'Adresse IP',
    location: 'Localisation',
    time: 'Heure',
    didNotAttemptLogin: 'Si vous n\'avez pas tenté de vous connecter, contactez-nous immédiatement à',
    
    // Password Reset
    passwordReset: 'Réinitialisation du Mot de Passe',
    passwordResetDesc: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le code de vérification ci-dessous:',
    codeExpiresIn15: 'Ce code expire dans 15 minutes',
    didNotRequestReset: 'Si vous n\'avez pas demandé de réinitialisation, ignorez cet e-mail ou contactez-nous à',
    
    // Email Verification
    emailVerification: 'Vérification d\'E-mail',
    emailVerificationDesc: 'Merci de vous être inscrit. Veuillez vérifier votre adresse e-mail en entrant le code suivant:',
    verifyYourEmail: 'Vérifiez votre E-mail',
    
    // Transfer Notifications
    transferSubmitted: 'Transfert Soumis',
    transferApproved: 'Transfert Approuvé',
    transferRejected: 'Transfert Rejeté',
    domesticTransfer: 'Transfert National',
    internationalTransfer: 'Transfert International',
    transferDetails: 'Détails du Transfert',
    amount: 'Montant',
    recipient: 'Destinataire',
    recipientName: 'Nom du Destinataire',
    recipientBank: 'Banque Destinataire',
    recipientAccount: 'Compte Destinataire',
    referenceNumber: 'Numéro de Référence',
    fromAccount: 'Du Compte',
    status: 'Statut',
    pending: 'En Attente',
    pendingReview: 'En Cours de Révision',
    completed: 'Terminé',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    processingTime: 'Délai de Traitement',
    
    // Transaction Alerts
    creditAlert: 'Alerte de Crédit',
    debitAlert: 'Alerte de Débit',
    accountCredited: 'Votre compte a été crédité de la transaction suivante:',
    accountDebited: 'Votre compte a été débité de la transaction suivante:',
    newBalance: 'Nouveau Solde',
    transactionType: 'Type de Transaction',
    description: 'Description',
    transactionNotification: 'Notification de Transaction',
    transactionDate: 'Date et Heure',
    didNotAuthorize: 'Si vous n\'avez pas autorisé cette transaction, contactez-nous immédiatement à',
    
    // Application Decision
    applicationApproved: 'Demande Approuvée',
    applicationRejected: 'Demande Rejetée',
    welcomeMessage: 'Bienvenue! Votre demande de compte a été approuvée.',
    rejectionMessage: 'Nous regrettons de vous informer que votre demande a été refusée.',
    accountDetails: 'Détails du Compte',
    loginCredentials: 'Identifiants de Connexion',
    
    // Crypto Deposit
    cryptoDepositPending: 'Dépôt Crypto en Attente',
    cryptoDepositApproved: 'Dépôt Crypto Approuvé',
    cryptoType: 'Cryptomonnaie',
    transactionHash: 'Hash de Transaction',
    walletAddress: 'Adresse du Portefeuille',
    
    // Support
    newSupportTicket: 'Nouveau Ticket de Support Créé',
    newMessageOnTicket: 'Nouveau Message sur le Ticket de Support',
    ticketStatusUpdated: 'Statut du Ticket Mis à Jour',
    supportNotification: 'Notification de Support',
    from: 'De',
    subject: 'Sujet',
    message: 'Message',
    pleaseLogin: 'Veuillez vous connecter au tableau de bord pour répondre.',
  },
  
  ru: {
    // Common
    dear: 'Уважаемый(ая)',
    securityNotice: 'Уведомление о безопасности',
    contactUs: 'Свяжитесь с нами',
    secureNotice: 'Это автоматическое сообщение. Пожалуйста, не отвечайте на это письмо.',
    automatedMessage: 'Это автоматическое уведомление',
    confidentialityNotice: 'Это письмо содержит конфиденциальную информацию. Если вы получили его по ошибке, немедленно удалите его.',
    
    // 2FA
    loginVerification: 'Подтверждение входа',
    loginVerificationDesc: 'Обнаружена попытка входа в ваш аккаунт. Используйте код подтверждения ниже для завершения входа:',
    codeExpiresIn: 'Этот код действителен',
    codeExpiresIn10: 'Этот код действителен 10 минут',
    ipAddress: 'IP-адрес',
    location: 'Местоположение',
    time: 'Время',
    didNotAttemptLogin: 'Если вы не пытались войти в систему, немедленно свяжитесь с нами по адресу',
    
    // Password Reset
    passwordReset: 'Сброс пароля',
    passwordResetDesc: 'Мы получили запрос на сброс вашего пароля. Используйте код подтверждения ниже:',
    codeExpiresIn15: 'Этот код действителен 15 минут',
    didNotRequestReset: 'Если вы не запрашивали сброс пароля, проигнорируйте это письмо или свяжитесь с нами по адресу',
    
    // Email Verification
    emailVerification: 'Подтверждение email',
    emailVerificationDesc: 'Спасибо за регистрацию. Пожалуйста, подтвердите ваш email, введя следующий код:',
    verifyYourEmail: 'Подтвердите ваш email',
    
    // Transfer Notifications
    transferSubmitted: 'Перевод отправлен',
    transferApproved: 'Перевод одобрен',
    transferRejected: 'Перевод отклонен',
    domesticTransfer: 'Внутренний перевод',
    internationalTransfer: 'Международный перевод',
    transferDetails: 'Детали перевода',
    amount: 'Сумма',
    recipient: 'Получатель',
    recipientName: 'Имя получателя',
    recipientBank: 'Банк получателя',
    recipientAccount: 'Счет получателя',
    referenceNumber: 'Номер ссылки',
    fromAccount: 'Со счета',
    status: 'Статус',
    pending: 'В ожидании',
    pendingReview: 'На рассмотрении',
    completed: 'Завершено',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    processingTime: 'Время обработки',
    
    // Transaction Alerts
    creditAlert: 'Уведомление о зачислении',
    debitAlert: 'Уведомление о списании',
    accountCredited: 'На ваш счет поступила следующая транзакция:',
    accountDebited: 'С вашего счета списана следующая транзакция:',
    newBalance: 'Новый баланс',
    transactionType: 'Тип транзакции',
    description: 'Описание',
    transactionNotification: 'Уведомление о транзакции',
    transactionDate: 'Дата и время',
    didNotAuthorize: 'Если вы не авторизовали эту транзакцию, немедленно свяжитесь с нами по адресу',
    
    // Application Decision
    applicationApproved: 'Заявка одобрена',
    applicationRejected: 'Заявка отклонена',
    welcomeMessage: 'Добро пожаловать! Ваша заявка на открытие счета одобрена.',
    rejectionMessage: 'К сожалению, ваша заявка была отклонена.',
    accountDetails: 'Данные счета',
    loginCredentials: 'Данные для входа',
    
    // Crypto Deposit
    cryptoDepositPending: 'Крипто-депозит ожидает обработки',
    cryptoDepositApproved: 'Крипто-депозит одобрен',
    cryptoType: 'Криптовалюта',
    transactionHash: 'Хеш транзакции',
    walletAddress: 'Адрес кошелька',
    
    // Support
    newSupportTicket: 'Создан новый тикет поддержки',
    newMessageOnTicket: 'Новое сообщение в тикете поддержки',
    ticketStatusUpdated: 'Статус тикета обновлен',
    supportNotification: 'Уведомление поддержки',
    from: 'От',
    subject: 'Тема',
    message: 'Сообщение',
    pleaseLogin: 'Пожалуйста, войдите в панель управления для ответа.',
  },
  
  ja: {
    // Common
    dear: '拝啓',
    securityNotice: 'セキュリティ通知',
    contactUs: 'お問い合わせ',
    secureNotice: 'これは自動送信メッセージです。このメールに直接返信しないでください。',
    automatedMessage: 'これは自動通知です',
    confidentialityNotice: 'このメールには機密情報が含まれています。誤って受信された場合は、直ちに削除してください。',
    
    // 2FA
    loginVerification: 'ログイン認証',
    loginVerificationDesc: 'アカウントへのログイン試行が検出されました。以下の認証コードを使用してログインを完了してください：',
    codeExpiresIn: 'このコードの有効期限：',
    codeExpiresIn10: 'このコードは10分で有効期限が切れます',
    ipAddress: 'IPアドレス',
    location: '場所',
    time: '時刻',
    didNotAttemptLogin: 'ログインを試みていない場合は、直ちにご連絡ください：',
    
    // Password Reset
    passwordReset: 'パスワードリセット',
    passwordResetDesc: 'パスワードリセットのリクエストを受け取りました。以下の認証コードを使用してください：',
    codeExpiresIn15: 'このコードは15分で有効期限が切れます',
    didNotRequestReset: 'パスワードリセットをリクエストしていない場合は、このメールを無視するか、直ちにご連絡ください：',
    
    // Email Verification
    emailVerification: 'メール認証',
    emailVerificationDesc: 'ご登録ありがとうございます。以下の認証コードを入力してメールアドレスを確認してください：',
    verifyYourEmail: 'メールを確認する',
    
    // Transfer Notifications
    transferSubmitted: '送金リクエスト送信済み',
    transferApproved: '送金承認済み',
    transferRejected: '送金拒否',
    domesticTransfer: '国内送金',
    internationalTransfer: '国際送金',
    transferDetails: '送金詳細',
    amount: '金額',
    recipient: '受取人',
    recipientName: '受取人名',
    recipientBank: '受取銀行',
    recipientAccount: '受取口座',
    referenceNumber: '参照番号',
    fromAccount: '送金元口座',
    status: 'ステータス',
    pending: '保留中',
    pendingReview: '審査中',
    completed: '完了',
    approved: '承認済み',
    rejected: '拒否',
    processingTime: '処理時間',
    
    // Transaction Alerts
    creditAlert: '入金通知',
    debitAlert: '出金通知',
    accountCredited: 'お客様の口座に以下の入金がありました：',
    accountDebited: 'お客様の口座から以下の出金がありました：',
    newBalance: '新しい残高',
    transactionType: '取引タイプ',
    description: '説明',
    transactionNotification: '取引通知',
    transactionDate: '日時',
    didNotAuthorize: 'この取引を承認していない場合は、直ちにご連絡ください：',
    
    // Application Decision
    applicationApproved: '申請承認',
    applicationRejected: '申請却下',
    welcomeMessage: 'ようこそ！口座開設申請が承認されました。',
    rejectionMessage: '申し訳ございませんが、お申し込みは承認されませんでした。',
    accountDetails: '口座詳細',
    loginCredentials: 'ログイン情報',
    
    // Crypto Deposit
    cryptoDepositPending: '暗号資産入金保留中',
    cryptoDepositApproved: '暗号資産入金承認済み',
    cryptoType: '暗号資産',
    transactionHash: 'トランザクションハッシュ',
    walletAddress: 'ウォレットアドレス',
    
    // Support
    newSupportTicket: '新しいサポートチケット作成',
    newMessageOnTicket: 'サポートチケットに新しいメッセージ',
    ticketStatusUpdated: 'サポートチケットステータス更新',
    supportNotification: 'サポート通知',
    from: '送信者',
    subject: '件名',
    message: 'メッセージ',
    pleaseLogin: '返信するにはダッシュボードにログインしてください。',
  },
  
  pt: {
    // Common
    dear: 'Prezado(a)',
    securityNotice: 'Aviso de Segurança',
    contactUs: 'Contate-nos',
    secureNotice: 'Esta é uma mensagem automática. Por favor, não responda diretamente a este e-mail.',
    automatedMessage: 'Esta é uma notificação automática',
    confidentialityNotice: 'Este e-mail contém informações confidenciais. Se você o recebeu por engano, exclua-o imediatamente.',
    
    // 2FA
    loginVerification: 'Verificação de Login',
    loginVerificationDesc: 'Uma tentativa de login foi detectada na sua conta. Use o código de verificação abaixo para concluir seu login:',
    codeExpiresIn: 'Este código expira em',
    codeExpiresIn10: 'Este código expira em 10 minutos',
    ipAddress: 'Endereço IP',
    location: 'Localização',
    time: 'Hora',
    didNotAttemptLogin: 'Se você não tentou fazer login, entre em contato imediatamente em',
    
    // Password Reset
    passwordReset: 'Redefinição de Senha',
    passwordResetDesc: 'Recebemos uma solicitação para redefinir sua senha. Use o código de verificação abaixo:',
    codeExpiresIn15: 'Este código expira em 15 minutos',
    didNotRequestReset: 'Se você não solicitou a redefinição de senha, ignore este e-mail ou entre em contato em',
    
    // Email Verification
    emailVerification: 'Verificação de E-mail',
    emailVerificationDesc: 'Obrigado por se cadastrar. Por favor, verifique seu endereço de e-mail inserindo o seguinte código:',
    verifyYourEmail: 'Verifique seu E-mail',
    
    // Transfer Notifications
    transferSubmitted: 'Transferência Enviada',
    transferApproved: 'Transferência Aprovada',
    transferRejected: 'Transferência Rejeitada',
    domesticTransfer: 'Transferência Nacional',
    internationalTransfer: 'Transferência Internacional',
    transferDetails: 'Detalhes da Transferência',
    amount: 'Valor',
    recipient: 'Destinatário',
    recipientName: 'Nome do Destinatário',
    recipientBank: 'Banco Destinatário',
    recipientAccount: 'Conta Destinatária',
    referenceNumber: 'Número de Referência',
    fromAccount: 'Da Conta',
    status: 'Status',
    pending: 'Pendente',
    pendingReview: 'Em Análise',
    completed: 'Concluído',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    processingTime: 'Tempo de Processamento',
    
    // Transaction Alerts
    creditAlert: 'Alerta de Crédito',
    debitAlert: 'Alerta de Débito',
    accountCredited: 'Sua conta foi creditada com a seguinte transação:',
    accountDebited: 'Sua conta foi debitada com a seguinte transação:',
    newBalance: 'Novo Saldo',
    transactionType: 'Tipo de Transação',
    description: 'Descrição',
    transactionNotification: 'Notificação de Transação',
    transactionDate: 'Data e Hora',
    didNotAuthorize: 'Se você não autorizou esta transação, entre em contato imediatamente em',
    
    // Application Decision
    applicationApproved: 'Solicitação Aprovada',
    applicationRejected: 'Solicitação Rejeitada',
    welcomeMessage: 'Bem-vindo! Sua solicitação de conta foi aprovada.',
    rejectionMessage: 'Lamentamos informar que sua solicitação foi recusada.',
    accountDetails: 'Detalhes da Conta',
    loginCredentials: 'Credenciais de Login',
    
    // Crypto Deposit
    cryptoDepositPending: 'Depósito Cripto Pendente',
    cryptoDepositApproved: 'Depósito Cripto Aprovado',
    cryptoType: 'Criptomoeda',
    transactionHash: 'Hash da Transação',
    walletAddress: 'Endereço da Carteira',
    
    // Support
    newSupportTicket: 'Novo Ticket de Suporte Criado',
    newMessageOnTicket: 'Nova Mensagem no Ticket de Suporte',
    ticketStatusUpdated: 'Status do Ticket Atualizado',
    supportNotification: 'Notificação de Suporte',
    from: 'De',
    subject: 'Assunto',
    message: 'Mensagem',
    pleaseLogin: 'Por favor, faça login no painel para responder.',
  },
};

export function getEmailTranslations(language: string): EmailTranslations {
  const lang = (language || 'en') as SupportedLanguage;
  return translations[lang] || translations.en;
}

export function getSupportedLanguage(language: string): SupportedLanguage {
  const supported: SupportedLanguage[] = ['en', 'zh', 'es', 'de', 'fr', 'ru', 'ja', 'pt'];
  return supported.includes(language as SupportedLanguage) ? (language as SupportedLanguage) : 'en';
}
