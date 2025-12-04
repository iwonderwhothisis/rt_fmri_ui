import { useState } from 'react';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { SessionControls } from '@/components/SessionControls';
import { StepHistory } from '@/components/StepHistory';
import { BrainScanPreview } from '@/components/BrainScanPreview';
import { PsychoPyConfig, SessionConfig, SessionStepHistory, SessionStep } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { useToast } from '@/hooks/use-toast';

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
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [psychopyConfig, setPsychopyConfig] = useState<PsychoPyConfig>({
    runNumber: 1,
    displayFeedback: 'Feedback',
    participantAnchor: 'toe',
    feedbackCondition: '15min',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [stepExecutionCounts, setStepExecutionCounts] = useState<Map<SessionStep, number>>(new Map());
  const [runningSteps, setRunningSteps] = useState<Set<SessionStep>>(new Set());
  const [stepHistory, setStepHistory] = useState<SessionStepHistory[]>([]);
  const { toast } = useToast();

  const handleParticipantSelect = (participantId: string) => {
    setSessionConfig({
      participantId,
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

    setSessionInitialized(true);
    setIsRunning(false);
    setStepHistory([]);
    setStepExecutionCounts(new Map());
    setRunningSteps(new Set());

    toast({
      title: 'Session initialized',
      description: `Session ready for participant ${sessionConfig.participantId}. Select steps to execute.`,
    });
  };

  const handleReset = () => {
    setSessionConfig(null);
    setStepHistory([]);
    setSessionInitialized(false);
    setStepExecutionCounts(new Map());
    setRunningSteps(new Set());
    setIsRunning(false);
    setPsychopyConfig({
      runNumber: 1,
      displayFeedback: 'Feedback',
      participantAnchor: 'toe',
      feedbackCondition: '15min',
    });
    toast({
      title: 'Session reset',
      description: 'Ready for new session',
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              rt-fMRI Neurofeedback Control
            </h1>
          </div>
          <ParticipantSelector
            onParticipantSelect={handleParticipantSelect}
            selectedParticipantId={sessionConfig?.participantId}
            inline={true}
          />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            <PsychoPyConfigComponent
              config={psychopyConfig}
              onChange={handlePsychoPyConfigChange}
            />

            <SessionControls
              config={sessionConfig}
              isRunning={isRunning}
              sessionInitialized={sessionInitialized}
              stepExecutionCounts={stepExecutionCounts}
              runningSteps={runningSteps}
              sessionSteps={sessionSteps}
              onStart={handleStartSession}
              onRunStep={handleRunStep}
              onReset={handleReset}
            />

            <StepHistory history={stepHistory} />
          </div>

          {/* Right Column - Preview */}
          <div>
            <BrainScanPreview isActive={isRunning || sessionInitialized} />
          </div>
        </div>
      </div>
    </div>
  );
}
