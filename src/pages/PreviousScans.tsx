import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { Loader2, Calendar, User, Clock, GitCompare } from 'lucide-react';

export default function PreviousScans() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await sessionService.getPreviousSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSessionClick = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const handleSelectSession = (sessionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSessions(prev => [...prev, sessionId]);
    } else {
      setSelectedSessions(prev => prev.filter(id => id !== sessionId));
    }
  };

  const handleCompare = () => {
    if (selectedSessions.length >= 2) {
      navigate(`/session-comparison?ids=${selectedSessions.join(',')}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Previous Scans
            </h1>
            <p className="text-muted-foreground mt-1">Session history and records</p>
          </div>
          {selectedSessions.length >= 2 && (
            <Button onClick={handleCompare}>
              <GitCompare className="mr-2 h-4 w-4" />
              Compare {selectedSessions.length} Sessions
            </Button>
          )}
        </div>

        {/* Sessions Table */}
        <Card className="p-6 bg-card border-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No sessions yet</h3>
              <p className="text-muted-foreground">
                Session history will appear here after you run your first scan
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead className="text-foreground w-12">
                      <span className="sr-only">Select</span>
                    </TableHead>
                    <TableHead className="text-foreground">Session ID</TableHead>
                    <TableHead className="text-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Participant
                      </div>
                    </TableHead>
                    <TableHead className="text-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date
                      </div>
                    </TableHead>
                    <TableHead className="text-foreground">Protocol</TableHead>
                    <TableHead className="text-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration
                      </div>
                    </TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground">Steps Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(session => (
                    <TableRow 
                      key={session.id} 
                      className="border-border cursor-pointer hover:bg-secondary/50"
                      onClick={() => handleSessionClick(session.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedSessions.includes(session.id)}
                          onCheckedChange={(checked) => 
                            handleSelectSession(session.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {session.id}
                      </TableCell>
                      <TableCell>{session.config.participantId}</TableCell>
                      <TableCell>
                        <div>
                          <div>{formatDate(session.config.sessionDate)}</div>
                          {session.startTime && (
                            <div className="text-xs text-muted-foreground">
                              {formatTime(session.startTime)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {session.config.protocol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {calculateDuration(session.startTime, session.endTime)}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {session.stepHistory.filter(s => s.status === 'completed').length} /{' '}
                          {session.stepHistory.length}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
