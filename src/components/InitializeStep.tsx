import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InitializeStepProps {
  murfiStarted: boolean;
  psychopyStarted: boolean;
  onStartMurfi: () => void;
  onStartPsychoPy: () => void;
  isStartingMurfi?: boolean;
  isStartingPsychoPy?: boolean;
}

export function InitializeStep({
  murfiStarted,
  psychopyStarted,
  onStartMurfi,
  onStartPsychoPy,
  isStartingMurfi = false,
  isStartingPsychoPy = false,
}: InitializeStepProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
          1
        </span>
        Initialise Systems
      </h2>
      <p className="text-muted-foreground mb-6">
        Start the required software before proceeding
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Murfi System */}
        <Card className={cn(
          "p-6 border-2 transition-all duration-300",
          murfiStarted
            ? "bg-success/10 border-success/30"
            : "bg-card border-border hover:border-primary/50"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Murfi</h3>
            {murfiStarted && (
              <CheckCircle2 className="h-6 w-6 text-success" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Real-time fMRI processing system
          </p>
          <Button
            onClick={onStartMurfi}
            disabled={murfiStarted || isStartingMurfi}
            className={cn(
              "w-full",
              murfiStarted
                ? "bg-success/20 text-success border-success/30 hover:bg-success/20 cursor-not-allowed"
                : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
            )}
            size="lg"
          >
            {isStartingMurfi ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : murfiStarted ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Started
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Murfi
              </>
            )}
          </Button>
        </Card>

        {/* PsychoPy System */}
        <Card className={cn(
          "p-6 border-2 transition-all duration-300",
          psychopyStarted
            ? "bg-success/10 border-success/30"
            : "bg-card border-border hover:border-primary/50"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">PsychoPy</h3>
            {psychopyStarted && (
              <CheckCircle2 className="h-6 w-6 text-success" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Task presentation system
          </p>
          <Button
            onClick={onStartPsychoPy}
            disabled={psychopyStarted || isStartingPsychoPy}
            className={cn(
              "w-full",
              psychopyStarted
                ? "bg-success/20 text-success border-success/30 hover:bg-success/20 cursor-not-allowed"
                : "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
            )}
            size="lg"
          >
            {isStartingPsychoPy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : psychopyStarted ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Started
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start PsychoPy
              </>
            )}
          </Button>
        </Card>
      </div>

      {murfiStarted && psychopyStarted && (
        <div className="mt-6 p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-success font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Both systems are running. You can proceed to participant selection.
          </p>
        </div>
      )}
    </Card>
  );
}
