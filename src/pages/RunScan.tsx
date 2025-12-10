import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { SessionControls } from '@/components/SessionControls';
import { BrainScanPreview } from '@/components/BrainScanPreview';
import { WorkflowStepper, WorkflowStep } from '@/components/WorkflowStepper';
import { InitializeStep } from '@/components/InitializeStep';
import { InteractiveTerminal } from '@/components/InteractiveTerminal';
import { PsychoPyConfig, SessionConfig, SessionStepHistory, SessionStep, Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { QueueItem } from '@/components/ExecutionQueue';

export const sessionSteps: SessionStep[] = [
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
  // Terminal command history (managed internally by InteractiveTerminal, but we keep for persistence)
  const [murfiCommandHistory, setMurfiCommandHistory] = useState<string[]>([]);
  const [psychopyCommandHistory, setPsychopyCommandHistory] = useState<string[]>([]);
  const [executionQueue, setExecutionQueue] = useState<QueueItem[]>([]);
  const [queueStarted, setQueueStarted] = useState(false);
  const [queueStopped, setQueueStopped] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const stoppedItemsRef = useRef<Set<string>>(new Set());

  // Determine workflow step based on state
  const getCurrentWorkflowStep = (): WorkflowStep => {
    if (sessionInitialized) return 'execute';
    if (sessionConfig?.participantId && sessionConfig?.psychopyConfig) return 'execute';
    if (sessionConfig?.participantId && setupCompleted) return 'configure';
    if (sessionConfig?.participantId) return 'participant';
    if (murfiStarted && psychopyStarted && initializeConfirmed) return 'participant';
    return 'initialize';
  };

  const getCompletedWorkflowSteps = (): WorkflowStep[] => {
    const completed: WorkflowStep[] = [];
    if (murfiStarted && psychopyStarted && initializeConfirmed) completed.push('initialize');
    // Participant step is completed when participant is selected and setup is done
    if (sessionConfig?.participantId && setupCompleted) {
      completed.push('participant');
    }
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

  const handleParticipantSelect = (participantId: string, isNewParticipant: boolean = false) => {
    setSessionConfig({
      participantId,
      sessionDate: new Date().toISOString().split('T')[0],
      protocol: 'DMN-NFB',
      psychopyConfig,
    });
    setSetupCompleted(false);

    // If creating a new participant, run the create step
    if (isNewParticipant) {
      handleRunStep('create');
    }
  };

  const handleSetup = async () => {
    if (runningSteps.has('setup')) return;

    setRunningSteps(prev => new Set(prev).add('setup'));
    setIsRunning(true);

    try {
      // Start step
      const startedStep = await sessionService.startStep('setup');
      setStepHistory(prev => [...prev, startedStep]);

      // Simulate step execution
      const completedStep = await sessionService.completeStep('setup');
      setStepHistory(prev =>
        prev.map((s, i) => i === prev.length - 1 ? completedStep : s)
      );

      // Increment execution count for this step
      setStepExecutionCounts(prev => {
        const newCounts = new Map(prev);
        const currentCount = newCounts.get('setup') || 0;
        newCounts.set('setup', currentCount + 1);
        return newCounts;
      });

      setIsRunning(false);
      setRunningSteps(prev => {
        const next = new Set(prev);
        next.delete('setup');
        return next;
      });

      setSetupCompleted(true);
    setManualWorkflowStep('configure');
    } catch (error) {
      setRunningSteps(prev => {
        const next = new Set(prev);
        next.delete('setup');
        return next;
      });
      setIsRunning(false);
    }
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

    } catch (error) {
      setRunningSteps(prev => {
        const next = new Set(prev);
        next.delete(step);
        return next;
      });
      setIsRunning(false);
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
        return prev;
      }
      return [];
    });
  };

  const handleStop = () => {
    // Find the currently running item in the queue
    const runningItem = executionQueue.find(item => item.status === 'running');
    if (!runningItem) return;

    // Mark this item as stopped in the ref
    stoppedItemsRef.current.add(runningItem.id);

    // Mark the running item as failed
    setExecutionQueue(prev =>
      prev.map(item =>
        item.id === runningItem.id ? { ...item, status: 'failed' as const } : item
      )
    );

    // Pause execution
    setQueueStopped(true);

    // Remove from running steps
    setRunningSteps(prev => {
      const next = new Set(prev);
      next.delete(runningItem.step);
      return next;
    });

    setIsRunning(false);

    // Update the started step entry to failed in history
    setStepHistory(prev => {
      // Find the last entry for this step (should be the 'running' entry)
      let lastIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].step === runningItem.step) {
          lastIndex = i;
          break;
        }
      }

      if (lastIndex >= 0) {
        // Update the last entry for this step to failed
        return prev.map((s, i) =>
          i === lastIndex
            ? {
                ...s,
                status: 'failed' as const,
                message: 'Step was stopped by user',
                duration: s.duration || (Date.now() - new Date(s.timestamp).getTime()) / 1000
              }
            : s
        );
      } else {
        // If no entry exists, add a new failed entry
        return [...prev, {
          step: runningItem.step,
          status: 'failed' as const,
          timestamp: new Date().toISOString(),
          message: 'Step was stopped by user',
        }];
      }
    });
  };

  const handleResume = () => {
    setQueueStopped(false);
  };

  const handleStartQueue = () => {
    setQueueStarted(true);
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

      // Simulate step execution
      const completedStep = await sessionService.completeStep(item.step);

      // Check if this item was stopped using the ref (most reliable check)
      if (stoppedItemsRef.current.has(item.id)) {
        // Item was stopped - don't update anything, just return
        // Clean up the ref entry
        stoppedItemsRef.current.delete(item.id);
        return;
      }

      // Also check if item was stopped (marked as failed) in the queue state
      setExecutionQueue(prev => {
        const currentItem = prev.find(i => i.id === item.id);
        // If item was stopped (status is 'failed'), don't update history or queue
        if (currentItem?.status === 'failed') {
          // Clean up the ref entry if it exists
          stoppedItemsRef.current.delete(item.id);
          return prev; // Return unchanged - item was stopped
        }
        // Otherwise, update history and mark as completed
        setStepHistory(prevHistory =>
          prevHistory.map((s, i) => i === prevHistory.length - 1 ? completedStep : s)
        );
        // Mark as completed
        return prev.map(i =>
          i.id === item.id ? { ...i, status: 'completed' as const } : i
        );
      });

      // Item completed successfully - do cleanup and show success
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
    }
  }, []);

  // Auto-execution logic
  useEffect(() => {
    if (!queueStarted || !sessionInitialized || queueStopped) return;

    const pendingItem = executionQueue.find(item => item.status === 'pending');
    const runningItem = executionQueue.find(item => item.status === 'running');

    // If there's already a running item, don't start another
    if (runningItem) return;

    // If there's a pending item and nothing running, execute it
    if (pendingItem && !isRunning) {
      executeQueueItem(pendingItem);
    }
  }, [executionQueue, queueStarted, queueStopped, sessionInitialized, isRunning, executeQueueItem]);

  const handleStartSession = async () => {
    if (!sessionConfig) return;

    // Generate session ID by counting up from existing sessions
    const existingSessions = await sessionService.getPreviousSessions();
    let maxId = 0;

    // Find the highest session ID number
    for (const session of existingSessions) {
      const match = session.id.match(/^S(\d+)$/);
      if (match) {
        const idNum = parseInt(match[1], 10);
        if (idNum > maxId) {
          maxId = idNum;
        }
      }
    }

    // Generate next session ID (increment from max)
    const nextId = maxId + 1;
    const newSessionId = `S${nextId.toString().padStart(3, '0')}`;
    setSessionId(newSessionId);
    setSessionStartTime(new Date().toISOString());

    setSessionInitialized(true);
    setIsRunning(false);
    setStepHistory([]);
    setStepExecutionCounts(new Map());
    setRunningSteps(new Set());
    setExecutionQueue([]);
    setQueueStarted(false);
    setQueueStopped(false);
    stoppedItemsRef.current.clear();
    setSetupCompleted(false);
    setManualWorkflowStep(null);
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

        // Navigate to the session detail page
        navigate(`/session/${sessionId}`);
        return;
      } catch (error) {
        // Error saving session - silently fail
      }
    }

    // Reset everything
    setSessionConfig(null);
    setStepHistory([]);
    setSessionInitialized(false);
    setStepExecutionCounts(new Map());
    setRunningSteps(new Set());
    setExecutionQueue([]);
    setQueueStarted(false);
    setQueueStopped(false);
    stoppedItemsRef.current.clear();
    setSetupCompleted(false);
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
  };

  // Command execution handlers for terminals
  const handleMurfiCommand = async (command: string) => {
    setMurfiOutput(prev => [...prev, `$ ${command}`]);

    // Simulate command execution with delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Parse and simulate command responses
    const cmd = command.trim().toLowerCase();
    const parts = cmd.split(/\s+/);
    const baseCmd = parts[0];

    if (baseCmd === 'cd') {
      const path = parts[1] || '~';
      setMurfiOutput(prev => [...prev, `Changed directory to ${path}`]);
    } else if (baseCmd === 'ls' || baseCmd === 'dir') {
      setMurfiOutput(prev => [
        ...prev,
        'murfi_server.py',
        'config.yaml',
        'data/',
        'logs/',
        '✓ Command executed'
      ]);
    } else if (baseCmd === 'ps' || baseCmd === 'status') {
      if (murfiStarted) {
        setMurfiOutput(prev => [
          ...prev,
          'PID   CMD',
          '1234  python murfi_server.py --port 8080',
          '✓ Murfi server is running'
        ]);
      } else {
        setMurfiOutput(prev => [...prev, '✗ Murfi server is not running']);
      }
    } else if (baseCmd === 'pwd') {
      setMurfiOutput(prev => [...prev, '/path/to/murfi']);
    } else if (baseCmd === 'help') {
      setMurfiOutput(prev => [
        ...prev,
        'Available commands:',
        '  cd <path>     - Change directory',
        '  ls, dir       - List files',
        '  ps, status    - Check server status',
        '  pwd           - Print working directory',
        '  help          - Show this help',
        '  clear         - Clear terminal output'
      ]);
    } else if (baseCmd === 'clear') {
      setMurfiOutput([]);
    } else if (baseCmd === '') {
      // Empty command, do nothing
    } else {
      setMurfiOutput(prev => [
        ...prev,
        `✗ Command not found: ${baseCmd}`,
        'Type "help" for available commands'
      ]);
    }
  };

  const handlePsychoPyCommand = async (command: string) => {
    setPsychopyOutput(prev => [...prev, `$ ${command}`]);

    // Simulate command execution with delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Parse and simulate command responses
    const cmd = command.trim().toLowerCase();
    const parts = cmd.split(/\s+/);
    const baseCmd = parts[0];

    if (baseCmd === 'cd') {
      const path = parts[1] || '~';
      setPsychopyOutput(prev => [...prev, `Changed directory to ${path}`]);
    } else if (baseCmd === 'ls' || baseCmd === 'dir') {
      setPsychopyOutput(prev => [
        ...prev,
        'psychopy_runner.py',
        'experiment.psyexp',
        'data/',
        'stimuli/',
        '✓ Command executed'
      ]);
    } else if (baseCmd === 'ps' || baseCmd === 'status') {
      if (psychopyStarted) {
        setPsychopyOutput(prev => [
          ...prev,
          'PID   CMD',
          '5678  python psychopy_runner.py --display 0',
          '✓ PsychoPy is running'
        ]);
      } else {
        setPsychopyOutput(prev => [...prev, '✗ PsychoPy is not running']);
      }
    } else if (baseCmd === 'pwd') {
      setPsychopyOutput(prev => [...prev, '/path/to/psychopy']);
    } else if (baseCmd === 'help') {
      setPsychopyOutput(prev => [
        ...prev,
        'Available commands:',
        '  cd <path>     - Change directory',
        '  ls, dir       - List files',
        '  ps, status    - Check status',
        '  pwd           - Print working directory',
        '  help          - Show this help',
        '  clear         - Clear terminal output'
      ]);
    } else if (baseCmd === 'clear') {
      setPsychopyOutput([]);
    } else if (baseCmd === '') {
      // Empty command, do nothing
    } else {
      setPsychopyOutput(prev => [
        ...prev,
        `✗ Command not found: ${baseCmd}`,
        'Type "help" for available commands'
      ]);
    }
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
            onMurfiCommand={handleMurfiCommand}
            onPsychoPyCommand={handlePsychoPyCommand}
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
              onParticipantSelect={(id, isNew) => handleParticipantSelect(id, isNew)}
              selectedParticipantId={sessionConfig?.participantId}
              inline={false}
            />

            {sessionConfig?.participantId && !setupCompleted && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Setup Required</h3>
                    <p className="text-xs text-muted-foreground">
                      Complete setup before proceeding to configuration
                    </p>
                  </div>
                  <Button
                    onClick={handleSetup}
                    disabled={isRunning || runningSteps.has('setup')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {runningSteps.has('setup') ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Setup...
                      </>
                    ) : (
                      <>
                        Run Setup
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Terminals Section */}
            <div className="mt-6 pt-6 border-t border-border">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="terminals">
                  <AccordionTrigger className="text-sm font-semibold text-foreground">
                    System Terminals
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <InteractiveTerminal
                        name="Murfi"
                        output={murfiOutput}
                        onCommand={handleMurfiCommand}
                        isActive={murfiStarted}
                      />
                      <InteractiveTerminal
                        name="PsychoPy"
                        output={psychopyOutput}
                        onCommand={handlePsychoPyCommand}
                        isActive={psychopyStarted}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
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

              {/* Terminals Section */}
              <div className="pt-6 border-t border-border">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="terminals">
                    <AccordionTrigger className="text-sm font-semibold text-foreground">
                      System Terminals
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <InteractiveTerminal
                          name="Murfi"
                          output={murfiOutput}
                          onCommand={handleMurfiCommand}
                          isActive={murfiStarted}
                        />
                        <InteractiveTerminal
                          name="PsychoPy"
                          output={psychopyOutput}
                          onCommand={handlePsychoPyCommand}
                          isActive={psychopyStarted}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
                queueStarted={queueStarted}
                queueStopped={queueStopped}
                onStart={handleStartSession}
                onReset={handleReset}
                onAddToQueue={handleAddToQueue}
                onRemoveFromQueue={handleRemoveFromQueue}
                onReorderQueue={handleReorderQueue}
                onClearQueue={handleClearQueue}
                onStop={handleStop}
                onResume={handleResume}
                onStartQueue={handleStartQueue}
              />

              {/* Terminals Section */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">System Terminals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InteractiveTerminal
                    name="Murfi"
                    output={murfiOutput}
                    onCommand={handleMurfiCommand}
                    isActive={murfiStarted}
                  />
                  <InteractiveTerminal
                    name="PsychoPy"
                    output={psychopyOutput}
                    onCommand={handlePsychoPyCommand}
                    isActive={psychopyStarted}
                  />
                </div>
              </Card>
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
