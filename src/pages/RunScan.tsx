import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { SessionControls } from '@/components/SessionControls';
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
import { ArrowRight, Loader2, Terminal } from 'lucide-react';
import { QueueItem } from '@/components/ExecutionQueue';
import { Badge } from '@/components/ui/badge';
import { buildApiUrl } from '@/lib/apiBase';

export const sessionSteps: SessionStep[] = [
  '2vol',
  'resting_state',
  'extract_rs_networks',
  'process_roi_masks',
  'register',
  'feedback_no_15',
  'feedback_no_30',
  'feedback_yes_15',
  'feedback_yes_30',
  'cleanup',
];

export default function RunScan() {
  const navigate = useNavigate();
  const { registerTerminal, unregisterTerminal, executeButtonCommand, executeTrackedCommand } = useTerminalCommand();
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [psychopyConfig, setPsychopyConfig] = useState<PsychoPyConfig>({
    participantAnchor: 'toe',
  });
  const [participantId, setParticipantId] = useState('');
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
  const stoppedItemsRef = useRef<Set<string>>(new Set());
  const [commandsConfig, setCommandsConfig] = useState<CommandsConfig | null>(null);
  const murfiTerminalRef = useRef<TerminalHandle | null>(null);
  const psychopyTerminalRef = useRef<TerminalHandle | null>(null);

  // Determine workflow step based on state
  // Priority order: execute > configure > initialize
  const getCurrentWorkflowStep = (): WorkflowStep => {
    // Session is initialized and ready for execution
    if (sessionInitialized) return 'execute';

    // Systems initialized, move to configure
    if (murfiStarted && psychopyStarted && initializeConfirmed) return 'configure';

    // Default: initialize systems
    return 'initialize';
  };

  const getCompletedWorkflowSteps = (): WorkflowStep[] => {
    const completed: WorkflowStep[] = [];
    if (murfiStarted && psychopyStarted && initializeConfirmed) completed.push('initialize');
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

  // Handle participant ID change
  const handleParticipantIdChange = (newParticipantId: string) => {
    setParticipantId(newParticipantId);
    setSessionConfig(prev => prev ? {
      ...prev,
      participantId: newParticipantId,
    } : {
      participantId: newParticipantId,
      sessionDate: new Date().toISOString().split('T')[0],
      protocol: 'DMN-NFB',
      psychopyConfig,
    });
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

  // Helper function to derive displayFeedback and feedbackCondition from step name
  const getStepVariables = useCallback((step: SessionStep): { displayFeedback: string; feedbackCondition: string } => {
    if (step === 'feedback_no_15') return { displayFeedback: 'No Feedback', feedbackCondition: '15min' };
    if (step === 'feedback_no_30') return { displayFeedback: 'No Feedback', feedbackCondition: '30min' };
    if (step === 'feedback_yes_15') return { displayFeedback: 'Feedback', feedbackCondition: '15min' };
    if (step === 'feedback_yes_30') return { displayFeedback: 'Feedback', feedbackCondition: '30min' };
    return { displayFeedback: '', feedbackCondition: '' };
  }, []);

  // Count feedback runs (any feedback step)
  const getFeedbackRunCount = useCallback(() => {
    let count = 0;
    for (const [step, execCount] of stepExecutionCounts.entries()) {
      if (step.startsWith('feedback_')) {
        count += execCount;
      }
    }
    return count;
  }, [stepExecutionCounts]);

  const handleRunStep = (step: SessionStep) => {
    if (runningSteps.has(step)) return;

    // Generate a unique history entry ID for tracking this specific execution
    const historyEntryId = `${step}-${Date.now()}`;

    // Mark step as completed immediately (show tick right away)
    const completedStep: SessionStepHistory = {
      step,
      status: 'completed',
      timestamp: new Date().toISOString(),
      message: `${step} completed successfully`,
    };
    setStepHistory(prev => [...prev, { ...completedStep, _entryId: historyEntryId }]);

    // Increment execution count for this step immediately
    setStepExecutionCounts(prev => {
      const newCounts = new Map(prev);
      const currentCount = newCounts.get(step) || 0;
      newCounts.set(step, currentCount + 1);
      return newCounts;
    });

    // Execute command from config in background and track for errors
    const stepConfig = commandsConfig?.steps[step];
    if (stepConfig) {
      const stepVars = getStepVariables(step);
      const variables: Record<string, string> = {
        participantId: sessionConfig?.participantId || '',
        sessionDate: sessionConfig?.sessionDate || '',
        protocol: sessionConfig?.protocol || '',
        runNumber: String(getFeedbackRunCount() + 1),
        displayFeedback: stepVars.displayFeedback,
        participantAnchor: sessionConfig?.psychopyConfig?.participantAnchor || '',
        feedbackCondition: stepVars.feedbackCondition,
      };
      const command = substituteVariables(stepConfig.command, variables);

      // Execute murfi_command first if present (for psychopy steps that also need murfi)
      if (stepConfig.murfi_command) {
        const murfiCommand = substituteVariables(stepConfig.murfi_command, variables);
        executeTrackedCommand('murfi', murfiCommand)
          .catch(error => {
            console.error('[RunScan] murfi_command failed:', error);
          });
      }

      // Track command in background - update to failed only if error occurs
      executeTrackedCommand(stepConfig.terminal, command)
        .then(result => {
          if (result.exitCode !== 0) {
            markHistoryFailed(historyEntryId, step, `Command failed with exit code ${result.exitCode}`);
          }
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Step failed';
          markHistoryFailed(historyEntryId, step, errorMessage);
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
    runNextQueueItem();
  };

  const handleStartQueue = () => {
    runNextQueueItem();
  };

  // Execute a queue item
  const executeQueueItem = useCallback((item: QueueItem) => {
    // Generate a unique history entry ID for tracking this specific execution
    const historyEntryId = `${item.id}-${Date.now()}`;

    // Mark step as completed immediately (show tick right away)
    setExecutionQueue(prev =>
      prev.map(i => (i.id === item.id ? { ...i, status: 'completed' as const } : i))
    );

    // Add completed step to history immediately
    const completedStep: SessionStepHistory = {
      step: item.step,
      status: 'completed',
      timestamp: new Date().toISOString(),
      message: `${item.step} completed successfully`,
    };
    setStepHistory(prev => [...prev, { ...completedStep, _entryId: historyEntryId }]);

    // Increment execution count for this step immediately
    setStepExecutionCounts(prev => {
      const newCounts = new Map(prev);
      const currentCount = newCounts.get(item.step) || 0;
      newCounts.set(item.step, currentCount + 1);
      return newCounts;
    });

    // Execute command from config in background and track for errors
    const stepConfig = commandsConfig?.steps[item.step];
    if (stepConfig) {
      const stepVars = getStepVariables(item.step);
      const variables: Record<string, string> = {
        participantId: sessionConfig?.participantId || '',
        sessionDate: sessionConfig?.sessionDate || '',
        protocol: sessionConfig?.protocol || '',
        runNumber: String(getFeedbackRunCount() + 1),
        displayFeedback: stepVars.displayFeedback,
        participantAnchor: sessionConfig?.psychopyConfig?.participantAnchor || '',
        feedbackCondition: stepVars.feedbackCondition,
      };
      const command = substituteVariables(stepConfig.command, variables);

      // Execute murfi_command first if present (for psychopy steps that also need murfi)
      if (stepConfig.murfi_command) {
        const murfiCommand = substituteVariables(stepConfig.murfi_command, variables);
        executeTrackedCommand('murfi', murfiCommand)
          .catch(error => {
            console.error('[RunScan] murfi_command failed:', error);
          });
      }

      // Track command in background - update to failed only if error occurs
      executeTrackedCommand(stepConfig.terminal, command)
        .then(result => {
          if (result.exitCode !== 0) {
            markHistoryFailed(historyEntryId, item.step, `Command failed with exit code ${result.exitCode}`);
            setExecutionQueue(prev =>
              prev.map(i =>
                i.id === item.id ? { ...i, status: 'failed' as const } : i
              )
            );
          }
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Step failed';
          markHistoryFailed(historyEntryId, item.step, errorMessage);
          setExecutionQueue(prev =>
            prev.map(i =>
              i.id === item.id ? { ...i, status: 'failed' as const } : i
            )
          );
        });
    }
  }, [commandsConfig, sessionConfig?.participantId, sessionConfig?.sessionDate, sessionConfig?.protocol, sessionConfig?.psychopyConfig?.participantAnchor, substituteVariables, executeTrackedCommand, markHistoryFailed, getStepVariables, getFeedbackRunCount]);

  // Run next item in queue (manual execution - one item at a time)
  const runNextQueueItem = useCallback(() => {
    if (!sessionInitialized) return;

    const pendingItem = executionQueue.find(item => item.status === 'pending');

    // If there's a pending item, execute it (completes immediately, shows tick right away)
    if (pendingItem) {
      setQueueStarted(true);
      setQueueStopped(false);
      executeQueueItem(pendingItem);
    }
  }, [executionQueue, sessionInitialized, executeQueueItem]);

  const handleStartSession = async () => {
    // Create session config if not already set
    const config = sessionConfig || {
      participantId,
      sessionDate: new Date().toISOString().split('T')[0],
      protocol: 'DMN-NFB',
      psychopyConfig,
    };

    if (!config.participantId) return;

    // Ensure session config is saved
    if (!sessionConfig) {
      setSessionConfig(config);
    }

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
  };

  const handleStartPsychoPy = () => {
    setIsStartingPsychoPy(true);
    setPsychopySessionActive(true);
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
    setParticipantId('');
    setPsychopyConfig({
      participantAnchor: 'toe',
    });
  };

  const handleWorkflowStepClick = (step: WorkflowStep) => {
    // Allow clicking on initialize step, configure step, or any completed step
    if (step === 'initialize' || step === 'configure' || completedSteps.includes(step)) {
      setManualWorkflowStep(step);
    }
  };

  const handleConfirmInitialize = () => {
    setInitializeConfirmed(true);
    setManualWorkflowStep('configure');
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

        {/* Main Content - Two-column layout with equal height columns */}
        <div className="flex flex-col xl:flex-row xl:items-stretch gap-6">
          {/* Left column - Step content */}
          <div className="xl:flex-1 flex flex-col">
            {workflowStep === 'initialize' && (
              <div className="flex-1 flex flex-col [&>*]:flex-1">
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
              </div>
            )}

            {workflowStep === 'configure' && (
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    2
                  </span>
                  Configure Session
                </h2>
                <p className="text-muted-foreground mb-6">
                  Enter participant details and configure settings for this session.
                </p>

                <PsychoPyConfigComponent
                  config={psychopyConfig}
                  participantId={participantId}
                  onChange={handlePsychoPyConfigChange}
                  onParticipantIdChange={handleParticipantIdChange}
                  actionButton={
                    <Button
                      onClick={() => {
                        // Ensure session config is set with participant ID
                        if (!sessionConfig) {
                          setSessionConfig({
                            participantId,
                            sessionDate: new Date().toISOString().split('T')[0],
                            protocol: 'DMN-NFB',
                            psychopyConfig,
                          });
                        }
                        handleStartSession();
                        setManualWorkflowStep('execute');
                      }}
                      disabled={!participantId}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Start Session & Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  }
                />
              </Card>
            )}

            {workflowStep === 'execute' && (
              <div className="flex-1 flex flex-col [&>*]:flex-1">
                <SessionControls
                  config={sessionConfig}
                  isRunning={isRunning}
                  sessionInitialized={sessionInitialized}
                  sessionSteps={sessionSteps}
                  queueItems={executionQueue}
                  onStart={handleStartSession}
                  onReset={handleReset}
                  onAddToQueue={handleAddToQueue}
                  onRemoveFromQueue={handleRemoveFromQueue}
                  onReorderQueue={handleReorderQueue}
                  onClearQueue={handleClearQueue}
                  onStop={handleStop}
                  onStartQueue={handleStartQueue}
                />
              </div>
            )}
          </div>

          {/* Right column - Terminals (always visible, single instance) */}
          <div className="xl:flex-1 flex flex-col">
            <Card className="p-4 md:p-5 bg-card border-border flex-1">
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
                </div>
              </div>

              {/* Terminals stacked vertically */}
              <div className="mt-4 flex flex-col gap-4">
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
                {/* Placeholder when no terminals are active */}
                {!murfiSessionActive && !psychopySessionActive && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Terminal className="h-12 w-12 mb-4 opacity-30" />
                    <p className="text-sm">No active terminals</p>
                    <p className="text-xs mt-1">Start Murfi and PsychoPy to see terminals here</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
