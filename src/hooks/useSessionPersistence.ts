import { useCallback, useEffect, useRef } from 'react';
import type { SessionConfig, SessionStepHistory, SessionStep, PsychoPyConfig } from '@/types/session';
import type { WorkflowStep } from '@/components/WorkflowStepper';
import type { QueueItem } from '@/components/ExecutionQueue';

const STORAGE_KEY = 'neuro-orch-session-state';

/**
 * State that gets persisted to sessionStorage
 */
export interface PersistedSessionState {
  // Session configuration
  sessionConfig: SessionConfig | null;
  sessionId: string | null;
  sessionStartTime: string | null;
  participantId: string;
  psychopyConfig: PsychoPyConfig;

  // Workflow progress
  sessionInitialized: boolean;
  initializeConfirmed: boolean;
  setupCompleted: boolean;
  manualWorkflowStep: WorkflowStep | null;
  murfiStarted: boolean;
  psychopyStarted: boolean;

  // Execution state
  stepHistory: SessionStepHistory[];
  stepExecutionCounts: [SessionStep, number][]; // Map serialized as array of tuples
  executionQueue: QueueItem[];
  queueStarted: boolean;
  queueStopped: boolean;
}

/**
 * Hook for persisting session state to sessionStorage
 * 
 * Usage:
 * 1. Call loadState() on mount to restore previous state
 * 2. Call saveState(state) when state changes (debounced internally)
 * 3. Call clearState() when session ends/resets
 */
export function useSessionPersistence() {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Load persisted state from sessionStorage
   */
  const loadState = useCallback((): PersistedSessionState | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored) as PersistedSessionState;
      console.log('[SessionPersistence] Loaded state from sessionStorage');
      return parsed;
    } catch (error) {
      console.error('[SessionPersistence] Failed to load state:', error);
      return null;
    }
  }, []);

  /**
   * Save state to sessionStorage (debounced to avoid excessive writes)
   */
  const saveState = useCallback((state: PersistedSessionState) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        console.log('[SessionPersistence] Saved state to sessionStorage');
      } catch (error) {
        console.error('[SessionPersistence] Failed to save state:', error);
      }
    }, 500);
  }, []);

  /**
   * Clear persisted state from sessionStorage
   */
  const clearState = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('[SessionPersistence] Cleared state from sessionStorage');
    } catch (error) {
      console.error('[SessionPersistence] Failed to clear state:', error);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadState,
    saveState,
    clearState,
  };
}

/**
 * Helper to convert Map to serializable array
 */
export function mapToArray<K, V>(map: Map<K, V>): [K, V][] {
  return Array.from(map.entries());
}

/**
 * Helper to convert array back to Map
 */
export function arrayToMap<K, V>(array: [K, V][]): Map<K, V> {
  return new Map(array);
}
