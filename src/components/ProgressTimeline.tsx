import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { SessionStepHistory } from '@/types/session';
import { cn } from '@/lib/utils';

interface ProgressTimelineProps {
  history: SessionStepHistory[];
}

export function ProgressTimeline({ history }: ProgressTimelineProps) {
  const getStatusIcon = (status: SessionStepHistory['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: SessionStepHistory['status']) => {
    const variants = {
      completed: 'bg-success/20 text-success border-success/30',
      running: 'bg-primary/20 text-primary border-primary/30',
      failed: 'bg-destructive/20 text-destructive border-destructive/30',
      pending: 'bg-muted text-muted-foreground border-border',
    };

    return (
      <Badge variant="outline" className={variants[status]}>
        {status}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
  };

  const formatStepName = (step: string): string => {
    return step
      .replace(/_/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (history.length === 0) {
    return (
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Step History</h3>
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No steps executed yet.</p>
          <p className="text-sm mt-2">Start a session to see progress here.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Step History</h3>
        <div className="text-sm text-muted-foreground">
          {history.filter((h) => h.status === 'completed').length} / {history.length} completed
        </div>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {history.map((item, index) => {
            const timestamp = formatTimestamp(item.timestamp);
            const isLast = index === history.length - 1;

            return (
              <div key={index} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300',
                      item.status === 'completed' &&
                        'bg-success/10 border-success text-success shadow-lg shadow-success/20',
                      item.status === 'running' &&
                        'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10',
                      item.status === 'failed' &&
                        'bg-destructive/10 border-destructive text-destructive shadow-lg shadow-destructive/20',
                      item.status === 'pending' && 'bg-secondary border-border text-muted-foreground'
                    )}
                  >
                    {getStatusIcon(item.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-6 min-w-0">
                  <div className="bg-secondary/30 rounded-lg p-4 border border-border hover:bg-secondary/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{formatStepName(item.step)}</h4>
                          {getStatusBadge(item.status)}
                        </div>
                        {item.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-medium text-foreground">{timestamp.time}</div>
                        <div className="text-xs text-muted-foreground">{timestamp.date}</div>
                      </div>
                    </div>

                    {item.duration && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Duration: <span className="font-semibold text-foreground">{item.duration}s</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 w-0.5 h-6 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
