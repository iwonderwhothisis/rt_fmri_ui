import { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { SessionCard } from '@/components/SessionCard';
import { Loader2, Calendar, User, Clock, GitCompare, Search, LayoutGrid, List, Filter } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PreviousScans() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [participantFilter, setParticipantFilter] = useState<string>('all');

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

  const handleSelectSession = (sessionId: string, selected: boolean) => {
    if (selected) {
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

  // Get unique participants for filter
  const participants = useMemo(() => {
    const unique = new Set(sessions.map((s) => s.config.participantId));
    return Array.from(unique).sort();
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          session.id.toLowerCase().includes(query) ||
          session.config.participantId.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && session.status !== statusFilter) {
        return false;
      }

      // Participant filter
      if (participantFilter !== 'all' && session.config.participantId !== participantFilter) {
        return false;
      }

      return true;
    });
  }, [sessions, searchQuery, statusFilter, participantFilter]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Previous Scans
            </h1>
            <p className="text-muted-foreground mt-1">Session history and records</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedSessions.length >= 2 && (
              <Button onClick={handleCompare} className="bg-primary hover:bg-primary/90">
                <GitCompare className="mr-2 h-4 w-4" />
                Compare {selectedSessions.length} Sessions
              </Button>
            )}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'table')}>
              <TabsList>
                <TabsTrigger value="grid">
                  <LayoutGrid className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="table">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-card border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions or participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-input border-border">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                </SelectContent>
              </Select>
              <Select value={participantFilter} onValueChange={setParticipantFilter}>
                <SelectTrigger className="w-[160px] bg-input border-border">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Participant" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Participants</SelectItem>
                  {participants.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Sessions Display */}
        {loading ? (
          <Card className="p-12 bg-card border-border">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card className="p-12 bg-card border-border">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {sessions.length === 0 ? 'No sessions yet' : 'No sessions match your filters'}
              </h3>
              <p className="text-muted-foreground">
                {sessions.length === 0
                  ? 'Session history will appear here after you run your first scan'
                  : 'Try adjusting your search or filter criteria'}
              </p>
            </div>
          </Card>
        ) : viewMode === 'grid' ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSessions.includes(session.id)}
                  onSelect={handleSelectSession}
                />
              ))}
            </div>
          </div>
        ) : (
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredSessions.length} of {sessions.length} sessions
              </p>
            </div>
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
                  {filteredSessions.map((session) => (
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
                          {session.stepHistory.filter((s) => s.status === 'completed').length} /{' '}
                          {session.stepHistory.length}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
