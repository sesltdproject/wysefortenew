import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export const StepIndicator = ({ currentStep, totalSteps, steps }: StepIndicatorProps) => {
  // Create abbreviated versions for mobile
  const mobileSteps = [
    'Personal',
    'Account',
    'Identity',
    'Security',
    'Review'
  ];

  return (
    <div className="w-full py-4 md:py-8">
      <div className="flex items-center justify-between max-w-4xl mx-auto px-2 md:px-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={stepNumber} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-sm md:text-base transition-all duration-300 flex-shrink-0',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 md:ring-4 ring-primary/20',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-1.5 md:mt-2 text-[10px] md:text-sm font-medium text-center leading-tight px-0.5',
                    (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <span className="hidden md:inline">{step}</span>
                  <span className="md:hidden">{mobileSteps[index]}</span>
                </p>
              </div>
              
              {stepNumber < totalSteps && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1 md:mx-2 transition-all duration-300',
                    stepNumber < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
