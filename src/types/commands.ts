export interface SystemConfig {
  name: string;
  description: string;
  startCommand: string;
}

export interface StepConfig {
  name: string;
  terminal: 'murfi' | 'psychopy';
  command: string;
}

export interface ActionConfig {
  name: string;
  terminals: ('murfi' | 'psychopy')[];
  command: string;
}

export interface CommandsConfig {
  systems: Record<string, SystemConfig>;
  steps: Record<string, StepConfig>;
  actions?: Record<string, ActionConfig>;
}
