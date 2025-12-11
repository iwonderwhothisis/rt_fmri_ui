import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Terminal } from 'lucide-react';

interface CompactTerminalPanelProps {
  title?: string;
  murfiOutput: string[];
  psychopyOutput: string[];
  murfiStarted: boolean;
  psychopyStarted: boolean;
  isStartingMurfi?: boolean;
  isStartingPsychoPy?: boolean;
  className?: string;
}

const formatStatus = (started: boolean, isStarting?: boolean) => {
  if (started) return 'Running';
  if (isStarting) return 'Starting...';
  return 'Idle';
};

const statusTone = (started: boolean, isStarting?: boolean) => {
  if (started) return 'bg-success/15 text-success border-success/20';
  if (isStarting) return 'bg-amber-500/15 text-amber-500 border-amber-500/25';
  return 'bg-muted text-muted-foreground border-border/60';
};

const renderLines = (lines: string[]) => {
  const compactLines = lines.slice(-5);

  if (compactLines.length === 0) {
    return <div className="text-muted-foreground/60">No output yet</div>;
  }

  return compactLines.map((line, index) => (
    <div key={index} className="truncate">
      {line.startsWith('$') ? (
        <span className="text-blue-300">{line}</span>
      ) : line.startsWith('✓') ? (
        <span className="text-green-300">{line}</span>
      ) : (
        <span>{line}</span>
      )}
    </div>
  ));
};

export function CompactTerminalPanel({
  title = 'System terminals',
  murfiOutput,
  psychopyOutput,
  murfiStarted,
  psychopyStarted,
  isStartingMurfi = false,
  isStartingPsychoPy = false,
  className,
}: CompactTerminalPanelProps) {
  return (
    <Card className={cn('p-4 md:p-5 border-dashed border-border/70 bg-card/60', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            {title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn('text-[11px] font-medium', statusTone(murfiStarted, isStartingMurfi))}>
            Murfi · {formatStatus(murfiStarted, isStartingMurfi)}
          </Badge>
          <Badge variant="outline" className={cn('text-[11px] font-medium', statusTone(psychopyStarted, isStartingPsychoPy))}>
            PsychoPy · {formatStatus(psychopyStarted, isStartingPsychoPy)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground">Murfi</div>
          <div className="rounded-lg border border-border/60 bg-black/90 text-green-200 font-mono text-[11px] leading-relaxed p-3 h-[140px] overflow-y-auto shadow-inner">
            {renderLines(murfiOutput)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground">PsychoPy</div>
          <div className="rounded-lg border border-border/60 bg-black/90 text-green-200 font-mono text-[11px] leading-relaxed p-3 h-[140px] overflow-y-auto shadow-inner">
            {renderLines(psychopyOutput)}
          </div>
        </div>
      </div>
    </Card>
  );
}
