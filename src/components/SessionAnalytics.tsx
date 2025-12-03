import { Card } from '@/components/ui/card';
import { Session } from '@/types/session';
import { BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface SessionAnalyticsProps {
  session: Session;
}

export function SessionAnalytics({ session }: SessionAnalyticsProps) {
  const completedSteps = session.stepHistory.filter(s => s.status === 'completed');
  const failedSteps = session.stepHistory.filter(s => s.status === 'failed');
  const totalDuration = completedSteps.reduce((acc, step) => acc + (step.duration || 0), 0);
  const avgDuration = completedSteps.length > 0 ? totalDuration / completedSteps.length : 0;

  const stepDurations = session.stepHistory
    .filter(s => s.duration)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <div className="text-2xl font-bold text-foreground">{completedSteps.length}</div>
              <div className="text-xs text-muted-foreground">Steps Completed</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <div className="text-2xl font-bold text-foreground">{failedSteps.length}</div>
              <div className="text-xs text-muted-foreground">Steps Failed</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{totalDuration}s</div>
              <div className="text-xs text-muted-foreground">Total Duration</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-accent" />
            <div>
              <div className="text-2xl font-bold text-foreground">{avgDuration.toFixed(1)}s</div>
              <div className="text-xs text-muted-foreground">Avg Step Duration</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Step Duration Chart */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Step Duration Analysis
        </h3>
        <div className="space-y-3">
          {stepDurations.map((step, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground capitalize">{step.step.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-foreground">{step.duration}s</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{
                    width: `${((step.duration || 0) / Math.max(...stepDurations.map(s => s.duration || 0))) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Step Timeline */}
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Execution Timeline</h3>
        <div className="relative space-y-4">
          {session.stepHistory.map((step, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="relative">
                <div
                  className={`w-3 h-3 rounded-full ${
                    step.status === 'completed'
                      ? 'bg-success'
                      : step.status === 'failed'
                      ? 'bg-destructive'
                      : step.status === 'running'
                      ? 'bg-primary animate-pulse'
                      : 'bg-muted'
                  }`}
                />
                {idx < session.stepHistory.length - 1 && (
                  <div className="absolute top-3 left-1/2 w-px h-8 bg-border -translate-x-1/2" />
                )}
              </div>
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-foreground capitalize">
                    {step.step.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {step.message && (
                  <p className="text-sm text-muted-foreground">{step.message}</p>
                )}
                {step.duration && (
                  <p className="text-xs text-muted-foreground mt-1">Duration: {step.duration}s</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
