import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function SessionComparison() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const ids = searchParams.get('ids')?.split(',') || [];
        const loadedSessions = await Promise.all(
          ids.map(id => sessionService.getSessionById(id))
        );
        setSessions(loadedSessions.filter(s => s !== null) as Session[]);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [searchParams]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  };

  const compareMetric = (values: number[]) => {
    if (values.length < 2) return null;
    const first = values[0];
    const last = values[values.length - 1];
    if (!Number.isFinite(first) || first === 0) return null;
    const change = ((last - first) / first) * 100;
    return Number.isFinite(change) ? change : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading comparison...</div>
      </div>
    );
  }

  if (sessions.length < 2) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-[1800px] mx-auto">
          <Button variant="ghost" onClick={() => navigate('/previous-scans')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Previous Scans
          </Button>
          <div className="text-center mt-12">
            <h2 className="text-2xl font-bold text-foreground">
              Please select at least 2 sessions to compare
            </h2>
          </div>
        </div>
      </div>
    );
  }

  const durations = sessions.map(s => calculateDuration(s.startTime, s.endTime));
  const completionRates = sessions.map((s) => {
    const total = s.stepHistory.length;
    if (total === 0) return 0;
    return (s.stepHistory.filter(st => st.status === 'completed').length / total) * 100;
  });
  const durationChange = compareMetric(durations);
  const completionChange = compareMetric(completionRates);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/previous-scans')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Session Comparison
            </h1>
            <p className="text-muted-foreground mt-1">
              Comparing {sessions.length} sessions for {sessions[0]?.config.participantId}
            </p>
          </div>
        </div>

        {/* Trend Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Session Duration Trend</div>
                <div className="text-3xl font-bold text-foreground">
                  {durations[durations.length - 1]} min
                </div>
              </div>
              {durationChange !== null && (
                <div className="flex items-center gap-2">
                  {durationChange > 0 ? (
                    <TrendingUp className="h-6 w-6 text-destructive" />
                  ) : durationChange < 0 ? (
                    <TrendingDown className="h-6 w-6 text-success" />
                  ) : (
                    <Minus className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span
                    className={
                      durationChange > 0
                        ? 'text-destructive'
                        : durationChange < 0
                        ? 'text-success'
                        : 'text-muted-foreground'
                    }
                  >
                    {Math.abs(durationChange).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Completion Rate Trend</div>
                <div className="text-3xl font-bold text-foreground">
                  {completionRates[completionRates.length - 1].toFixed(0)}%
                </div>
              </div>
              {completionChange !== null && (
                <div className="flex items-center gap-2">
                  {completionChange > 0 ? (
                    <TrendingUp className="h-6 w-6 text-success" />
                  ) : completionChange < 0 ? (
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  ) : (
                    <Minus className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span
                    className={
                      completionChange > 0
                        ? 'text-success'
                        : completionChange < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }
                  >
                    {Math.abs(completionChange).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Session Comparison Table */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Side-by-Side Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Metric
                  </th>
                  {sessions.map((session, idx) => (
                    <th key={idx} className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      {session.id}
                      <div className="text-xs font-normal text-muted-foreground">
                        {formatDate(session.config.sessionDate)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">Status</td>
                  {sessions.map((session, idx) => (
                    <td key={idx} className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={
                          session.status === 'completed'
                            ? 'bg-success/20 text-success border-success/30'
                            : session.status === 'error'
                            ? 'bg-destructive/20 text-destructive border-destructive/30'
                            : 'bg-primary/20 text-primary border-primary/30'
                        }
                      >
                        {session.status}
                      </Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">Duration</td>
                  {sessions.map((session, idx) => (
                    <td key={idx} className="py-3 px-4 text-sm text-foreground">
                      {calculateDuration(session.startTime, session.endTime)} min
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">Steps Completed</td>
                  {sessions.map((session, idx) => (
                    <td key={idx} className="py-3 px-4 text-sm text-foreground">
                      {session.stepHistory.filter(s => s.status === 'completed').length} /{' '}
                      {session.stepHistory.length}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">Protocol</td>
                  {sessions.map((session, idx) => (
                    <td key={idx} className="py-3 px-4">
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        {session.config.protocol}
                      </Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">Feedback Mode</td>
                  {sessions.map((session, idx) => (
                    <td key={idx} className="py-3 px-4 text-sm text-foreground">
                      {session.config.psychopyConfig.displayFeedback}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Performance Over Time */}
        <Card className="p-6 bg-card border-border">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Performance Progression</h3>
          <div className="bg-secondary/20 rounded-lg p-8 border border-border border-dashed">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Timeline chart showing performance metrics across sessions</p>
              <p className="text-xs mt-2">
                Would integrate with charting library (e.g., Recharts, Chart.js)
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
