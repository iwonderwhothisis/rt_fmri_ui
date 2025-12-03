import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { ArrowLeft, Download, Calendar, Clock, User } from 'lucide-react';
import { StepHistory } from '@/components/StepHistory';
import { BrainActivationMap } from '@/components/BrainActivationMap';
import { SessionAnalytics } from '@/components/SessionAnalytics';

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

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

  const handleExport = (format: 'json' | 'csv') => {
    if (!session) return;
    
    if (format === 'json') {
      const dataStr = JSON.stringify(session, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session_${session.id}_${session.config.sessionDate}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export for step history
      const headers = ['Step', 'Status', 'Timestamp', 'Duration (s)', 'Message'];
      const rows = session.stepHistory.map(step => [
        step.step,
        step.status,
        step.timestamp,
        step.duration?.toString() || '',
        step.message || ''
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session_${session.id}_steps.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

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
          <Button variant="ghost" onClick={() => navigate('/previous-scans')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Previous Scans
          </Button>
          <div className="text-center mt-12">
            <h2 className="text-2xl font-bold text-foreground">Session not found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/previous-scans')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Session {session.id}
              </h1>
              <p className="text-muted-foreground mt-1">Detailed analysis and reports</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('json')}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Session Overview */}
        <Card className="p-6 bg-card border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Participant</div>
                <div className="font-semibold text-foreground">{session.config.participantId}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-semibold text-foreground">{formatDate(session.config.sessionDate)}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Start Time</div>
                <div className="font-semibold text-foreground">
                  {session.startTime ? formatTime(session.startTime) : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Protocol</div>
                <Badge variant="outline" className="border-primary/30 text-primary mt-1">
                  {session.config.protocol}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Step History</TabsTrigger>
            <TabsTrigger value="brain">Brain Activation</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Session Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Run Number</div>
                  <div className="text-foreground">{session.config.psychopyConfig.runNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Display Feedback</div>
                  <div className="text-foreground">{session.config.psychopyConfig.displayFeedback}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Participant Anchor</div>
                  <div className="text-foreground">{session.config.psychopyConfig.participantAnchor}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Feedback Condition</div>
                  <div className="text-foreground">{session.config.psychopyConfig.feedbackCondition}</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Session Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
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
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Steps Completed:</span>
                  <span className="text-foreground">
                    {session.stepHistory.filter(s => s.status === 'completed').length} / {session.stepHistory.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span className="text-foreground">
                    {session.startTime && session.endTime
                      ? `${Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)} min`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="steps">
            <StepHistory history={session.stepHistory} />
          </TabsContent>
          
          <TabsContent value="brain">
            <BrainActivationMap sessionId={session.id} />
          </TabsContent>
          
          <TabsContent value="analytics">
            <SessionAnalytics session={session} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
