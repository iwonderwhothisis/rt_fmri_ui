export interface SystemConfig {
  name: string;
  description: string;
  startCommand: string;
}

export interface StepConfig {
  name: string;
  terminal: 'murfi' | 'psychopy';
  command: string;
  murfi_command?: string;  // Optional command to run on murfi terminal (for psychopy steps that also need murfi)
}

export interface StepCategory {
  name: string;
  steps: string[];
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
  stepOrder?: string[];  // Order of steps in the execution queue UI (categories derived from step.terminal)
  actions?: Record<string, ActionConfig>;
  buttons?: Record<string, ButtonConfig>;
  defaults?: {
    button?: ButtonDefaults;
  };
}
