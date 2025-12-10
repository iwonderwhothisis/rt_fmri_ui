import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkflowStep = 'initialize' | 'participant' | 'configure' | 'execute';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  onStepClick?: (step: WorkflowStep) => void;
}

const steps: { id: WorkflowStep; label: string; description: string }[] = [
  { id: 'initialize', label: 'Initialize', description: 'Start Murfi & PsychoPy' },
  { id: 'participant', label: 'Participant', description: 'Select participant' },
  { id: 'configure', label: 'Configure', description: 'Configure PsychoPy settings' },
  { id: 'execute', label: 'Execute', description: 'Run session steps' },
];

export function WorkflowStepper({ currentStep, completedSteps, onStepClick }: WorkflowStepperProps) {
  const getStepStatus = (stepId: WorkflowStep) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (currentStep === stepId) return 'current';
    return 'upcoming';
  };

  const getStepIndex = (stepId: WorkflowStep) => {
    return steps.findIndex((s) => s.id === stepId);
  };

  return (
    <div className="w-full">
      <div className="relative flex items-center" style={{ minHeight: '40px' }}>
        {/* Connecting lines layer - positioned behind circles */}
        <div className="absolute inset-0 flex items-center pointer-events-none" style={{ top: '20px', transform: 'translateY(-50%)' }}>
          {steps.slice(0, -1).map((step, index) => {
            const stepIndex = getStepIndex(step.id);
            return (
              <div
                key={`line-${index}`}
                className="flex-1 h-0.5"
                style={{
                  marginLeft: 'calc(50% - 20px)',
                  marginRight: 'calc(50% - 20px)',
                }}
              >
                <div
                  className={cn(
                    'h-full w-full transition-all duration-500',
                    stepIndex < getStepIndex(currentStep) || completedSteps.includes(step.id)
                      ? 'bg-success'
                      : 'bg-border'
                  )}
                />
              </div>
            );
          })}
        </div>

        {/* Steps layer */}
        <div className="relative flex items-center w-full z-10">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isClickable = onStepClick && (status === 'completed' || status === 'current');

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 flex-shrink-0',
                    status === 'completed' &&
                      'bg-success border-success text-success-foreground cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-success/20',
                    status === 'current' &&
                      'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20 animate-pulse',
                    status === 'upcoming' &&
                      'bg-secondary border-border text-muted-foreground cursor-not-allowed',
                    isClickable && 'hover:scale-105'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold text-sm">{index + 1}</span>
                  )}
                </button>
                <div className="mt-2 text-center w-full px-2">
                  <div
                    className={cn(
                      'text-sm font-medium transition-colors',
                      status === 'current' && 'text-primary',
                      status === 'completed' && 'text-success',
                      status === 'upcoming' && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 hidden md:block">
                    {step.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
