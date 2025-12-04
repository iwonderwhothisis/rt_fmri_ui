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
          <h3 className="text-lg font-semibold text-foreground">Brain Activation</h3>
        </div>

        {/* Mock brain visualisation */}
        <div className="bg-secondary/20 rounded-lg p-12 border border-border border-dashed">
          <div className="flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Brain className="h-24 w-24 mx-auto opacity-50" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
