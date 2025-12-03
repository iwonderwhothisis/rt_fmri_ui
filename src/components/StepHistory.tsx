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
import { SessionStepHistory } from '@/types/session';
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react';

interface StepHistoryProps {
  history: SessionStepHistory[];
}

export function StepHistory({ history }: StepHistoryProps) {
  const getStatusIcon = (status: SessionStepHistory['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
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
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Step History</h3>

      {history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No steps executed yet. Start a session to see progress.
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="text-foreground">Timestamp</TableHead>
                <TableHead className="text-foreground">Step</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">Duration</TableHead>
                <TableHead className="text-foreground">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item, index) => (
                <TableRow key={index} className="border-border">
                  <TableCell className="font-mono text-sm">
                    {formatTimestamp(item.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.step}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    {item.duration ? `${item.duration}s` : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {item.message || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
