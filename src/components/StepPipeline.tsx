import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, XCircle, Circle, ArrowRight, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { SessionStep, SessionStepHistory } from '@/types/session';
import { cn } from '@/lib/utils';

interface StepPipelineProps {
  steps: SessionStep[];
  stepHistory: SessionStepHistory[];
  runningSteps: Set<SessionStep>;
  stepExecutionCounts: Map<SessionStep, number>;
  onStepClick?: (step: SessionStep) => void;
}

export function StepPipeline({
  steps,
  stepHistory,
  runningSteps,
  stepExecutionCounts,
  onStepClick,
}: StepPipelineProps) {
  // Track expanded state for each step at the parent level
  const [expandedSteps, setExpandedSteps] = useState<Set<SessionStep>>(new Set());

  const toggleStepExpanded = (step: SessionStep) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) {
        next.delete(step);
      } else {
        next.add(step);
      }
      return next;
    });
  };

  const getStepStatus = (step: SessionStep) => {
    if (runningSteps.has(step)) return 'running';
    const history = stepHistory.filter((h) => h.step === step);
    if (history.length > 0) {
      const latest = history[history.length - 1];
      if (latest.status === 'completed') return 'completed';
      if (latest.status === 'failed') return 'failed';
      if (latest.status === 'running') return 'running';
    }
    return 'pending';
  };

  const formatStepName = (step: SessionStep): string => {
    return step
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStepIcon = (step: SessionStep) => {
    const status = getStepStatus(step);
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStepBadgeColor = (step: SessionStep) => {
    const status = getStepStatus(step);
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success border-success/30';
      case 'running':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'failed':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStepDuration = (step: SessionStep) => {
    const history = stepHistory.filter((h) => h.step === step);
    if (history.length > 0) {
      const latest = history[history.length - 1];
      return latest.duration;
    }
    return null;
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold mb-6 text-foreground">Session Pipeline</h3>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step);
          const executionCount = stepExecutionCounts.get(step) || 0;
          const duration = getStepDuration(step);
          const isClickable = onStepClick && status !== 'running';
          const stepExecutions = stepHistory.filter((h) => h.step === step);
          const isExpanded = expandedSteps.has(step);

          return (
            <StepPipelineItem
              key={step}
              step={step}
              index={index}
              status={status}
              executionCount={executionCount}
              duration={duration}
              isClickable={isClickable}
              stepExecutions={stepExecutions}
              isExpanded={isExpanded}
              onToggleExpand={() => toggleStepExpanded(step)}
              onStepClick={onStepClick}
              formatStepName={formatStepName}
              getStepIcon={getStepIcon}
              getStepBadgeColor={getStepBadgeColor}
              isLast={index === steps.length - 1}
            />
          );
        })}
      </div>
    </Card>
  );
}

interface StepPipelineItemProps {
  step: SessionStep;
  index: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executionCount: number;
  duration: number | null;
  isClickable: boolean;
  stepExecutions: SessionStepHistory[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStepClick?: (step: SessionStep) => void;
  formatStepName: (step: SessionStep) => string;
  getStepIcon: (step: SessionStep) => React.ReactNode;
  getStepBadgeColor: (step: SessionStep) => string;
  isLast: boolean;
}

function StepPipelineItem({
  step,
  index,
  status,
  executionCount,
  duration,
  isClickable,
  stepExecutions,
  isExpanded,
  onToggleExpand,
  onStepClick,
  formatStepName,
  getStepIcon,
  getStepBadgeColor,
  isLast,
}: StepPipelineItemProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="relative">
      <div className="flex items-start gap-4">
        {/* Step Number and Icon */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => isClickable && onStepClick?.(step)}
            disabled={!isClickable}
            className={cn(
              'relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300',
              status === 'completed' &&
                'bg-success/10 border-success text-success hover:bg-success/20 hover:scale-110 cursor-pointer',
              status === 'running' &&
                'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10',
              status === 'failed' &&
                'bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20 cursor-pointer',
              status === 'pending' &&
                'bg-secondary border-border text-muted-foreground cursor-not-allowed',
              isClickable && 'hover:scale-105'
            )}
          >
            {getStepIcon(step)}
          </button>
          {!isLast && (
            <div
              className={cn(
                'w-0.5 h-12 mt-2 transition-all duration-500',
                status === 'completed' ? 'bg-success' : 'bg-border'
              )}
            />
          )}
        </div>

        {/* Step Content */}
        <div className="flex-1 pt-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-semibold text-foreground">{formatStepName(step)}</h4>
                <Badge variant="outline" className={cn('text-xs', getStepBadgeColor(step))}>
                  {status}
                </Badge>
                {executionCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                    {executionCount} run{executionCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {duration && (
                <p className="text-sm text-muted-foreground">Latest duration: {duration}s</p>
              )}
              {stepExecutions.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {stepExecutions[stepExecutions.length - 1].message || 'No message'}
                </p>
              )}

              {/* Expandable execution history */}
              {executionCount > 1 && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleExpand}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Hide execution history
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show all {executionCount} executions
                      </>
                    )}
                  </Button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-border">
                      {stepExecutions.map((execution, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  execution.status === 'completed' && 'bg-success/20 text-success border-success/30',
                                  execution.status === 'failed' && 'bg-destructive/20 text-destructive border-destructive/30',
                                  execution.status === 'running' && 'bg-primary/20 text-primary border-primary/30'
                                )}
                              >
                                Run {idx + 1}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(execution.timestamp)}
                              </span>
                            </div>
                            {execution.duration && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {execution.duration}s
                              </div>
                            )}
                          </div>
                          {execution.message && (
                            <p className="text-sm text-foreground mt-1">{execution.message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!isLast && (
              <ArrowRight className="h-5 w-5 text-muted-foreground/50 mt-2 hidden md:block" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
