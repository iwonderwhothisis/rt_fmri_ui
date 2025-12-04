import { SessionStep, SessionStepHistory } from '@/types/session';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowTimelineProps {
  sessionSteps: SessionStep[];
  stepExecutionCounts: Map<SessionStep, number>;
  runningSteps: Set<SessionStep>;
  stepHistory: SessionStepHistory[];
  onRunStep: (step: SessionStep) => void;
  sessionInitialized: boolean;
}

export function WorkflowTimeline({
  sessionSteps,
  stepExecutionCounts,
  runningSteps,
  stepHistory,
  onRunStep,
  sessionInitialized,
}: WorkflowTimelineProps) {
  const formatStepName = (step: SessionStep): string => {
    return step
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStepStatus = (step: SessionStep) => {
    if (runningSteps.has(step)) return 'running';
    const count = stepExecutionCounts.get(step) || 0;
    if (count > 0) return 'completed';
    return 'pending';
  };

  const getStepExecutionCount = (step: SessionStep): number => {
    return stepExecutionCounts.get(step) || 0;
  };

  const getLatestStepHistory = (step: SessionStep): SessionStepHistory | undefined => {
    return stepHistory
      .filter(h => h.step === step)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex items-center gap-2 min-w-max px-4">
        {sessionSteps.map((step, index) => {
          const status = getStepStatus(step);
          const executionCount = getStepExecutionCount(step);
          const latestHistory = getLatestStepHistory(step);
          const isDisabled = !sessionInitialized || status === 'running';
          const isLast = index === sessionSteps.length - 1;

          return (
            <div key={step} className="flex items-center gap-2">
              {/* Step Node */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={() => onRunStep(step)}
                  disabled={isDisabled}
                  variant="outline"
                  size="lg"
                  className={cn(
                    "relative h-20 w-24 flex flex-col items-center justify-center gap-1 rounded-lg transition-all",
                    "hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
                    status === 'completed' && "bg-success/20 border-success/50 text-success hover:bg-success/30",
                    status === 'running' && "bg-primary/20 border-primary/50 text-primary animate-pulse",
                    status === 'pending' && "border-border hover:bg-secondary",
                    latestHistory?.status === 'failed' && "bg-destructive/20 border-destructive/50 text-destructive"
                  )}
                >
                  {status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  {status === 'running' && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                  {status === 'pending' && (
                    <Circle className="h-5 w-5" />
                  )}
                  {latestHistory?.status === 'failed' && status !== 'running' && (
                    <AlertCircle className="h-5 w-5" />
                  )}
                  <span className="text-xs font-medium text-center leading-tight px-1">
                    {formatStepName(step)}
                  </span>
                  {executionCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {executionCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="relative flex items-center w-16 md:w-24">
                  <div className={cn(
                    "h-0.5 w-full transition-colors",
                    status === 'completed' ? "bg-success" : "bg-border"
                  )} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
