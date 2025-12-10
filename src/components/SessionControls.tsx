import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, RotateCcw, AlertCircle, Check, Pause, Trash2, GripVertical } from 'lucide-react';
import { SessionConfig, SessionStep } from '@/types/session';
import { QueueItem } from '@/components/ExecutionQueue';
import { QueueItemCard } from '@/components/ExecutionQueue';
import { cn } from '@/lib/utils';

interface SessionControlsProps {
  config: SessionConfig | null;
  isRunning: boolean;
  sessionInitialized: boolean;
  sessionSteps: SessionStep[];
  queueItems: QueueItem[];
  queuePaused: boolean;
  onStart: () => void;
  onReset: () => void;
  onAddToQueue: (step: SessionStep) => void;
  onRemoveFromQueue: (id: string) => void;
  onReorderQueue: (startIndex: number, endIndex: number) => void;
  onClearQueue: () => void;
  onTogglePause: () => void;
}

function DraggableStepCard({ step }: { step: SessionStep }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `step-${step}`,
    data: { type: 'step', step },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const formatStepName = (step: SessionStep): string => {
    return step
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing border-border hover:border-primary/50 transition-all',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground flex-1">
          {formatStepName(step)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 ml-6">
        Drag to queue
      </p>
    </Card>
  );
}

function DroppableQueueZone({ children, isOver }: { children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({
    id: 'queue-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[200px] p-4 rounded-lg border-2 border-dashed transition-colors',
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'
      )}
    >
      {children}
    </div>
  );
}

export function SessionControls({
  config,
  isRunning,
  sessionInitialized,
  sessionSteps,
  queueItems,
  queuePaused,
  onStart,
  onReset,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onClearQueue,
  onTogglePause,
}: SessionControlsProps) {
  const isConfigValid = config?.participantId && config?.psychopyConfig;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedStep, setDraggedStep] = useState<SessionStep | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const formatStepName = (step: SessionStep): string => {
    return step
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Check if dragging from available steps
    const stepData = active.data.current;
    if (stepData?.type === 'step') {
      setDraggedStep(stepData.step);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // This is handled automatically by dnd-kit
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedStep(null);

    if (!over) return;

    const stepData = active.data.current;

    // If dropping a step into the queue
    if (stepData?.type === 'step' && over.id === 'queue-drop-zone') {
      onAddToQueue(stepData.step);
      return;
    }

    // If reordering within queue
    if (active.id !== over.id && queueItems.some(item => item.id === active.id)) {
      const oldIndex = queueItems.findIndex(item => item.id === active.id);
      const newIndex = queueItems.findIndex(item => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorderQueue(oldIndex, newIndex);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedStep(null);
  };

  const pendingCount = queueItems.filter(item => item.status === 'pending').length;
  const runningCount = queueItems.filter(item => item.status === 'running').length;
  const completedCount = queueItems.filter(item => item.status === 'completed').length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Session Controls</h3>

        {!isConfigValid && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="h-4 w-4 text-warning" />
            <p className="text-sm text-warning">
              Please complete participant and PsychoPy configuration before starting
            </p>
          </div>
        )}

        <div className="flex gap-3">
          {!sessionInitialized ? (
            <Button
              onClick={onStart}
              disabled={!isConfigValid}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Session
            </Button>
          ) : null}

          <Button
            onClick={onReset}
            disabled={isRunning}
            variant="outline"
            className={sessionInitialized ? "flex-1" : ""}
            size="lg"
          >
            {sessionInitialized ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Finish
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </>
            )}
          </Button>
        </div>

        {sessionInitialized && (
          <div className="mt-6 space-y-6">
            {/* Available Steps Section */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Available Steps</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {sessionSteps.map((step) => (
                  <DraggableStepCard key={step} step={step} />
                ))}
              </div>
            </div>

            {/* Execution Queue Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Execution Queue</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {queueItems.length} items • {pendingCount} pending • {runningCount} running • {completedCount} completed
                  </span>
                  {queueItems.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onTogglePause}
                        className="h-7"
                      >
                        {queuePaused ? (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </>
                        ) : (
                          <>
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearQueue}
                        className="h-7 text-destructive hover:text-destructive"
                        disabled={runningCount > 0}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <DroppableQueueZone isOver={activeId !== null && draggedStep !== null}>
                {queueItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No items in queue</p>
                    <p className="text-xs mt-1">Drag steps here to add them to the execution queue</p>
                  </div>
                ) : (
                  <SortableContext items={queueItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {queueItems.map((item, index) => (
                        <QueueItemCard
                          key={item.id}
                          item={item}
                          index={index}
                          onRemove={onRemoveFromQueue}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </DroppableQueueZone>
            </div>
          </div>
        )}

        {isRunning && !sessionInitialized && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm text-success font-medium">
              Session running... Monitor progress in step history below
            </p>
          </div>
        )}
      </Card>

      <DragOverlay>
        {activeId && draggedStep ? (
          <Card className="p-3 border-primary bg-primary/10 shadow-lg">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {formatStepName(draggedStep)}
              </span>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
