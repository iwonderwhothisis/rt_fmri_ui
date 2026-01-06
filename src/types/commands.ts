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

export interface ButtonConfig {
  terminal?: 'murfi' | 'psychopy';
  terminals?: ('murfi' | 'psychopy')[];
  command?: string;
}

export interface ButtonDefaults {
  terminal: 'murfi' | 'psychopy';
  command: string;
}

export interface CommandsConfig {
  systems: Record<string, SystemConfig>;
  steps: Record<string, StepConfig>;
  actions?: Record<string, ActionConfig>;
  buttons?: Record<string, ButtonConfig>;
  defaults?: {
    button?: ButtonDefaults;
  };
}
