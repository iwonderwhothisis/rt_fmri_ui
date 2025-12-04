import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrainScanPreviewProps {
  isActive: boolean;
}

export function BrainScanPreview({ isActive }: BrainScanPreviewProps) {
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    // Animate pulse phase for visual effects
    const interval = setInterval(() => {
      setPulsePhase((prev) => (prev + 1) % 100);
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <Card className="p-6 bg-card border-border h-full shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Brain Scan Preview
        </h3>
        {isActive && (
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-success font-medium">Live</span>
          </div>
        )}
      </div>

      <div className="relative aspect-video bg-gradient-to-br from-background via-secondary/20 to-background rounded-lg border-2 border-border overflow-hidden">
        {isActive ? (
          <>
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at ${50 + Math.sin(pulsePhase * 0.1) * 20}% ${50 + Math.cos(pulsePhase * 0.1) * 20}%, hsl(150 70% 55% / 0.3) 0%, transparent 50%)`,
                animation: 'pulse 2s ease-in-out infinite',
              }} />
            </div>

            {/* Central brain visualisation */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative">
                <Brain className="h-24 w-24 text-primary/60 animate-pulse" />
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `scale(${1 + Math.sin(pulsePhase * 0.2) * 0.1})`,
                    transition: 'transform 0.5s ease-out',
                  }}
                >
                  <div className="h-32 w-32 rounded-full border-2 border-primary/30 animate-ping" />
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-foreground mb-1">Real-time fMRI Data</p>
                <p className="text-xs text-muted-foreground">
                  Connected to Murfi & PsychoPy
                </p>
              </div>
            </div>


            {/* Animated scan lines */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                  style={{
                    top: `${(pulsePhase + i * 33) % 100}%`,
                    animation: `scanLine 3s linear infinite`,
                    animationDelay: `${i * 1}s`,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="relative">
              <Brain className="h-20 w-20 text-muted-foreground/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/30" />
              </div>
            </div>
            <p className="text-muted-foreground mt-6 text-center">
              Waiting for session to start...
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2 text-center max-w-xs">
              Real-time brain activity visualisation will appear here once the session begins
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
