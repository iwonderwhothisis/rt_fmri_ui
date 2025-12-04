import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { SessionControls } from '@/components/SessionControls';
import { StepHistory } from '@/components/StepHistory';
import { BrainScanPreview } from '@/components/BrainScanPreview';
import { WorkflowStepper, WorkflowStep } from '@/components/WorkflowStepper';
import { SessionStatusDashboard } from '@/components/SessionStatusDashboard';
import { InitializeStep } from '@/components/InitializeStep';
import { PsychoPyConfig, SessionConfig, SessionStepHistory, SessionStep, Session } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

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
  const { toast } = useToast();

  // Determine workflow step based on state
  const getCurrentWorkflowStep = (): WorkflowStep => {
    if (sessionInitialized) return 'execute';
    if (sessionConfig?.participantId && sessionConfig?.psychopyConfig) return 'execute';
    if (sessionConfig?.participantId) return 'participant';
    if (murfiStarted && psychopyStarted) return 'participant';
    return 'initialize';
  };

  const getCompletedWorkflowSteps = (): WorkflowStep[] => {
    const completed: WorkflowStep[] = [];
    if (murfiStarted && psychopyStarted) completed.push('initialize');
    if (sessionConfig?.participantId && sessionConfig?.psychopyConfig) completed.push('participant');
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
    setManualWorkflowStep(null);
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
    setManualWorkflowStep(null);

    toast({
      title: 'Session initialized',
      description: `Session ready for participant ${sessionConfig.participantId}. Select steps to execute.`,
    });
  };

  const handleStartMurfi = async () => {
    setIsStartingMurfi(true);
    // Simulate starting Murfi
    setTimeout(() => {
      setMurfiStarted(true);
      setIsStartingMurfi(false);
      toast({
        title: 'Murfi started',
        description: 'Real-time fMRI processing system is now running',
      });
    }, 1000);
  };

  const handleStartPsychoPy = async () => {
    setIsStartingPsychoPy(true);
    // Simulate starting PsychoPy
    setTimeout(() => {
      setPsychopyStarted(true);
      setIsStartingPsychoPy(false);
      toast({
        title: 'PsychoPy started',
        description: 'Task presentation system is now running',
      });
    }, 1000);
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
    setIsRunning(false);
    setManualWorkflowStep(null);
    setMurfiStarted(false);
    setPsychopyStarted(false);
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
    // Allow clicking on initialize step, participant step, or any completed step
    if (step === 'initialize' || step === 'participant' || completedSteps.includes(step)) {
      setManualWorkflowStep(step);
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
          />
        )}

        {workflowStep === 'participant' && (
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                  2
                </span>
                Select Participant & Configure
              </h2>
              <p className="text-muted-foreground mb-6">
                Choose an existing participant or create a new one, then configure PsychoPy settings.
              </p>
              <ParticipantSelector
                onParticipantSelect={handleParticipantSelect}
                selectedParticipantId={sessionConfig?.participantId}
                inline={false}
              />
            </Card>

            {sessionConfig?.participantId && (
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">PsychoPy Configuration</h3>
                <PsychoPyConfigComponent
                  config={psychopyConfig}
                  onChange={handlePsychoPyConfigChange}
                />
                <div className="mt-6 flex justify-end">
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
              </Card>
            )}
          </div>
        )}

        {workflowStep === 'execute' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Controls and Status */}
            <div className="xl:col-span-2 space-y-6">
              <SessionStatusDashboard
                isInitialized={sessionInitialized}
                isRunning={isRunning}
                stepHistory={stepHistory}
                totalSteps={sessionSteps.length}
                runningSteps={runningSteps}
              />

              <SessionControls
                config={sessionConfig}
                isRunning={isRunning}
                sessionInitialized={sessionInitialized}
                stepExecutionCounts={stepExecutionCounts}
                runningSteps={runningSteps}
                sessionSteps={sessionSteps}
                stepHistory={stepHistory}
                onStart={handleStartSession}
                onRunStep={handleRunStep}
                onReset={handleReset}
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
