import { Card } from '@/components/ui/card';
import { Brain } from 'lucide-react';

interface BrainActivationMapProps {
  sessionId: string;
}

export function BrainActivationMap({ sessionId }: BrainActivationMapProps) {

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Brain Activation Maps</h3>
        </div>

        {/* Mock brain visualization */}
        <div className="bg-secondary/20 rounded-lg p-12 border border-border border-dashed">
          <div className="flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Brain className="h-24 w-24 mx-auto opacity-50" />
              <p className="text-sm">3D brain activation visualization</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h4 className="text-sm font-semibold text-foreground mb-4">Connectivity Patterns</h4>
        <div className="bg-secondary/20 rounded-lg p-8 border border-border border-dashed">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Functional connectivity matrix visualization</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
