import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Globe, Building, ArrowRight } from "lucide-react";
import { formatAmount } from "@/lib/utils";
import { TransferCodeVerification } from "./TransferCodeVerification";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n";

interface TransferProgressModalProps {
  open: boolean;
  onComplete: () => void;
  onCancel?: () => void;
  transferType: 'internal' | 'external' | 'international';
  transferData: {
    amount: number;
    recipientName?: string;
    bankName?: string;
    fromAccountType?: string;
    toAccountType?: string;
  };
  userId?: string;
}

interface TransferCode {
  enabled: boolean;
  name: string;
  value: string;
}

export const TransferProgressModal = ({ 
  open, 
  onComplete,
  onCancel,
  transferType, 
  transferData,
  userId
}: TransferProgressModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showCodeVerification, setShowCodeVerification] = useState(false);
  const [currentCodeIndex, setCurrentCodeIndex] = useState(0);
  const [transferCodes, setTransferCodes] = useState<TransferCode[]>([]);
  const [isProcessingCodes, setIsProcessingCodes] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [transferCodesLoaded, setTransferCodesLoaded] = useState(false);

  // Use refs for guards to avoid triggering effect re-runs
  const hasAnimationCompletedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Helper to clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Progress steps with translations - memoized to prevent recreation
  const steps = useMemo(() => {
    const allSteps = {
      internal: [
        { label: t('dashboard.validatingAccounts'), delay: 800 },
        { label: t('dashboard.processingTransferStep'), delay: 1200 },
        { label: t('dashboard.updatingBalances'), delay: 800 },
        { label: t('dashboard.transferCompletedStep'), delay: 500 }
      ],
      external: [
        { label: t('dashboard.validatingRecipientDetails'), delay: 1000 },
        { label: t('dashboard.processingWithExternalBank'), delay: 1500 },
        { label: t('dashboard.confirmingTransaction'), delay: 1000 },
        { label: t('dashboard.transferInitiated'), delay: 500 }
      ],
      international: [
        { label: t('dashboard.validatingSWIFTDetails'), delay: 1200 },
        { label: t('dashboard.complianceVerificationStep'), delay: 1500 },
        { label: t('dashboard.processingThroughSWIFT'), delay: 2000 },
        { label: t('dashboard.transferSubmittedForProcessing'), delay: 800 }
      ]
    };
    return allSteps[transferType];
  }, [transferType]); // Only recreate when transfer type changes, not on every t() call
  
  const totalSteps = steps.length;
  
  // Track if animation has started to prevent re-runs
  const hasAnimationStartedRef = useRef(false);

  // Fetch transfer codes for international transfers
  useEffect(() => {
    if (open && transferType === 'international' && userId) {
      fetchTransferCodes();
    } else if (open && transferType !== 'international') {
      setTransferCodesLoaded(true);
    }
  }, [open, transferType, userId]);

  const fetchTransferCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          transfer_code_1_enabled,
          transfer_code_1_name,
          transfer_code_1_value,
          transfer_code_2_enabled,
          transfer_code_2_name,
          transfer_code_2_value,
          transfer_code_3_enabled,
          transfer_code_3_name,
          transfer_code_3_value
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      const codes: TransferCode[] = [];
      for (let i = 1; i <= 3; i++) {
        const enabled = (data as any)[`transfer_code_${i}_enabled`];
        const name = (data as any)[`transfer_code_${i}_name`];
        const value = (data as any)[`transfer_code_${i}_value`];
        
        if (enabled && name && value) {
          codes.push({ enabled: !!enabled, name: String(name), value: String(value) });
        }
      }
      
      setTransferCodes(codes);
      setTransferCodesLoaded(true);
    } catch (error) {
      console.error('Error fetching transfer codes:', error);
      setTransferCodesLoaded(true);
    }
  };

  const handleCodeVerification = async (code: string): Promise<boolean> => {
    if (currentCodeIndex < transferCodes.length) {
      return code === transferCodes[currentCodeIndex].value;
    }
    return false;
  };

  const handleCodeSuccess = () => {
    const nextCodeIndex = currentCodeIndex + 1;
    
    if (nextCodeIndex < transferCodes.length) {
      // More codes to verify
      setCurrentCodeIndex(nextCodeIndex);
    } else {
      // All codes verified, continue with transfer
      setShowCodeVerification(false);
      setIsProcessingCodes(false);
      continueTransferProgress();
    }
  };

  const handleCodeCancel = () => {
    setIsCancelled(true);
    setShowCodeVerification(false);
    setIsProcessingCodes(false);
    
    toast({
      title: t('dashboard.transferCancelledTitle'),
      description: t('dashboard.transferCancelledDesc'),
      variant: "destructive",
    });
    
    if (onCancel) {
      onCancel();
    }
  };

  const continueTransferProgress = useCallback(() => {
    // Clear any existing timeouts before starting new ones
    clearAllTimeouts();
    
    let accumulatedDelay = 0;
    const complianceStepIndex = 1; // "Compliance verification" is the second step (index 1)

    steps.forEach((step, index) => {
      // Skip the compliance verification step delay since we handled it with codes
      if (index === complianceStepIndex) {
        accumulatedDelay += 500; // Short delay to show the step is complete
      } else {
        accumulatedDelay += step.delay;
      }
      
      const timeout = setTimeout(() => {
        // Don't update if already cancelled or completed
        if (hasAnimationCompletedRef.current) return;
        
        setCurrentStep(index + 1);
        setProgress(((index + 1) / totalSteps) * 100);
        
        if (index === totalSteps - 1) {
          setIsComplete(true);
          hasAnimationCompletedRef.current = true;
          // Complete after a brief pause to show final state
          const completeTimeout = setTimeout(() => {
            onCompleteRef.current();
          }, 1500);
          timeoutsRef.current.push(completeTimeout);
        }
      }, accumulatedDelay);
      
      timeoutsRef.current.push(timeout);
    });
  }, [steps, totalSteps, clearAllTimeouts]);

  // Main effect for running the progress animation
  useEffect(() => {
    if (!open) {
      // Reset all state when modal closes
      clearAllTimeouts();
      setCurrentStep(0);
      setProgress(0);
      setIsComplete(false);
      setShowCodeVerification(false);
      setCurrentCodeIndex(0);
      setIsProcessingCodes(false);
      setIsCancelled(false);
      setTransferCodesLoaded(false);
      hasAnimationCompletedRef.current = false;
      hasAnimationStartedRef.current = false;
      return;
    }

    // For international transfers, wait until codes are loaded
    if (transferType === 'international' && !transferCodesLoaded) {
      return;
    }

    // If cancelled, already completed, or already started, don't proceed
    if (isCancelled || hasAnimationCompletedRef.current || hasAnimationStartedRef.current) {
      return;
    }

    // Mark animation as started to prevent re-runs
    hasAnimationStartedRef.current = true;

    // Clear any previous timeouts when starting fresh
    clearAllTimeouts();

    if (transferType !== 'international' || transferCodes.length === 0) {
      // For non-international transfers or no codes, proceed normally
      let accumulatedDelay = 0;

      steps.forEach((step, index) => {
        accumulatedDelay += step.delay;
        
        const timeout = setTimeout(() => {
          // Check guards before updating state
          if (hasAnimationCompletedRef.current || isCancelled) return;
          
          setCurrentStep(index + 1);
          setProgress(((index + 1) / totalSteps) * 100);
          
          if (index === totalSteps - 1) {
            setIsComplete(true);
            hasAnimationCompletedRef.current = true;
            const completeTimeout = setTimeout(() => {
              if (!isCancelled) {
                onCompleteRef.current();
              }
            }, 1500);
            timeoutsRef.current.push(completeTimeout);
          }
        }, accumulatedDelay);
        
        timeoutsRef.current.push(timeout);
      });
    } else {
      // For international transfers with codes, start the process
      // First step: "Validating SWIFT details"
      const firstStepTimeout = setTimeout(() => {
        if (hasAnimationCompletedRef.current || isCancelled) return;
        
        setCurrentStep(1);
        setProgress((1 / totalSteps) * 100);
        
        // After first step, show code verification
        const codeTimeout = setTimeout(() => {
          if (hasAnimationCompletedRef.current || isCancelled) return;
          setIsProcessingCodes(true);
          setShowCodeVerification(true);
        }, 500);
        timeoutsRef.current.push(codeTimeout);
      }, steps[0].delay);
      
      timeoutsRef.current.push(firstStepTimeout);
    }

    // No cleanup here — clearing timeouts on dependency changes kills active animations.
    // The !open block above handles reset, and the unmount effect below handles cleanup.
  }, [open, transferType, transferCodesLoaded, isCancelled, clearAllTimeouts]);

  // Separate cleanup effect for when modal actually closes
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  const getTransferIcon = () => {
    switch (transferType) {
      case 'internal': return <ArrowRight className="h-8 w-8 text-primary" />;
      case 'external': return <Building className="h-8 w-8 text-primary" />;
      case 'international': return <Globe className="h-8 w-8 text-primary" />;
    }
  };

  const getTransferTitle = () => {
    switch (transferType) {
      case 'internal': return t('dashboard.processingInternalTransfer');
      case 'external': return t('dashboard.processingExternalTransfer');
      case 'international': return t('dashboard.processingInternationalTransfer');
    }
  };

  const currentCodeName = transferCodes[currentCodeIndex]?.name || '';

  return (
    <>
      <Dialog open={open && !showCodeVerification} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {getTransferIcon()}
              {getTransferTitle()}
            </DialogTitle>
            <DialogDescription>
              {t('dashboard.pleaseWaitProcessing')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Transfer Summary */}
            <div className="text-center p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">
                ${formatAmount(transferData.amount)}
              </div>
            <div className="text-sm text-muted-foreground">
                {transferType === 'internal' ? (
                  // Check if this is a Same Bank Transfer (has recipientName) or Between My Accounts (has account types)
                  transferData.recipientName 
                    ? `To ${transferData.recipientName}` 
                    : `${transferData.fromAccountType} → ${transferData.toAccountType}`
                ) : (
                  `To ${transferData.recipientName || 'Recipient'}`
                )}
              </div>
              {transferData.bankName && (
                <div className="text-xs text-muted-foreground mt-1">
                  {transferData.bankName}
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('dashboard.processingProgressLabel')}</span>
                <Badge variant="outline">
                  {Math.round(progress)}%
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Processing Steps */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                    index < currentStep
                      ? 'bg-green-50 text-green-700'
                      : index === currentStep - 1
                      ? isProcessingCodes && index === 1 // Compliance verification step
                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                        : 'bg-blue-50 text-blue-700'
                      : 'text-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : index === currentStep - 1 ? (
                    <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-sm font-medium">
                    {step.label}
                    {isProcessingCodes && index === 1 && (
                      <span className="text-xs block text-blue-600">{t('dashboard.waitingForVerificationCodes')}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Completion Message */}
            {isComplete && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">
                  {transferType === 'international' 
                    ? t('dashboard.transferSubmittedSuccess')
                    : t('dashboard.transferCompletedSuccess')
                  }
                </p>
                <p className="text-green-600 text-sm mt-1">
                  {t('dashboard.redirectingToConfirmation')}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Code Verification Modal */}
      <TransferCodeVerification
        open={showCodeVerification}
        codeName={currentCodeName}
        onSuccess={handleCodeSuccess}
        onCancel={handleCodeCancel}
        onVerify={handleCodeVerification}
      />
    </>
  );
};
