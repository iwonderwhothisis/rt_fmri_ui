import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, CheckCircle2, AlertCircle, Play, ArrowRight } from 'lucide-react';
import { Session } from '@/types/session';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SessionCardProps {
  session: Session;
  isSelected?: boolean;
  onSelect?: (sessionId: string, selected: boolean) => void;
}

export function SessionCard({ session, isSelected, onSelect }: SessionCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    return `${minutes} min`;
  };

  const completedSteps = session.stepHistory.filter((s) => s.status === 'completed').length;
  const totalSteps = session.stepHistory.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const getStatusConfig = () => {
    switch (session.status) {
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'success',
          label: 'Completed',
          className: 'bg-success/20 text-success border-success/30',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'destructive',
          label: 'Error',
          className: 'bg-destructive/20 text-destructive border-destructive/30',
        };
      case 'running':
        return {
          icon: Play,
          color: 'primary',
          label: 'Running',
          className: 'bg-primary/20 text-primary border-primary/30',
        };
      default:
        return {
          icon: Clock,
          color: 'muted',
          label: 'Idle',
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      className={cn(
        'p-5 bg-card border-border hover:border-primary/50 transition-all duration-300 cursor-pointer group',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
      onClick={() => navigate(`/session/${session.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-mono font-semibold text-foreground text-lg">{session.id}</h3>
            <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>{session.config.participantId}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(session.config.sessionDate)}</span>
            </div>
          </div>
        </div>
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(session.id, e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold text-foreground">
            {completedSteps} / {totalSteps} steps
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 rounded-full',
              statusConfig.color === 'success' && 'bg-gradient-to-r from-success to-success/80',
              statusConfig.color === 'primary' && 'bg-gradient-to-r from-primary to-accent',
              statusConfig.color === 'destructive' && 'bg-gradient-to-r from-destructive to-destructive/80',
              statusConfig.color === 'muted' && 'bg-muted'
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded-lg bg-secondary/30">
          <div className="text-xs text-muted-foreground mb-1">Duration</div>
          <div className="text-sm font-semibold text-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {calculateDuration(session.startTime, session.endTime)}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-secondary/30">
          <div className="text-xs text-muted-foreground mb-1">Protocol</div>
          <div className="text-sm font-semibold text-foreground">{session.config.protocol}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {session.startTime && formatTime(session.startTime)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/session/${session.id}`);
          }}
        >
          View Details
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
