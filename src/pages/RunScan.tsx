import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { SessionControls } from '@/components/SessionControls';
import { BrainScanPreview } from '@/components/BrainScanPreview';
import { WorkflowStepper, WorkflowStep } from '@/components/WorkflowStepper';
import { InitializeStep } from '@/components/InitializeStep';
import { XTerminal, TerminalHandle } from '@/components/XTerminal';
import { PsychoPyConfig, SessionConfig, SessionStepHistory, SessionStep, Session } from '@/types/session';
import type { TerminalStatus } from '@/types/terminal';
import type { CommandsConfig } from '@/types/commands';
import { useTerminalCommand } from '@/contexts/TerminalCommandContext';
import { sessionService } from '@/services/mockSessionService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, ChevronDown, Loader2, Terminal } from 'lucide-react';
import { QueueItem } from '@/components/ExecutionQueue';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { buildApiUrl } from '@/lib/apiBase';

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
  const { registerTerminal, unregisterTerminal, executeButtonCommand, executeTrackedCommand } = useTerminalCommand();
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
  const [murfiSessionActive, setMurfiSessionActive] = useState(false);
  const [psychopySessionActive, setPsychopySessionActive] = useState(false);
  const [murfiTerminalStatus, setMurfiTerminalStatus] = useState<TerminalStatus>('disconnected');
  const [psychopyTerminalStatus, setPsychopyTerminalStatus] = useState<TerminalStatus>('disconnected');
  const [initializeConfirmed, setInitializeConfirmed] = useState(false);
  const [executionQueue, setExecutionQueue] = useState<QueueItem[]>([]);
  const [queueStarted, setQueueStarted] = useState(false);
  const [queueStopped, setQueueStopped] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const stoppedItemsRef = useRef<Set<string>>(new Set());
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [commandsConfig, setCommandsConfig] = useState<CommandsConfig | null>(null);
  const murfiTerminalRef = useRef<TerminalHandle | null>(null);
  const psychopyTerminalRef = useRef<TerminalHandle | null>(null);

  // Determine workflow step based on state
  // Priority order: execute > configure > participant > initialize
  const getCurrentWorkflowStep = (): WorkflowStep => {
    // Session is initialized and ready for execution
    if (sessionInitialized) return 'execute';

    // All configuration is complete, ready to start session
    if (sessionConfig?.participantId && sessionConfig?.psychopyConfig && setupCompleted) {
      return 'configure'; // Show configure step until session is started
    }

    // Participant selected and setup completed, move to configure
    if (sessionConfig?.participantId && setupCompleted) return 'configure';

    // Participant selected but setup not completed
    if (sessionConfig?.participantId) return 'participant';

    // Systems initialized, move to participant selection
    if (murfiStarted && psychopyStarted && initializeConfirmed) return 'participant';

    // Default: initialize systems
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

  // Fetch commands configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/config/commands'));
        if (response.ok) {
          const config = await response.json();
          setCommandsConfig(config);
          console.log('[RunScan] Loaded commands config:', config);
        } else {
          console.error('[RunScan] Failed to load commands config');
        }
      } catch (error) {
        console.error('[RunScan] Error loading commands config:', error);
      }
    };
    fetchConfig();
  }, []);

  // Cleanup terminal registrations when sessions become inactive
  useEffect(() => {
    if (!murfiSessionActive) {
      unregisterTerminal('murfi');
      murfiTerminalRef.current = null;
    }
  }, [murfiSessionActive, unregisterTerminal]);

  useEffect(() => {
    if (!psychopySessionActive) {
      unregisterTerminal('psychopy');
      psychopyTerminalRef.current = null;
    }
  }, [psychopySessionActive, unregisterTerminal]);

  // Helper function to send command to appropriate terminal (fire-and-forget)
  const sendCommandToTerminal = useCallback((terminal: 'murfi' | 'psychopy', command: string) => {
    const terminalHandle = terminal === 'murfi' ? murfiTerminalRef.current : psychopyTerminalRef.current;
    if (terminalHandle) {
      console.log(`[RunScan] Sending command to ${terminal}:`, command);
      terminalHandle.sendCommand(command);
    } else {
      console.warn(`[RunScan] Terminal ${terminal} not ready, cannot send command`);
    }
  }, []);

  // Helper function to substitute variables in commands
  const substituteVariables = useCallback((command: string, variables: Record<string, string>) => {
    let result = command;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
    return result;
  }, []);

  const markHistoryFailed = useCallback((entryId: string, step: SessionStep, message: string) => {
    setStepHistory(prev => {
      const hasEntry = prev.some(
        (s) => (s as SessionStepHistory & { _entryId?: string })._entryId === entryId
      );

      if (!hasEntry) {
        return [
          ...prev,
          {
            step,
            status: 'failed',
            timestamp: new Date().toISOString(),
            message,
          },
        ];
      }

      return prev.map(s => {
        const entry = s as SessionStepHistory & { _entryId?: string };
        if (entry._entryId !== entryId) return s;
        return {
          ...entry,
          status: 'failed' as const,
          message,
          duration: entry.duration ?? (Date.now() - new Date(entry.timestamp).getTime()) / 1000,
        };
      });
    });
  }, []);

  const handleParticipantSelect = (participantId: string, isNewParticipant: boolean = false) => {
    setSessionConfig({
      participantId,
      sessionDate: new Date().toISOString().split('T')[0],
      protocol: 'DMN-NFB',
      psychopyConfig,
    });
    setSetupCompleted(false);
    setSetupRan(false);

    // If creating a new participant, run the create step
    if (isNewParticipant) {
      handleRunStep('create');
    }
  };

  const [setupRan, setSetupRan] = useState(false);

  const handleSetup = () => {
    // Execute button command (fire-and-forget)
    executeButtonCommand('runScan.setup', { participantId: sessionConfig?.participantId || '' });

    // Also send the step command from config if available
    const stepConfig = commandsConfig?.steps['setup'];
    if (stepConfig) {
      const variables: Record<string, string> = {
        participantId: sessionConfig?.participantId || '',
      };
      const command = substituteVariables(stepConfig.command, variables);
      sendCommandToTerminal(stepConfig.terminal, command);
    }

    setSetupRan(true);
  };

  const handleProceedToConfigure = () => {
    setSetupCompleted(true);
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

    // Generate a unique history entry ID for tracking this specific execution
    const historyEntryId = `${step}-${Date.now()}`;
    const startTime = Date.now();

    setRunningSteps(prev => new Set(prev).add(step));
    setIsRunning(true);

    try {
      // Start step - record in history
      const startedStep = await sessionService.startStep(step);
      const startedStepWithId = { ...startedStep, _entryId: historyEntryId };
      setStepHistory(prev => [...prev, startedStepWithId]);

      // Execute command from config and WAIT for actual completion
      const stepConfig = commandsConfig?.steps[step];
      if (stepConfig) {
        const variables: Record<string, string> = {
          participantId: sessionConfig?.participantId || '',
        };
        const command = substituteVariables(stepConfig.command, variables);
        const result = await executeTrackedCommand(stepConfig.terminal, command);

        if (result.exitCode !== 0) {
          throw new Error(`Command failed with exit code ${result.exitCode}`);
        }
      }

      // Calculate actual duration
      const duration = (Date.now() - startTime) / 1000;

      // Create completed step with real duration
      const completedStep: SessionStepHistory = {
        step,
        status: 'completed',
        timestamp: new Date().toISOString(),
        duration,
        message: `${step} completed successfully`,
      };

      // Update history - find by the unique entry ID instead of last index
      setStepHistory(prev =>
        prev.map(s =>
          (s as SessionStepHistory & { _entryId?: string })._entryId === historyEntryId
            ? { ...completedStep, _entryId: historyEntryId }
            : s
        )
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
      const errorMessage = error instanceof Error ? error.message : 'Step failed';
      markHistoryFailed(historyEntryId, step, errorMessage);
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
    // Generate a unique history entry ID for tracking this specific execution
    const historyEntryId = `${item.id}-${Date.now()}`;
    const startTime = Date.now();

    // Mark as running
    setExecutionQueue(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status: 'running' as const } : i))
    );

    setRunningSteps(prev => new Set(prev).add(item.step));
    setIsRunning(true);

    try {
      // Start step - record in history
      const startedStep = await sessionService.startStep(item.step);
      // Add historyEntryId to track this specific execution
      const startedStepWithId = { ...startedStep, _entryId: historyEntryId };
      setStepHistory(prev => [...prev, startedStepWithId]);

      // Execute command from config and WAIT for actual completion
      const stepConfig = commandsConfig?.steps[item.step];
      if (stepConfig) {
        const variables: Record<string, string> = {
          participantId: sessionConfig?.participantId || '',
        };
        const command = substituteVariables(stepConfig.command, variables);
        const result = await executeTrackedCommand(stepConfig.terminal, command);

        if (result.exitCode !== 0) {
          throw new Error(`Command failed with exit code ${result.exitCode}`);
        }
      }

      // Check if this item was stopped using the ref (most reliable check)
      if (stoppedItemsRef.current.has(item.id)) {
        // Item was stopped - don't update anything, just return
        // Clean up the ref entry
        stoppedItemsRef.current.delete(item.id);
        return;
      }

      // Check current queue state to see if item was stopped
      let wasStopped = false;
      setExecutionQueue(prev => {
        const currentItem = prev.find(i => i.id === item.id);
        if (currentItem?.status === 'failed') {
          wasStopped = true;
          stoppedItemsRef.current.delete(item.id);
          return prev;
        }
        return prev.map(i =>
          i.id === item.id ? { ...i, status: 'completed' as const } : i
        );
      });

      // If stopped, don't update history or counts
      if (wasStopped) {
        return;
      }

      // Calculate actual duration
      const duration = (Date.now() - startTime) / 1000;

      // Create completed step with real duration
      const completedStep: SessionStepHistory = {
        step: item.step,
        status: 'completed',
        timestamp: new Date().toISOString(),
        duration,
        message: `${item.step} completed successfully`,
      };

      // Update history - find by the unique entry ID instead of last index
      setStepHistory(prev =>
        prev.map(s =>
          (s as SessionStepHistory & { _entryId?: string })._entryId === historyEntryId
            ? { ...completedStep, _entryId: historyEntryId }
            : s
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

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Step failed';
      markHistoryFailed(historyEntryId, item.step, errorMessage);
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
  }, [commandsConfig, sessionConfig?.participantId, substituteVariables, executeTrackedCommand, markHistoryFailed]);

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

    // Generate session ID with timestamp to ensure uniqueness
    // Format: S{sequential}-{timestamp} to be both human-readable and unique
    const existingSessions = await sessionService.getPreviousSessions();
    let maxId = 0;

    // Find the highest session ID number
    for (const session of existingSessions) {
      // Match both old format S001 and new format S001-xxxxx
      const match = session.id.match(/^S(\d+)/);
      if (match) {
        const idNum = parseInt(match[1], 10);
        if (idNum > maxId) {
          maxId = idNum;
        }
      }
    }

    // Generate next session ID with timestamp suffix for uniqueness
    const nextId = maxId + 1;
    const timestamp = Date.now().toString(36); // Base36 for shorter string
    const newSessionId = `S${nextId.toString().padStart(3, '0')}-${timestamp}`;
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
    // Note: Don't reset setupCompleted here - it was already completed before reaching execute step
    setManualWorkflowStep(null);
  };

  // Terminal status change handlers
  const handleMurfiStatusChange = (status: TerminalStatus) => {
    setMurfiTerminalStatus(status);
    if (status === 'connected') {
      setMurfiStarted(true);
      setIsStartingMurfi(false);
    }
  };

  const handlePsychoPyStatusChange = (status: TerminalStatus) => {
    setPsychopyTerminalStatus(status);
    if (status === 'connected') {
      setPsychopyStarted(true);
      setIsStartingPsychoPy(false);
    }
  };

  const handleStartMurfi = () => {
    setIsStartingMurfi(true);
    setMurfiSessionActive(true);
    setTerminalOpen(true); // Auto-open terminal panel
  };

  const handleStartPsychoPy = () => {
    setIsStartingPsychoPy(true);
    setPsychopySessionActive(true);
    setTerminalOpen(true); // Auto-open terminal panel
  };

  const handleReset = async () => {
    // If session was initialized, save it and navigate to session overview
    if (sessionInitialized && sessionConfig && sessionId && sessionStartTime) {
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
        console.error('Error saving session:', error);
        // Still navigate even if save fails
        navigate(`/session/${sessionId}`);
        return;
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
    setSetupRan(false);
    setIsRunning(false);
    setManualWorkflowStep(null);
    setMurfiStarted(false);
    setPsychopyStarted(false);
    setMurfiSessionActive(false);
    setPsychopySessionActive(false);
    setMurfiTerminalStatus('disconnected');
    setPsychopyTerminalStatus('disconnected');
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
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
                      {setupRan 
                        ? 'Setup command sent. Click Next when ready to proceed.'
                        : 'Run setup before proceeding to configuration'
                      }
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSetup}
                      disabled={!commandsConfig}
                      variant={setupRan ? "outline" : "default"}
                      className={setupRan ? "" : "bg-primary hover:bg-primary/90"}
                    >
                      {setupRan ? 'Run Again' : 'Run Setup'}
                    </Button>
                    <Button
                      onClick={handleProceedToConfigure}
                      disabled={!setupRan}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Column - Controls and Status */}
            <div className="space-y-6">
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

            </div>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              <BrainScanPreview isActive={isRunning || sessionInitialized} />
            </div>
          </div>
        )}

        {/* Terminals card - show when any session is active */}
        {/* Terminals persist when hidden (CSS visibility) to maintain WebSocket connections */}
        {(murfiSessionActive || psychopySessionActive) && (
          <Card className="p-4 md:p-5 bg-card border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">System terminals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-medium">
                  Murfi · {murfiTerminalStatus === 'connected' ? 'Running' : murfiTerminalStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </Badge>
                <Badge variant="outline" className="text-[11px] font-medium">
                  PsychoPy · {psychopyTerminalStatus === 'connected' ? 'Running' : psychopyTerminalStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTerminalOpen(prev => !prev);
                    executeButtonCommand('runScan.toggleTerminal');
                  }}
                  className="gap-1 text-muted-foreground"
                >
                  {terminalOpen ? 'Hide' : 'Show'}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${terminalOpen ? 'rotate-180' : ''}`}
                  />
                </Button>
              </div>
            </div>

            {/* Use CSS visibility to hide/show - keeps terminals mounted and WebSocket connections alive */}
            <div className={cn("mt-4 grid grid-cols-1 md:grid-cols-2 gap-4", !terminalOpen && "hidden")}>
              {murfiSessionActive && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-foreground">Murfi</div>
                  <div className="rounded-lg border border-border/60 overflow-hidden" style={{ height: '250px' }}>
                    <XTerminal
                      sessionId="murfi"
                      onStatusChange={handleMurfiStatusChange}
                      onReady={(handle) => {
                        murfiTerminalRef.current = handle;
                        registerTerminal('murfi', handle);
                      }}
                    />
                  </div>
                </div>
              )}
              {psychopySessionActive && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-foreground">PsychoPy</div>
                  <div className="rounded-lg border border-border/60 overflow-hidden" style={{ height: '250px' }}>
                    <XTerminal
                      sessionId="psychopy"
                      onStatusChange={handlePsychoPyStatusChange}
                      onReady={(handle) => {
                        psychopyTerminalRef.current = handle;
                        registerTerminal('psychopy', handle);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
