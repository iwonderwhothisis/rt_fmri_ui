import {
  Sidebar as UISidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ParticipantSelector } from '@/components/ParticipantSelector';
import { PsychoPyConfigComponent } from '@/components/PsychoPyConfig';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, History, Brain } from 'lucide-react';
import { PsychoPyConfig } from '@/types/session';

interface SidebarProps {
  selectedParticipantId?: string;
  onParticipantSelect: (participantId: string) => void;
  psychopyConfig: PsychoPyConfig;
  onPsychoPyConfigChange: (config: PsychoPyConfig) => void;
}

export function Sidebar({
  selectedParticipantId,
  onParticipantSelect,
  psychopyConfig,
  onPsychoPyConfigChange,
}: SidebarProps) {
  const location = useLocation();
  const isActive = (path: string, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <UISidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <Brain className="h-6 w-6 text-primary" />
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-base text-sidebar-foreground">CBRAIN</h2>
            <p className="text-xs text-sidebar-foreground/70">rt-fMRI Control</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive('/', true)}
                  tooltip="Run Scan"
                  asChild
                >
                  <NavLink to="/" end>
                    <Activity className="h-4 w-4" />
                    <span>Run Scan</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive('/previous-scans')}
                  tooltip="Previous Scans"
                  asChild
                >
                  <NavLink to="/previous-scans">
                    <History className="h-4 w-4" />
                    <span>Previous Scans</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Session Setup</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 space-y-3">
              <div className="group-data-[collapsible=icon]:hidden">
                <ParticipantSelector
                  onParticipantSelect={onParticipantSelect}
                  selectedParticipantId={selectedParticipantId}
                  inline={false}
                />
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <PsychoPyConfigComponent
                  config={psychopyConfig}
                  onChange={onPsychoPyConfigChange}
                />
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-success/10 border border-success/20 group-data-[collapsible=icon]:justify-center">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success group-data-[collapsible=icon]:hidden">
              Systems Online
            </span>
          </div>
        </div>
      </SidebarFooter>
    </UISidebar>
  );
}
