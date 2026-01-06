import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from 'react';
import type { TerminalHandle } from '@/components/XTerminal';
import type { CommandsConfig } from '@/types/commands';

interface TerminalCommandContextValue {
  registerTerminal: (id: 'murfi' | 'psychopy', handle: TerminalHandle) => void;
  unregisterTerminal: (id: 'murfi' | 'psychopy') => void;
  executeButtonCommand: (buttonId: string, variables?: Record<string, string>) => void;
  isTerminalReady: (id: 'murfi' | 'psychopy') => boolean;
  configLoaded: boolean;
}

const TerminalCommandContext = createContext<TerminalCommandContextValue | null>(null);

const DEFAULT_TERMINAL: 'murfi' | 'psychopy' = 'murfi';
const DEFAULT_COMMAND = "echo 'Button ${buttonId} pressed'";

export function TerminalCommandProvider({ children }: { children: ReactNode }) {
  const terminalsRef = useRef<Map<string, TerminalHandle>>(new Map());
  const [config, setConfig] = useState<CommandsConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config/commands');
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (error) {
        console.error('[TerminalCommandContext] Error loading config:', error);
      } finally {
        setConfigLoaded(true);
      }
    };
    fetchConfig();
  }, []);

  const registerTerminal = useCallback((id: 'murfi' | 'psychopy', handle: TerminalHandle) => {
    terminalsRef.current.set(id, handle);
    console.log(`[TerminalCommandContext] Registered terminal: ${id}`);
  }, []);

  const unregisterTerminal = useCallback((id: 'murfi' | 'psychopy') => {
    terminalsRef.current.delete(id);
    console.log(`[TerminalCommandContext] Unregistered terminal: ${id}`);
  }, []);

  const isTerminalReady = useCallback((id: 'murfi' | 'psychopy') => {
    return terminalsRef.current.has(id);
  }, []);

  const substituteVariables = useCallback((command: string, variables: Record<string, string>) => {
    let result = command;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
    return result;
  }, []);

  const executeButtonCommand = useCallback((
    buttonId: string,
    variables: Record<string, string> = {}
  ) => {
    const allVariables = { ...variables, buttonId };

    const buttonConfig = config?.buttons?.[buttonId];
    const defaults = config?.defaults?.button || {
      terminal: DEFAULT_TERMINAL,
      command: DEFAULT_COMMAND
    };

    let terminals: ('murfi' | 'psychopy')[] = [];
    if (buttonConfig?.terminals) {
      terminals = buttonConfig.terminals;
    } else if (buttonConfig?.terminal) {
      terminals = [buttonConfig.terminal];
    } else {
      terminals = [defaults.terminal];
    }

    const command = buttonConfig?.command ?? defaults.command;
    const substitutedCommand = substituteVariables(command, allVariables);

    for (const terminalId of terminals) {
      const terminalHandle = terminalsRef.current.get(terminalId);
      if (terminalHandle) {
        console.log(`[TerminalCommand] Sending to ${terminalId}: ${substitutedCommand}`);
        terminalHandle.sendCommand(substitutedCommand);
      } else {
        console.warn(`[TerminalCommand] Terminal ${terminalId} not ready for button ${buttonId}`);
      }
    }
  }, [config, substituteVariables]);

  return (
    <TerminalCommandContext.Provider value={{
      registerTerminal,
      unregisterTerminal,
      executeButtonCommand,
      isTerminalReady,
      configLoaded,
    }}>
      {children}
    </TerminalCommandContext.Provider>
  );
}

export function useTerminalCommand() {
  const context = useContext(TerminalCommandContext);
  if (!context) {
    throw new Error('useTerminalCommand must be used within a TerminalCommandProvider');
  }
  return context;
}
