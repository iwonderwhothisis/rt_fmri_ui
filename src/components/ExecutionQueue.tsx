import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { SessionStep } from '@/types/session';
import { cn } from '@/lib/utils';

export interface QueueItem {
  id: string;
  step: SessionStep;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface QueueItemCardProps {
  item: QueueItem;
  index: number;
  onRemove: (id: string) => void;
}

export function QueueItemCard({ item, index, onRemove }: QueueItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatStepName = (step: SessionStep): string => {
    return step
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusConfig = () => {
    switch (item.status) {
      case 'running':
        return {
          icon: Loader2,
          color: 'text-primary',
          bgColor: 'bg-primary/20',
          borderColor: 'border-primary/30',
          label: 'Running',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'text-success',
          bgColor: 'bg-success/20',
          borderColor: 'border-success/30',
          label: 'Completed',
        };
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-destructive',
          bgColor: 'bg-destructive/20',
          borderColor: 'border-destructive/30',
          label: 'Failed',
        };
      default:
        return {
          icon: Clock,
          color: 'text-muted-foreground',
          bgColor: 'bg-secondary/50',
          borderColor: 'border-border',
          label: 'Pending',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 flex items-center gap-3 border transition-all',
        statusConfig.bgColor,
        statusConfig.borderColor,
        isDragging && 'shadow-lg'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
          <span className="text-sm font-medium text-foreground">{formatStepName(item.step)}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <StatusIcon
            className={cn('h-3.5 w-3.5', statusConfig.color, item.status === 'running' && 'animate-spin')}
          />
          <span className={cn('text-xs', statusConfig.color)}>{statusConfig.label}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(item.id)}
        disabled={item.status === 'running'}
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  );
}

interface ExecutionQueueProps {
  items: QueueItem[];
  onRemove: (id: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
}

export function ExecutionQueue({ items, onRemove, onReorder }: ExecutionQueueProps) {
  if (items.length === 0) {
    return (
      <Card className="p-8 border-dashed border-2 border-border bg-secondary/30">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No items in queue</p>
          <p className="text-xs mt-1">Drag steps here to add them to the execution queue</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <QueueItemCard
          key={item.id}
          item={item}
          index={index}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
