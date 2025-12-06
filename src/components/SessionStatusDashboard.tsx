import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { SessionStep, SessionStepHistory } from '@/types/session';
import { cn } from '@/lib/utils';

interface SessionStatusDashboardProps {
  isInitialized: boolean;
  isRunning: boolean;
  stepHistory: SessionStepHistory[];
  totalSteps: number;
  runningSteps: Set<SessionStep>;
}

export function SessionStatusDashboard({
  isInitialized,
  isRunning,
  stepHistory,
  totalSteps,
  runningSteps,
}: SessionStatusDashboardProps) {
  const completedSteps = stepHistory.filter((s) => s.status === 'completed').length;
  const failedSteps = stepHistory.filter((s) => s.status === 'failed').length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const totalDuration = stepHistory
    .filter((s) => s.duration)
    .reduce((acc, step) => acc + (step.duration || 0), 0);

  const getStatus = () => {
    if (!isInitialized) return { label: 'Not Started', color: 'muted', icon: Clock };
    if (isRunning || runningSteps.size > 0) return { label: 'Running', color: 'primary', icon: Activity };
    if (failedSteps > 0) return { label: 'Warning', color: 'destructive', icon: AlertCircle };
    if (completedSteps === totalSteps) return { label: 'Complete', color: 'success', icon: CheckCircle2 };
    return { label: 'In Progress', color: 'primary', icon: TrendingUp };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/80 border-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 text-${status.color}`} />
          Session Status
        </h3>
        <Badge
          variant="outline"
          className={cn(
            'font-semibold',
            status.color === 'success' && 'bg-success/20 text-success border-success/30',
            status.color === 'primary' && 'bg-primary/20 text-primary border-primary/30',
            status.color === 'destructive' && 'bg-destructive/20 text-destructive border-destructive/30',
            status.color === 'muted' && 'bg-muted text-muted-foreground border-border'
          )}
        >
          {status.label}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Progress Bar */}
        {isInitialized && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">
                {completedSteps} / {totalSteps} steps
              </span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out rounded-full relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-2xl font-bold text-success">{completedSteps}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-2xl font-bold text-primary">{runningSteps.size}</div>
            <div className="text-xs text-muted-foreground mt-1">Running</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <div className="text-2xl font-bold text-destructive">{failedSteps}</div>
            <div className="text-xs text-muted-foreground mt-1">Failed</div>
          </div>
        </div>

        {/* Duration */}
        {totalDuration > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Duration</span>
            </div>
            <span className="font-semibold text-foreground">{totalDuration}s</span>
          </div>
        )}
      </div>
    </Card>
  );
}
