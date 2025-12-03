import { Card } from '@/components/ui/card';
import { Activity, Brain } from 'lucide-react';

interface BrainScanPreviewProps {
  isActive: boolean;
}

export function BrainScanPreview({ isActive }: BrainScanPreviewProps) {
  return (
    <Card className="p-6 bg-card border-border h-full">
      <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        Brain Scan Preview
      </h3>

      <div className="relative aspect-video bg-background rounded-lg border-2 border-border overflow-hidden">
        {isActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Activity className="h-16 w-16 text-primary animate-pulse mb-4" />
            <p className="text-muted-foreground">Real-time fMRI data would display here</p>
            <p className="text-sm text-muted-foreground mt-2">
              Connected to Murfi & PsychoPy outputs
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Brain className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Waiting for session to start...</p>
          </div>
        )}

        {/* Simulated overlay indicators when active */}
        {isActive && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div className="bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">DMN Activity</p>
              <p className="text-lg font-bold text-primary">+0.42</p>
            </div>
            <div className="bg-background/90 backdrop-blur px-3 py-2 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">CEN Activity</p>
              <p className="text-lg font-bold text-accent">-0.18</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
