import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { SessionControls } from '@/components/SessionControls';
import { StepHistory } from '@/components/StepHistory';
import { BrainScanPreview } from '@/components/BrainScanPreview';
import { WorkflowStepper, WorkflowStep } from '@/components/WorkflowStepper';
import { InitializeStep } from '@/components/InitializeStep';
import { PsychoPyConfig, SessionConfig, SessionStepHistory, SessionStep, Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { QueueItem } from '@/components/ExecutionQueue';

export const sessionSteps: SessionStep[] = [
  'create',
  'setup',
  '2vol',
  'resting_state',
  'extract_rs_networks',
  'process_roi_masks',
  'register',
  'feedback',
  'cleanup',
];

export default function RunScan() {
  const navigate = useNavigate();
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [psychopyConfig, setPsychopyConfig] = useState<PsychoPyConfig>({
    displayFeedback: 'Feedback',
    participantAnchor: 'toe',
    feedbackCondition: '15min',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [stepExecutionCounts, setStepExecutionCounts] = useState<Map<SessionStep, number>>(new Map());
  const [runningSteps, setRunningSteps] = useState<Set<SessionStep>>(new Set());
  const [stepHistory, setStepHistory] = useState<SessionStepHistory[]>([]);
  const [manualWorkflowStep, setManualWorkflowStep] = useState<WorkflowStep | null>(null);
  const [murfiStarted, setMurfiStarted] = useState(false);
  const [psychopyStarted, setPsychopyStarted] = useState(false);
  const [isStartingMurfi, setIsStartingMurfi] = useState(false);
  const [isStartingPsychoPy, setIsStartingPsychoPy] = useState(false);
  const [murfiOutput, setMurfiOutput] = useState<string[]>([]);
  const [psychopyOutput, setPsychopyOutput] = useState<string[]>([]);
  const [initializeConfirmed, setInitializeConfirmed] = useState(false);
  const [executionQueue, setExecutionQueue] = useState<QueueItem[]>([]);
  const [queuePaused, setQueuePaused] = useState(false);
  const [queueStarted, setQueueStarted] = useState(false);
  const { toast } = useToast();

  // Determine workflow step based on state
  const getCurrentWorkflowStep = (): WorkflowStep => {
    if (sessionInitialized) return 'execute';
    if (sessionConfig?.participantId && sessionConfig?.psychopyConfig) return 'execute';
    if (sessionConfig?.participantId) return 'configure';
    if (murfiStarted && psychopyStarted && initializeConfirmed) return 'participant';
    return 'initialize';
  };

  const getCompletedWorkflowSteps = (): WorkflowStep[] => {
    const completed: WorkflowStep[] = [];
    if (murfiStarted && psychopyStarted && initializeConfirmed) completed.push('initialize');
    if (sessionConfig?.participantId) completed.push('participant');
    if (sessionConfig?.participantId && sessionConfig?.psychopyConfig) completed.push('configure');
    if (sessionInitialized) completed.push('execute');
    return completed;
  };

  const calculatedWorkflowStep = getCurrentWorkflowStep();
  const workflowStep = manualWorkflowStep || calculatedWorkflowStep;
  const completedSteps = getCompletedWorkflowSteps();

  // Reset manual step when calculated step advances
  useEffect(() => {
    if (manualWorkflowStep && completedSteps.includes(calculatedWorkflowStep)) {
      setManualWorkflowStep(null);
    }
  }, [calculatedWorkflowStep, completedSteps, manualWorkflowStep]);

  const handleParticipantSelect = (participantId: string) => {
    setSessionConfig({
      participantId,
      sessionDate: new Date().toISOString().split('T')[0],
      protocol: 'DMN-NFB',
      psychopyConfig,
    });
    setManualWorkflowStep('configure');
  };

  const handlePsychoPyConfigChange = (config: PsychoPyConfig) => {
    setPsychopyConfig(config);
    if (sessionConfig) {
      setSessionConfig({
        ...sessionConfig,
        psychopyConfig: config,
      });
    }
  };

  const handleRunStep = async (step: SessionStep) => {
    if (runningSteps.has(step)) return;

    setRunningSteps(prev => new Set(prev).add(step));
    setIsRunning(true);

    try {
      // Start step
      const startedStep = await sessionService.startStep(step);
      setStepHistory(prev => [...prev, startedStep]);

      toast({
        title: `Starting ${step}`,
        description: 'Executing step...',
      });

      // Simulate step execution
      const completedStep = await sessionService.completeStep(step);
      setStepHistory(prev =>
        prev.map((s, i) => i === prev.length - 1 ? completedStep : s)
      );

      // Increment execution count for this step
      setStepExecutionCounts(prev => {
        const newCounts = new Map(prev);
        const currentCount = newCounts.get(step) || 0;
        newCounts.set(step, currentCount + 1);
        return newCounts;
      });

      setIsRunning(false);

      setRunningSteps(prev => {
        const next = new Set(prev);
        next.delete(step);
        return next;
      });

      toast({
        title: `${step} completed`,
        description: completedStep.message,
      });
    } catch (error) {
      setRunningSteps(prev => {
        const next = new Set(prev);
        next.delete(step);
        return next;
      });
      setIsRunning(false);
      toast({
        title: 'Step error',
        description: `An error occurred during ${step} execution`,
        variant: 'destructive',
      });
    }
  };

  // Queue management handlers
  const handleAddToQueue = (step: SessionStep) => {
    const newItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      step,
      status: 'pending',
    };
    setExecutionQueue(prev => [...prev, newItem]);
  };

  const handleRemoveFromQueue = (id: string) => {
    setExecutionQueue(prev => {
      const item = prev.find(i => i.id === id);
      // Don't allow removing running items
      if (item?.status === 'running') return prev;
      return prev.filter(i => i.id !== id);
    });
  };

  const handleReorderQueue = (startIndex: number, endIndex: number) => {
    setExecutionQueue(prev => {
      const newQueue = [...prev];
      const [removed] = newQueue.splice(startIndex, 1);
      newQueue.splice(endIndex, 0, removed);
      return newQueue;
    });
  };

  const handleClearQueue = () => {
    setExecutionQueue(prev => {
      // Only clear non-running items
      const hasRunning = prev.some(item => item.status === 'running');
      if (hasRunning) {
        toast({
          title: 'Cannot clear queue',
          description: 'Please wait for running items to complete',
          variant: 'destructive',
        });
        return prev;
      }
      return [];
    });
  };

  const handleTogglePause = () => {
    setQueuePaused(prev => !prev);
  };

  const handleStartQueue = () => {
    setQueueStarted(true);
    setQueuePaused(false);
    toast({
      title: 'Queue started',
      description: 'Execution will begin processing queued items',
    });
  };

  // Execute a queue item
  const executeQueueItem = useCallback(async (item: QueueItem) => {
    // Mark as running
    setExecutionQueue(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status: 'running' as const } : i))
    );

    setRunningSteps(prev => new Set(prev).add(item.step));
    setIsRunning(true);

    try {
      // Start step
      const startedStep = await sessionService.startStep(item.step);
      setStepHistory(prev => [...prev, startedStep]);

      toast({
        title: `Starting ${item.step}`,
        description: 'Executing step from queue...',
      });

      // Simulate step execution
      const completedStep = await sessionService.completeStep(item.step);
      setStepHistory(prev =>
        prev.map((s, i) => i === prev.length - 1 ? completedStep : s)
      );

      // Mark as completed
      setExecutionQueue(prev =>
        prev.map(i =>
          i.id === item.id ? { ...i, status: 'completed' as const } : i
        )
      );

      // Increment execution count for this step
      setStepExecutionCounts(prev => {
        const newCounts = new Map(prev);
        const currentCount = newCounts.get(item.step) || 0;
        newCounts.set(item.step, currentCount + 1);
        return newCounts;
      });

      setIsRunning(false);
      setRunningSteps(prev => {
        const next = new Set(prev);
        next.delete(item.step);
        return next;
      });

      toast({
        title: `${item.step} completed`,
        description: completedStep.message,
      });
    } catch (error) {
      // Mark as failed
      setExecutionQueue(prev =>
        prev.map(i =>
          i.id === item.id ? { ...i, status: 'failed' as const } : i
        )
      );

      setRunningSteps(prev => {
        const next = new Set(prev);
        next.delete(item.step);
        return next;
      });
      setIsRunning(false);
      toast({
        title: 'Step error',
        description: `An error occurred during ${item.step} execution`,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Auto-execution logic
  useEffect(() => {
    if (!queueStarted || queuePaused || !sessionInitialized) return;

    const pendingItem = executionQueue.find(item => item.status === 'pending');
    const runningItem = executionQueue.find(item => item.status === 'running');

    // If there's already a running item, don't start another
    if (runningItem) return;

    // If there's a pending item and nothing running, execute it
    if (pendingItem && !isRunning) {
      executeQueueItem(pendingItem);
    }
  }, [executionQueue, queueStarted, queuePaused, sessionInitialized, isRunning, executeQueueItem]);

  const handleStartSession = () => {
    if (!sessionConfig) return;

    // Generate session ID
    const newSessionId = `S${Date.now().toString().slice(-6)}`;
    setSessionId(newSessionId);
    setSessionStartTime(new Date().toISOString());

    setSessionInitialized(true);
    setIsRunning(false);
    setStepHistory([]);
    setStepExecutionCounts(new Map());
    setRunningSteps(new Set());
    setExecutionQueue([]);
    setQueuePaused(false);
    setQueueStarted(false);
    setManualWorkflowStep(null);

    toast({
      title: 'Session initialized',
      description: `Session ready for participant ${sessionConfig.participantId}. Drag steps to queue to execute.`,
    });
  };

  const handleStartMurfi = async () => {
    setIsStartingMurfi(true);
    setMurfiOutput([]);

    // Simulate running terminal commands for Murfi
    const commands = [
      'cd /path/to/murfi',
      'source activate murfi_env',
      'python murfi_server.py --port 8080',
    ];

    // Simulate command execution with output
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      setMurfiOutput(prev => [...prev, `$ ${command}`]);

      // Simulate command output
      await new Promise(resolve => setTimeout(resolve, 500));

      if (i === commands.length - 1) {
        setMurfiOutput(prev => [
          ...prev,
          'Murfi server starting...',
          'Listening on port 8080',
          'Real-time processing ready',
          '✓ Murfi started successfully'
        ]);
      } else {
        setMurfiOutput(prev => [...prev, '✓ Command executed']);
      }
    }

    setTimeout(() => {
      setMurfiStarted(true);
      setIsStartingMurfi(false);
      toast({
        title: 'Murfi started',
        description: 'Real-time fMRI processing system is now running',
      });
    }, 500);
  };

  const handleStartPsychoPy = async () => {
    setIsStartingPsychoPy(true);
    setPsychopyOutput([]);

    // Simulate running terminal commands for PsychoPy
    const commands = [
      'cd /path/to/psychopy',
      'source activate psychopy_env',
      'python psychopy_runner.py --display 0',
    ];

    // Simulate command execution with output
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      setPsychopyOutput(prev => [...prev, `$ ${command}`]);

      // Simulate command output
      await new Promise(resolve => setTimeout(resolve, 500));

      if (i === commands.length - 1) {
        setPsychopyOutput(prev => [
          ...prev,
          'PsychoPy Builder starting...',
          'Display initialized on screen 0',
          'Task presentation ready',
          '✓ PsychoPy started successfully'
        ]);
      } else {
        setPsychopyOutput(prev => [...prev, '✓ Command executed']);
      }
    }

    setTimeout(() => {
      setPsychopyStarted(true);
      setIsStartingPsychoPy(false);
      toast({
        title: 'PsychoPy started',
        description: 'Task presentation system is now running',
      });
    }, 500);
  };

  const handleReset = async () => {
    // If session was initialized and has data, save it before resetting
    if (sessionInitialized && sessionConfig && sessionId && sessionStartTime && stepHistory.length > 0) {
      try {
        const session: Session = {
          id: sessionId,
          config: sessionConfig,
          status: 'completed',
          stepHistory: stepHistory,
          startTime: sessionStartTime,
          endTime: new Date().toISOString(),
        };

        await sessionService.createSession(session);

        toast({
          title: 'Session saved',
          description: 'Session has been saved to previous scans',
        });

        // Navigate to the session detail page
        navigate(`/session/${sessionId}`);
        return;
      } catch (error) {
        toast({
          title: 'Error saving session',
          description: 'Failed to save session data',
          variant: 'destructive',
        });
      }
    }

    // Reset everything
    setSessionConfig(null);
    setStepHistory([]);
    setSessionInitialized(false);
    setStepExecutionCounts(new Map());
    setRunningSteps(new Set());
    setExecutionQueue([]);
    setQueuePaused(false);
    setQueueStarted(false);
    setIsRunning(false);
    setManualWorkflowStep(null);
    setMurfiStarted(false);
    setPsychopyStarted(false);
    setMurfiOutput([]);
    setPsychopyOutput([]);
    setInitializeConfirmed(false);
    setSessionId(null);
    setSessionStartTime(null);
    setPsychopyConfig({
      displayFeedback: 'Feedback',
      participantAnchor: 'toe',
      feedbackCondition: '15min',
    });
    toast({
      title: 'Session reset',
      description: 'Ready for new session',
    });
  };

  const handleWorkflowStepClick = (step: WorkflowStep) => {
    // Allow clicking on initialize step, participant step, configure step, or any completed step
    if (step === 'initialize' || step === 'participant' || step === 'configure' || completedSteps.includes(step)) {
      setManualWorkflowStep(step);
    }
  };

  const handleConfirmInitialize = () => {
    setInitializeConfirmed(true);
    setManualWorkflowStep('participant');
    toast({
      title: 'Initialization confirmed',
      description: 'Proceeding to participant selection',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            rt-fMRI Neurofeedback Control
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Guided workflow for neurofeedback sessions
          </p>
        </div>

        {/* Workflow Stepper */}
        <Card className="p-6 bg-card border-border">
          <WorkflowStepper
            currentStep={workflowStep}
            completedSteps={completedSteps}
            onStepClick={handleWorkflowStepClick}
          />
        </Card>

        {/* Main Content Based on Workflow Step */}
        {workflowStep === 'initialize' && (
          <InitializeStep
            murfiStarted={murfiStarted}
            psychopyStarted={psychopyStarted}
            onStartMurfi={handleStartMurfi}
            onStartPsychoPy={handleStartPsychoPy}
            isStartingMurfi={isStartingMurfi}
            isStartingPsychoPy={isStartingPsychoPy}
            murfiOutput={murfiOutput}
            psychopyOutput={psychopyOutput}
            onConfirmProceed={handleConfirmInitialize}
            canProceed={murfiStarted && psychopyStarted}
          />
        )}

        {workflowStep === 'participant' && (
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                2
              </span>
              Select Participant
            </h2>
            <p className="text-muted-foreground mb-6">
              Choose an existing participant or create a new one.
            </p>

            <ParticipantSelector
              onParticipantSelect={handleParticipantSelect}
              selectedParticipantId={sessionConfig?.participantId}
              inline={false}
            />
          </Card>
        )}

        {workflowStep === 'configure' && sessionConfig?.participantId && (
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                3
              </span>
              Configure PsychoPy Settings
            </h2>
            <p className="text-muted-foreground mb-6">
              Configure the PsychoPy settings for this session.
            </p>

            <div className="space-y-6">
              <PsychoPyConfigComponent
                config={psychopyConfig}
                onChange={handlePsychoPyConfigChange}
              />
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => {
                    handleStartSession();
                    setManualWorkflowStep('execute');
                  }}
                  disabled={!sessionConfig?.psychopyConfig}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Session & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {workflowStep === 'execute' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Controls and Status */}
            <div className="xl:col-span-2 space-y-6">
              <SessionControls
                config={sessionConfig}
                isRunning={isRunning}
                sessionInitialized={sessionInitialized}
                sessionSteps={sessionSteps}
                queueItems={executionQueue}
                queuePaused={queuePaused}
                queueStarted={queueStarted}
                onStart={handleStartSession}
                onReset={handleReset}
                onAddToQueue={handleAddToQueue}
                onRemoveFromQueue={handleRemoveFromQueue}
                onReorderQueue={handleReorderQueue}
                onClearQueue={handleClearQueue}
                onTogglePause={handleTogglePause}
                onStartQueue={handleStartQueue}
              />

              <StepHistory history={stepHistory} />
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              <BrainScanPreview isActive={isRunning || sessionInitialized} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
