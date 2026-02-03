import { useState, useMemo } from 'react';
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
import { Play, RotateCcw, AlertCircle, Check, Square, GripVertical, Settings2 } from 'lucide-react';
import { SessionConfig, SessionStep } from '@/types/session';
import type { CommandsConfig, StepCategory } from '@/types/commands';
import { QueueItem } from '@/components/ExecutionQueue';
import { QueueItemCard } from '@/components/ExecutionQueue';
import { cn } from '@/lib/utils';
import { useButtonCommand } from '@/hooks/useButtonCommand';

interface SessionControlsProps {
  config: SessionConfig | null;
  isRunning: boolean;
  sessionInitialized: boolean;
  sessionSteps: SessionStep[];
  commandsConfig: CommandsConfig | null;
  queueItems: QueueItem[];
  onStart: () => void;
  onReset: () => void;
  onAddToQueue: (step: SessionStep) => void;
  onRemoveFromQueue: (id: string) => void;
  onReorderQueue: (startIndex: number, endIndex: number) => void;
  onClearQueue: () => void;
  onStop: () => void;
  onStartQueue: () => void;
  onRestart: () => void;
}

// Fallback step categories if config not loaded
const defaultStepCategories: StepCategory[] = [
  { name: 'Murfi', steps: ['2vol', 'resting_state', 'extract_rs_networks', 'process_roi_masks', 'register', 'cleanup'] },
  { name: 'PsychoPy', steps: ['feedback_no_15', 'feedback_yes_15', 'feedback_no_30', 'feedback_yes_30'] },
];

// Format step names for display - fallback formatting when config not available
const formatStepNameFallback = (step: string): string => {
  // Default formatting: replace underscores and capitalize
  return step
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function DraggableStepCard({ step, getStepName }: { step: SessionStep; getStepName: (step: string) => string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `step-${step}`,
    data: { type: 'step', step },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing border-border hover:border-primary/50 transition-all shrink-0',
        isDragging && 'opacity-50'
      )}
    >
      <div
        {...listeners}
        {...attributes}
        className="flex items-center gap-2"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground flex-1">
          {getStepName(step)}
        </span>
      </div>
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
  commandsConfig,
  queueItems,
  onStart,
  onReset,
  onAddToQueue,
  onRemoveFromQueue,
  onReorderQueue,
  onClearQueue,
  onStop,
  onStartQueue,
  onRestart,
}: SessionControlsProps) {
  const isConfigValid = config?.participantId && config?.psychopyConfig;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedStep, setDraggedStep] = useState<SessionStep | null>(null);

  // Derive step categories from step terminal fields
  const stepCategories = useMemo((): StepCategory[] => {
    if (!commandsConfig?.steps || sessionSteps.length === 0) {
      return defaultStepCategories;
    }

    // Group steps by their terminal field
    const terminalGroups: Record<string, string[]> = {};

    for (const step of sessionSteps) {
      const stepConfig = commandsConfig.steps[step];
      if (stepConfig) {
        const terminal = stepConfig.terminal;
        if (!terminalGroups[terminal]) {
          terminalGroups[terminal] = [];
        }
        terminalGroups[terminal].push(step);
      }
    }

    // Convert to StepCategory array, using system names from config
    return Object.entries(terminalGroups).map(([terminal, steps]) => ({
      name: commandsConfig.systems[terminal]?.name || terminal.charAt(0).toUpperCase() + terminal.slice(1),
      steps,
    }));
  }, [commandsConfig?.steps, commandsConfig?.systems, sessionSteps]);

  // Get step display name from config, with fallback formatting
  const getStepName = useMemo(() => {
    return (step: string): string => {
      // Try to get name from config
      if (commandsConfig?.steps[step]?.name) {
        return commandsConfig.steps[step].name;
      }
      // Fall back to default formatting
      return formatStepNameFallback(step);
    };
  }, [commandsConfig?.steps]);

  const startCmd = useButtonCommand('session.start');
  const resetCmd = useButtonCommand('session.reset');
  const startQueueCmd = useButtonCommand('session.startQueue');
  const stopCmd = useButtonCommand('session.stop');
  const finishCmd = useButtonCommand('session.finish');

  const handleStart = () => {
    onStart();
    startCmd.execute({ participantId: config?.participantId || '' });
  };

  const handleReset = () => {
    onReset();
    resetCmd.execute();
  };

  const handleStartQueue = () => {
    onStartQueue();
    startQueueCmd.execute();
  };

  const handleStop = () => {
    onStop();
    stopCmd.execute();
  };

  const handleFinish = () => {
    onReset();
    finishCmd.execute();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Check if dragging from available steps
    const stepData = active.data.current;
    if (stepData?.type === 'step') {
      setDraggedStep(stepData.step);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedStep(null);

    if (!over) return;

    const stepData = active.data.current;
    const isDraggingStep = stepData?.type === 'step';
    const isDraggingQueueItem = queueItems.some(item => item.id === active.id);
    const isOverQueueItem = queueItems.some(item => item.id === over.id);
    const isOverDropZone = over.id === 'queue-drop-zone';

    // If dropping a step (from available steps) into the queue area
    if (isDraggingStep && (isOverDropZone || isOverQueueItem)) {
      onAddToQueue(stepData.step);
      return;
    }

    // If reordering within queue (both active and over are queue items, and we're not dragging a step)
    if (!isDraggingStep && isDraggingQueueItem && isOverQueueItem && active.id !== over.id) {
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
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Card className="p-6 bg-card border-border">
        <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Session Controls
        </h3>

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
              onClick={handleStart}
              disabled={!isConfigValid}
              className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              size="lg"
            >
              <Play className="mr-2 h-5 w-5" />
              Start Session
            </Button>
          ) : null}

          {!sessionInitialized && (
            <Button
              onClick={handleReset}
              disabled={isRunning}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {sessionInitialized && (
          <div className="mt-6 space-y-6">
            {/* Available Steps Section */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Available Steps</h4>
              <div className="flex flex-col md:flex-row gap-6">
                {stepCategories.map((category) => (
                  <div key={category.name} className="flex-1">
                    <h5 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{category.name}</h5>
                    <div className={cn('gap-2 grid w-fit', category.name === 'PsychoPy' ? 'grid-cols-2' : 'grid-cols-3')}>
                      {category.steps.map((step) => (
                        <DraggableStepCard key={step} step={step as SessionStep} getStepName={getStepName} />
                      ))}
                    </div>
                  </div>
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
                        variant="default"
                        size="sm"
                        onClick={handleStartQueue}
                        className="h-7 bg-primary hover:bg-primary/90"
                        disabled={pendingCount === 0 || runningCount > 0}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStop}
                        className="h-7 text-destructive hover:text-destructive"
                        disabled={runningCount === 0}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Stop
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
                    <div className="flex flex-wrap gap-2">
                      {queueItems.map((item) => (
                        <QueueItemCard
                          key={item.id}
                          item={item}
                          onRemove={onRemoveFromQueue}
                          getStepName={getStepName}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </DroppableQueueZone>
            </div>

            {/* Finish & Restart Buttons */}
            {sessionInitialized && (
              <div className="pt-4 border-t border-border flex gap-3">
                <Button
                  onClick={handleFinish}
                  disabled={isRunning}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Finish
                </Button>
                <Button
                  onClick={onRestart}
                  disabled={isRunning}
                  variant="destructive"
                  size="lg"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restart
                </Button>
              </div>
            )}
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
                {getStepName(draggedStep)}
              </span>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
