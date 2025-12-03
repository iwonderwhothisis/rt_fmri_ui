import { useState } from 'react';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { SessionControls } from '@/components/SessionControls';
import { StepHistory } from '@/components/StepHistory';
import { BrainScanPreview } from '@/components/BrainScanPreview';
import { PsychoPyConfig, SessionConfig, SessionStepHistory, SessionStep } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { useToast } from '@/hooks/use-toast';

const sessionSteps: SessionStep[] = [
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

  const runSessionSteps = async () => {
    for (const step of sessionSteps) {
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

      toast({
        title: `${step} completed`,
        description: completedStep.message,
      });

      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const handleStartSession = async () => {
    if (!sessionConfig) return;

    setIsRunning(true);
    setStepHistory([]);

    toast({
      title: 'Session started',
      description: `Running session for participant ${sessionConfig.participantId}`,
    });

    try {
      await runSessionSteps();

      toast({
        title: 'Session completed',
        description: 'All steps executed successfully',
      });
    } catch (error) {
      toast({
        title: 'Session error',
        description: 'An error occurred during session execution',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setSessionConfig(null);
    setStepHistory([]);
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
            <p className="text-muted-foreground mt-1">SMART-Kids Protocol</p>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            <ParticipantSelector
              onParticipantSelect={handleParticipantSelect}
              selectedParticipantId={sessionConfig?.participantId}
            />

            <PsychoPyConfigComponent
              config={psychopyConfig}
              onChange={handlePsychoPyConfigChange}
            />

            <SessionControls
              config={sessionConfig}
              isRunning={isRunning}
              onStart={handleStartSession}
              onReset={handleReset}
            />

            <StepHistory history={stepHistory} />
          </div>

          {/* Right Column - Preview */}
          <div>
            <BrainScanPreview isActive={isRunning} />
          </div>
        </div>
      </div>
    </div>
  );
}
