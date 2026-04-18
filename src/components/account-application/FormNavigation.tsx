import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface FormNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isNextDisabled?: boolean;
}

export const FormNavigation = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSubmit,
  isSubmitting = false,
  isNextDisabled = false,
}: FormNavigationProps) => {
  const { t } = useTranslation();
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between gap-4 pt-6 border-t mt-8">
      <Button
        type="button"
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstStep || isSubmitting}
        className="gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('accountApplication.previous')}
      </Button>

      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('accountApplication.submitting')}
            </>
          ) : (
            t('accountApplication.submitApplication')
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={isNextDisabled || isSubmitting}
          className="gap-2"
        >
          {t('accountApplication.next')}
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
