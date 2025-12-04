import { SessionStep, SessionStepHistory } from '@/types/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Circle, AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerticalStepListProps {
  sessionSteps: SessionStep[];
  stepExecutionCounts: Map<SessionStep, number>;
  runningSteps: Set<SessionStep>;
  stepHistory: SessionStepHistory[];
  onRunStep: (step: SessionStep) => void;
  sessionInitialized: boolean;
}

export function VerticalStepList({
  sessionSteps,
  stepExecutionCounts,
  runningSteps,
  stepHistory,
  onRunStep,
  sessionInitialized,
}: VerticalStepListProps) {
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

  const completedCount = Array.from(stepExecutionCounts.values()).filter(count => count > 0).length;
  const progressPercentage = (completedCount / sessionSteps.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Session Workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {completedCount} of {sessionSteps.length} steps completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground">{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {sessionSteps.map((step, index) => {
          const status = getStepStatus(step);
          const executionCount = getStepExecutionCount(step);
          const latestHistory = getLatestStepHistory(step);
          const isDisabled = !sessionInitialized || status === 'running';

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                status === 'completed' && "bg-success/5 border-success/20",
                status === 'running' && "bg-primary/5 border-primary/20",
                status === 'pending' && "bg-card border-border hover:bg-secondary/50",
                latestHistory?.status === 'failed' && status !== 'running' && "bg-destructive/5 border-destructive/20"
              )}
            >
              {/* Step Number & Status Icon */}
              <div className="flex items-center gap-3 min-w-[120px]">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm",
                  status === 'completed' && "bg-success text-success-foreground",
                  status === 'running' && "bg-primary text-primary-foreground animate-pulse",
                  status === 'pending' && "bg-muted text-muted-foreground"
                )}>
                  {status === 'completed' && <CheckCircle2 className="h-5 w-5" />}
                  {status === 'running' && <Loader2 className="h-5 w-5 animate-spin" />}
                  {status === 'pending' && <span>{index + 1}</span>}
                  {latestHistory?.status === 'failed' && status !== 'running' && status !== 'completed' && (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground">{formatStepName(step)}</span>
              </div>

              {/* Status Badge */}
              <div className="flex-1">
                <Badge
                  variant="outline"
                  className={cn(
                    status === 'completed' && "bg-success/20 text-success border-success/30",
                    status === 'running' && "bg-primary/20 text-primary border-primary/30",
                    status === 'pending' && "bg-muted text-muted-foreground border-border",
                    latestHistory?.status === 'failed' && status !== 'running' && "bg-destructive/20 text-destructive border-destructive/30"
                  )}
                >
                  {status === 'completed' && `Completed (${executionCount}x)`}
                  {status === 'running' && 'Running...'}
                  {status === 'pending' && 'Pending'}
                  {latestHistory?.status === 'failed' && status !== 'running' && 'Failed'}
                </Badge>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => onRunStep(step)}
                disabled={isDisabled}
                size="sm"
                variant={status === 'completed' ? 'outline' : 'default'}
                className={cn(
                  status === 'completed' && "border-success/30 text-success hover:bg-success/10",
                  status === 'running' && "opacity-50 cursor-not-allowed"
                )}
              >
                {status === 'running' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running
                  </>
                ) : status === 'completed' ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Again
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Step
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
