import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { ArrowLeft, Clock, User, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react';
import { StepHistory } from '@/components/StepHistory';

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (sessionId) {
          const data = await sessionService.getSessionById(sessionId);
          setSession(data);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-[1800px] mx-auto">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Run Scan
          </Button>
          <div className="text-center mt-12">
            <h2 className="text-2xl font-bold text-foreground">Session not found</h2>
          </div>
        </div>
      </div>
    );
  }

  const completedSteps = session.stepHistory.filter((s) => s.status === 'completed').length;
  const failedSteps = session.stepHistory.filter((s) => s.status === 'failed').length;
  const totalSteps = session.stepHistory.length;
  const totalDuration = session.startTime && session.endTime
    ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
    : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Session {session.id}
          </h1>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Run Scan
          </Button>
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-card to-card/80 border-border shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <Badge
                  variant="outline"
                  className={
                    session.status === 'completed'
                      ? 'bg-success/20 text-success border-success/30 text-base px-3 py-1'
                      : session.status === 'error'
                      ? 'bg-destructive/20 text-destructive border-destructive/30 text-base px-3 py-1'
                      : 'bg-primary/20 text-primary border-primary/30 text-base px-3 py-1'
                  }
                >
                  {session.status}
                </Badge>
              </div>
              {session.status === 'completed' ? (
                <CheckCircle2 className="h-8 w-8 text-success" />
              ) : session.status === 'error' ? (
                <AlertCircle className="h-8 w-8 text-destructive" />
              ) : (
                <Clock className="h-8 w-8 text-primary" />
              )}
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-card to-card/80 border-border shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Progress</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {completedSteps} / {totalSteps}
                  </span>
                  {failedSteps > 0 && (
                    <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                      {failedSteps} failed
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">steps completed</div>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
              />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-card to-card/80 border-border shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Duration</div>
                <div className="text-2xl font-bold text-foreground">{totalDuration} min</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {session.startTime && formatTime(session.startTime)}
                </div>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-card to-card/80 border-border shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Participant</div>
                <div className="text-2xl font-bold text-foreground">{session.config.participantId}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(session.config.sessionDate)}
                </div>
              </div>
              <User className="h-8 w-8 text-success" />
            </div>
          </Card>
        </div>

        {/* Step History */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Step History</h3>
            <Badge variant="outline" className="ml-1 text-xs">
              {totalSteps}
            </Badge>
          </div>
          <StepHistory history={session.stepHistory} />
        </Card>
      </div>
    </div>
  );
}
