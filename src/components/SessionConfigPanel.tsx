import { useState } from 'react';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, RotateCcw, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { SessionConfig, PsychoPyConfig } from '@/types/session';

interface SessionConfigPanelProps {
  sessionConfig: SessionConfig | null;
  psychopyConfig: PsychoPyConfig;
  onParticipantSelect: (participantId: string) => void;
  onPsychoPyConfigChange: (config: PsychoPyConfig) => void;
  onStart: () => void;
  onReset: () => void;
  sessionInitialized: boolean;
  isRunning: boolean;
}

export function SessionConfigPanel({
  sessionConfig,
  psychopyConfig,
  onParticipantSelect,
  onPsychoPyConfigChange,
  onStart,
  onReset,
  sessionInitialized,
  isRunning,
}: SessionConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isConfigValid = sessionConfig?.participantId && sessionConfig?.psychopyConfig;

  return (
    <div className="border-b border-border bg-card/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Session Configuration</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {sessionConfig && (
                <div className="text-sm text-muted-foreground">
                  Participant: <span className="font-semibold text-foreground">{sessionConfig.participantId}</span>
                  {' • '}
                  Protocol: <span className="font-semibold text-foreground">{sessionConfig.protocol}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!sessionInitialized ? (
                <Button
                  onClick={onStart}
                  disabled={!isConfigValid}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Session
                </Button>
              ) : (
                <Button
                  onClick={onReset}
                  disabled={isRunning}
                  variant="outline"
                  size="lg"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Finish Session
                </Button>
              )}
            </div>
          </div>

          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <ParticipantSelector
                  onParticipantSelect={onParticipantSelect}
                  selectedParticipantId={sessionConfig?.participantId}
                  inline={false}
                />
              </div>
              <div>
                <PsychoPyConfigComponent
                  config={psychopyConfig}
                  onChange={onPsychoPyConfigChange}
                />
              </div>
            </div>

            {!isConfigValid && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <span className="text-sm text-warning">
                  Please complete participant and PsychoPy configuration before starting
                </span>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
