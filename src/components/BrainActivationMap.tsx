import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Activity, TrendingUp } from 'lucide-react';

interface BrainActivationMapProps {
  sessionId: string;
}

export function BrainActivationMap({ sessionId }: BrainActivationMapProps) {
  // Mock activation data - in real implementation, this would fetch actual imaging data
  const regions = [
    { name: 'Default Mode Network', activation: 0.82, change: '+12%' },
    { name: 'Dorsal Attention Network', activation: 0.65, change: '+8%' },
    { name: 'Salience Network', activation: 0.71, change: '+15%' },
    { name: 'Executive Control Network', activation: 0.58, change: '+5%' },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Brain Activation Maps</h3>
        </div>
        
        {/* Mock brain visualization */}
        <div className="bg-secondary/20 rounded-lg p-12 mb-6 border border-border border-dashed">
          <div className="flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Brain className="h-24 w-24 mx-auto opacity-50" />
              <p className="text-sm">3D brain activation visualization</p>
              <p className="text-xs">
                Would integrate with NIfTI viewer (e.g., Papaya, NiiVue, or custom WebGL)
              </p>
            </div>
          </div>
        </div>

        {/* Network activation levels */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Network Activation Levels
          </h4>
          {regions.map((region, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{region.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-success/30 text-success">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {region.change}
                  </Badge>
                  <span className="text-sm font-semibold text-foreground">
                    {(region.activation * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${region.activation * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h4 className="text-sm font-semibold text-foreground mb-4">Connectivity Patterns</h4>
        <div className="bg-secondary/20 rounded-lg p-8 border border-border border-dashed">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Functional connectivity matrix visualization</p>
            <p className="text-xs mt-2">
              Shows inter-region correlations during neurofeedback task
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
