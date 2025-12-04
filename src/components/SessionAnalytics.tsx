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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>
    </div>
  );
}
