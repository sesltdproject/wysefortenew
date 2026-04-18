import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { StepIndicator } from '@/components/account-application/StepIndicator';
import { FormNavigation } from '@/components/account-application/FormNavigation';
import { PersonalInformationStep } from '@/components/account-application/PersonalInformationStep';
import { AccountDetailsStep } from '@/components/account-application/AccountDetailsStep';
import { IdentityVerificationStep } from '@/components/account-application/IdentityVerificationStep';
import { SecurityStep } from '@/components/account-application/SecurityStep';
import { ReviewAndSubmitStep } from '@/components/account-application/ReviewAndSubmitStep';
import { EmailVerificationStep } from '@/components/account-application/EmailVerificationStep';
import { AccountApplicationData, PersonalInformation, AccountDetails, IdentityVerification, Security, ReviewAndSubmit } from '@/types/accountApplication';
import { personalInformationSchema, accountDetailsSchema, identityVerificationSchema, securitySchema, reviewAndSubmitSchema } from '@/lib/accountApplicationSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import { useTranslation } from '@/i18n';

const LOCAL_STORAGE_KEY = 'account-application-draft';

export default function AccountApplication() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [showBackWarning, setShowBackWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    referenceNumber: string;
    email: string;
  } | null>(null);
  const personalForm = useForm<PersonalInformation>({
    resolver: zodResolver(personalInformationSchema),
    defaultValues: {
      title: '',
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: null,
      streetAddress: '',
      apartment: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phoneNumber: '',
      email: '',
      confirmEmail: ''
    }
  });
  const accountForm = useForm<AccountDetails>({
    resolver: zodResolver(accountDetailsSchema),
    defaultValues: {
      accountOwnership: 'individual',
      accountName: '',
      accountType: ''
    }
  });
  const identityForm = useForm<IdentityVerification>({
    resolver: zodResolver(identityVerificationSchema),
    defaultValues: {
      idType: '',
      idFullName: '',
      idNumber: '',
      idDocument: null,
      proofOfAddressType: '',
      proofOfAddressDate: null,
      proofOfAddressDocument: null
    }
  });
  const securityForm = useForm<Security>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      desiredUsername: '',
      securityCode: '',
      confirmSecurityCode: '',
      nextOfKinName: '',
      nextOfKinRelationship: '',
      nextOfKinPhone: '',
      nextOfKinEmail: '',
      nextOfKinAddress: '',
      marketingConsent: false
    }
  });
  const reviewForm = useForm<ReviewAndSubmit>({
    resolver: zodResolver(reviewAndSubmitSchema),
    defaultValues: {
      termsAccepted: false,
      accuracyConfirmed: false,
      electronicConsent: false
    }
  });
  const STEPS = [
    t('accountApplication.stepPersonalDetails'),
    t('accountApplication.stepEmailVerification'),
    t('accountApplication.stepAccountDetails'),
    t('accountApplication.stepIdentityVerification'),
    t('accountApplication.stepSecurity'),
    t('accountApplication.stepReview')
  ];

  // Reset all forms to initial state
  const resetAllForms = useCallback(() => {
    personalForm.reset({
      title: '',
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: null,
      streetAddress: '',
      apartment: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      phoneNumber: '',
      email: '',
      confirmEmail: ''
    });
    accountForm.reset({
      accountOwnership: 'individual',
      accountName: '',
      accountType: ''
    });
    identityForm.reset({
      idType: '',
      idFullName: '',
      idNumber: '',
      idDocument: null,
      proofOfAddressType: '',
      proofOfAddressDate: null,
      proofOfAddressDocument: null
    });
    securityForm.reset({
      desiredUsername: '',
      securityCode: '',
      confirmSecurityCode: '',
      nextOfKinName: '',
      nextOfKinRelationship: '',
      nextOfKinPhone: '',
      nextOfKinEmail: '',
      nextOfKinAddress: '',
      marketingConsent: false
    });
    reviewForm.reset({
      termsAccepted: false,
      accuracyConfirmed: false,
      electronicConsent: false
    });
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setCurrentStep(1);
  }, [personalForm, accountForm, identityForm, securityForm, reviewForm]);

  // Handle browser back button
  useEffect(() => {
    // Push a state to history when component mounts
    window.history.pushState({ applicationStep: currentStep }, '', location.pathname);

    const handlePopState = (event: PopStateEvent) => {
      // Prevent default navigation and show warning
      event.preventDefault();
      // Push state again to prevent actual navigation
      window.history.pushState({ applicationStep: currentStep }, '', location.pathname);
      setShowBackWarning(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentStep, location.pathname]);

  // Handle user confirming to leave
  const handleConfirmLeave = () => {
    setShowBackWarning(false);
    resetAllForms();
    toast({
      title: t('accountApplication.applicationReset'),
      description: t('accountApplication.applicationResetDescription'),
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.personalInformation) personalForm.reset(data.personalInformation);
        if (data.accountDetails) accountForm.reset(data.accountDetails);
        if (data.security) securityForm.reset(data.security);
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, []);
  const handleNext = async () => {
    let isValid = false;
    switch (currentStep) {
      case 1:
        isValid = await personalForm.trigger();
        if (isValid) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            personalInformation: personalForm.getValues()
          }));
          setCurrentStep(2);
        }
        break;
      case 2:
        // Email verification step - handled by the component
        break;
      case 3:
        isValid = await accountForm.trigger();
        if (isValid) setCurrentStep(4);
        break;
      case 4:
        isValid = await identityForm.trigger();
        if (isValid) setCurrentStep(5);
        break;
      case 5:
        isValid = await securityForm.trigger();
        if (isValid) setCurrentStep(6);
        break;
    }
  };
  const handleSubmit = async () => {
    const isValid = await reviewForm.trigger();
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const personal = personalForm.getValues();
      const account = accountForm.getValues();
      const identity = identityForm.getValues();
      const security = securityForm.getValues();
      const review = reviewForm.getValues();
      if (identity.idDocument) formData.append('idDocument', identity.idDocument);
      if (identity.proofOfAddressDocument) formData.append('proofDocument', identity.proofOfAddressDocument);
      // Helper to safely convert date values to ISO date strings
      const toDateString = (value: unknown): string | undefined => {
        if (!value) return undefined;
        if (value instanceof Date) return value.toISOString().split('T')[0];
        if (typeof value === 'string') {
          const d = new Date(value);
          return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : undefined;
        }
        return undefined;
      };

      const applicationData = {
        ...personal,
        ...account,
        ...identity,
        ...security,
        ...review,
        dateOfBirth: toDateString(personal.dateOfBirth),
        proofOfAddressDate: toDateString(identity.proofOfAddressDate)
      };
      formData.append('data', JSON.stringify(applicationData));
      const {
        data,
        error
      } = await supabase.functions.invoke('process-account-application', {
        body: formData
      });
      if (error) throw error;
      setSuccessData({
        referenceNumber: data.referenceNumber,
        email: personal.email
      });
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error: any) {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit application',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const applicationData: AccountApplicationData = {
    personalInformation: personalForm.getValues(),
    accountDetails: accountForm.getValues(),
    identityVerification: identityForm.getValues(),
    security: securityForm.getValues(),
    reviewAndSubmit: reviewForm.getValues()
  };
  return <>
    <Header />
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{t('accountApplication.pageTitle')}</h1>
          <p className="text-muted-foreground">{t('accountApplication.pageSubtitle')}</p>
        </div>

        <StepIndicator currentStep={currentStep} totalSteps={6} steps={STEPS} />

        <div className="bg-card rounded-lg shadow-lg p-6 md:p-8">
          {currentStep === 1 && <PersonalInformationStep form={personalForm} />}
          {currentStep === 2 && (
            <EmailVerificationStep 
              email={personalForm.getValues().email} 
              onVerified={() => setCurrentStep(3)}
              onSkip={() => setCurrentStep(3)}
            />
          )}
          {currentStep === 3 && <AccountDetailsStep form={accountForm} />}
          {currentStep === 4 && <IdentityVerificationStep form={identityForm} />}
          {currentStep === 5 && <SecurityStep form={securityForm} />}
          {currentStep === 6 && <ReviewAndSubmitStep form={reviewForm} applicationData={applicationData} onEditStep={setCurrentStep} />}

          {currentStep !== 2 && (
            <FormNavigation currentStep={currentStep} totalSteps={6} onPrevious={() => setCurrentStep(prev => Math.max(1, prev - 1))} onNext={handleNext} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          )}
        </div>
      </div>

      <Dialog open={!!successData} onOpenChange={() => successData && navigate('/')}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-success" />
            </div>
            <DialogTitle className="text-center text-2xl">{t('accountApplication.applicationReceived')}</DialogTitle>
            <DialogDescription className="text-center space-y-4">
              <p className="text-lg">
                {t('accountApplication.referenceNumber')}: <strong>{successData?.referenceNumber}</strong>
              </p>
              <p>
                {t('accountApplication.confirmationEmailSent')} <strong>{successData?.email}</strong>
              </p>
              <p className="text-sm">
                {t('accountApplication.applicationReviewMessage')}
              </p>
            </DialogDescription>
          </DialogHeader>
        <Button onClick={() => navigate('/')} className="w-full">{t('accountApplication.returnToHome')}</Button>
        </DialogContent>
      </Dialog>

      {/* Browser Back Button Warning Dialog */}
      <AlertDialog open={showBackWarning} onOpenChange={setShowBackWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accountApplication.leaveApplication')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accountApplication.leaveWarningMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('accountApplication.continueApplication')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('accountApplication.leaveAndReset')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </>;
}