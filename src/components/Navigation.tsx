import { NavLink } from '@/components/NavLink';
import { Activity, History, Brain } from 'lucide-react';

export function Navigation() {
  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-[1800px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-8">
              <Brain className="h-8 w-8 text-primary" />
              <div>
                <h2 className="font-bold text-lg text-foreground">CBRAIN</h2>
                <p className="text-xs text-muted-foreground">rt-fMRI Control</p>
              </div>
            </div>
            
            <div className="flex gap-1">
              <NavLink
                to="/"
                end
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                activeClassName="bg-primary/10 text-primary hover:bg-primary/10"
              >
                <Activity className="h-4 w-4" />
                Run Scan
              </NavLink>
              
              <NavLink
                to="/previous-scans"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                activeClassName="bg-primary/10 text-primary hover:bg-primary/10"
              >
                <History className="h-4 w-4" />
                Previous Scans
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-success font-medium">Systems Online</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
