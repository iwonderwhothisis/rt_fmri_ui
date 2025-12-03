import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, RotateCcw, AlertCircle } from 'lucide-react';
import { SessionConfig } from '@/types/session';

interface SessionControlsProps {
  config: SessionConfig | null;
  isRunning: boolean;
  onStart: () => void;
  onReset: () => void;
}

export function SessionControls({ config, isRunning, onStart, onReset }: SessionControlsProps) {
  const isConfigValid = config?.participantId && config?.psychopyConfig;

  return (
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
        <Button
          onClick={onStart}
          disabled={!isConfigValid || isRunning}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" />
          Start Session
        </Button>

        <Button
          onClick={onReset}
          disabled={isRunning}
          variant="outline"
          className="border-border hover:bg-secondary"
          size="lg"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      {isRunning && (
        <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-success font-medium">
            Session running... Monitor progress in step history below
          </p>
        </div>
      )}
    </Card>
  );
}
