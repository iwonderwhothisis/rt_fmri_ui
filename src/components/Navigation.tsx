import { NavLink } from '@/components/NavLink';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Activity, History, Brain, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Navigation() {
  return (
    <>
      <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between h-16 px-6">
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:scale-95"
                  activeClassName="bg-primary/10 text-primary hover:bg-primary/10 shadow-sm"
                >
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Run Scan</span>
                  <span className="sm:hidden">Run</span>
                </NavLink>

                <NavLink
                  to="/previous-scans"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary/50 active:scale-95"
                  activeClassName="bg-primary/10 text-primary hover:bg-primary/10 shadow-sm"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous Scans</span>
                  <span className="sm:hidden">History</span>
                </NavLink>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">
                    <HelpCircle className="h-4 w-4" />
                    <span className="sr-only">Help</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Need help? Check the documentation</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-success font-medium hidden md:inline">Systems Online</span>
                  <span className="text-success font-medium md:hidden">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <Breadcrumbs />
    </>
  );
}
