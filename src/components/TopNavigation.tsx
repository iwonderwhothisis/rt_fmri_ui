import { NavLink } from '@/components/NavLink';
import { Activity, History, Brain, CheckCircle2 } from 'lucide-react';

export function TopNavigation() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            <div>
              <h2 className="font-bold text-lg text-foreground leading-none">CBRAIN</h2>
              <p className="text-xs text-muted-foreground leading-none">rt-fMRI Control</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              activeClassName="bg-primary/10 text-primary hover:bg-primary/10"
            >
              <Activity className="h-4 w-4" />
              Run Scan
            </NavLink>

            <NavLink
              to="/previous-scans"
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              activeClassName="bg-primary/10 text-primary hover:bg-primary/10"
            >
              <History className="h-4 w-4" />
              Previous Scans
            </NavLink>
          </div>
        </div>

        {/* System Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success">Systems Online</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
