import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface SystemConfig {
  name: string;
  description: string;
  startCommand: string;
}

interface StepConfig {
  name: string;
  terminal: 'murfi' | 'psychopy';
  command: string;
}

interface ActionConfig {
  name: string;
  terminals: ('murfi' | 'psychopy')[];
  command: string;
}

interface CommandsConfig {
  systems: Record<string, SystemConfig>;
  steps: Record<string, StepConfig>;
  actions?: Record<string, ActionConfig>;
}

let cachedConfig: CommandsConfig | null = null;

export function loadCommandsConfig(): CommandsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Get the directory of this file and navigate to config
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const configFile = process.env.COMMANDS_CONFIG || 'commands.yaml';
    const configPath = join(__dirname, '..', 'config', configFile);

    console.log(`[CommandService] Using config file: ${configFile}`);
    console.log(`[CommandService] Loading config from: ${configPath}`);

    const fileContent = readFileSync(configPath, 'utf-8');
    cachedConfig = parse(fileContent) as CommandsConfig;

    console.log(`[CommandService] Loaded ${Object.keys(cachedConfig.systems || {}).length} systems, ${Object.keys(cachedConfig.steps || {}).length} steps`);

    return cachedConfig;
  } catch (error) {
    console.error('[CommandService] Error loading config:', error);
    // Return default empty config
    return {
      systems: {},
      steps: {},
      actions: {},
    };
  }
}

export function getSystemCommand(systemId: string): string | null {
  const config = loadCommandsConfig();
  return config.systems[systemId]?.startCommand || null;
}

export function getStepConfig(stepId: string): StepConfig | null {
  const config = loadCommandsConfig();
  return config.steps[stepId] || null;
}

export function substituteVariables(command: string, variables: Record<string, string>): string {
  let result = command;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }
  return result;
}

export function reloadConfig(): void {
  cachedConfig = null;
  loadCommandsConfig();
}
