import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { SessionConfig, SessionStep } from '@/types/session';

interface SessionControlsProps {
  config: SessionConfig | null;
  isRunning: boolean;
  sessionInitialized: boolean;
  stepExecutionCounts: Map<SessionStep, number>;
  runningSteps: Set<SessionStep>;
  sessionSteps: SessionStep[];
  onStart: () => void;
  onRunStep: (step: SessionStep) => void;
  onRunAllRemaining: () => void;
  onReset: () => void;
}

export function SessionControls({
  config,
  isRunning,
  sessionInitialized,
  stepExecutionCounts,
  runningSteps,
  sessionSteps,
  onStart,
  onRunStep,
  onRunAllRemaining,
  onReset
}: SessionControlsProps) {
  const isConfigValid = config?.participantId && config?.psychopyConfig;

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

  const remainingStepsCount = sessionSteps.filter(
    step => !stepExecutionCounts.has(step) && !runningSteps.has(step)
  ).length;

  const totalExecutions = Array.from(stepExecutionCounts.values()).reduce((sum, count) => sum + count, 0);

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Session Controls</h3>

      {!isConfigValid && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertCircle className="h-4 w-4 text-warning" />
          <p className="text-sm text-warning">
            Please complete participant and PsychoPy configuration before starting
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {!sessionInitialized ? (
          <Button
            onClick={onStart}
            disabled={!isConfigValid}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            size="lg"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Session
          </Button>
        ) : (
          <Button
            onClick={onRunAllRemaining}
            disabled={remainingStepsCount === 0 || isRunning}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            size="lg"
          >
            <Play className="mr-2 h-5 w-5" />
            Run All Remaining ({remainingStepsCount})
          </Button>
        )}

        <Button
          onClick={onReset}
          disabled={isRunning}
          variant="outline"
          className="border-border hover:bg-secondary"
          size="lg"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      {sessionInitialized && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Session Steps</h4>
            <span className="text-xs text-muted-foreground">
              {stepExecutionCounts.size} / {sessionSteps.length} steps executed • {totalExecutions} total runs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sessionSteps.map((step) => {
              const status = getStepStatus(step);
              const executionCount = getStepExecutionCount(step);
              const isDisabled = status === 'running';

              return (
                <Button
                  key={step}
                  onClick={() => onRunStep(step)}
                  disabled={isDisabled}
                  variant={executionCount > 0 ? 'default' : 'outline'}
                  className={`
                    h-auto py-3 px-4 flex flex-col items-center gap-2
                    ${executionCount > 0
                      ? 'bg-success/20 text-success border-success/30 hover:bg-success/30'
                      : status === 'running'
                      ? 'bg-primary/20 text-primary border-primary/30'
                      : 'border-border hover:bg-secondary'
                    }
                    disabled:opacity-100 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center gap-2 w-full justify-center">
                    {executionCount > 0 && status !== 'running' && (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {status === 'running' && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span className="text-sm font-medium text-center">
                      {formatStepName(step)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {executionCount > 0 && status !== 'running' && (
                      <span className="text-xs font-semibold">
                        Run {executionCount}
                      </span>
                    )}
                    {executionCount === 0 && status !== 'running' && (
                      <span className="text-xs text-muted-foreground">Click to run</span>
                    )}
                    {status === 'running' && (
                      <span className="text-xs text-muted-foreground">Running...</span>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {isRunning && !sessionInitialized && (
        <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-success font-medium">
            Session running... Monitor progress in step history below
          </p>
        </div>
      )}
    </Card>
  );
}
