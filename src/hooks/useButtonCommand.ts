import { useCallback } from 'react';
import { useTerminalCommand } from '@/contexts/TerminalCommandContext';

/**
 * Hook for adding terminal command execution to button click handlers
 *
 * Usage:
 *   const { withCommand, execute } = useButtonCommand('session.start');
 *   <Button onClick={withCommand(handleStart, { participantId })}>Start</Button>
 *
 * Or just execute:
 *   const { execute } = useButtonCommand('session.start');
 *   const handleClick = () => { doSomething(); execute({ participantId }); };
 */
export function useButtonCommand(buttonId: string) {
  const { executeButtonCommand } = useTerminalCommand();

  const withCommand = useCallback(<T extends (...args: unknown[]) => unknown>(
    handler: T,
    variables?: Record<string, string>
  ) => {
    return (...args: Parameters<T>) => {
      const result = handler(...args);
      executeButtonCommand(buttonId, variables);
      return result;
    };
  }, [buttonId, executeButtonCommand]);

  const execute = useCallback((variables?: Record<string, string>) => {
    executeButtonCommand(buttonId, variables);
  }, [buttonId, executeButtonCommand]);

  return { withCommand, execute };
}
