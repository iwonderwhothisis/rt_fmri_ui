import { Session, SessionStep, SessionStepHistory } from '@/types/session';

// Mock previous sessions (sessions still use in-memory storage)
const mockPreviousSessions: Session[] = [
  {
    id: 'S001',
    config: {
      participantId: '001',
      sessionDate: '2024-11-15',
      protocol: 'DMN-NFB',
      psychopyConfig: {
        participantAnchor: 'toe' as const,
      },
    },
    status: 'completed',
    stepHistory: [
      { step: 'create', status: 'completed', timestamp: '2024-11-15T10:00:00', duration: 2 },
      { step: 'setup', status: 'completed', timestamp: '2024-11-15T10:00:02', duration: 3 },
      { step: '2vol', status: 'completed', timestamp: '2024-11-15T10:00:05', duration: 5 },
    ],
    startTime: '2024-11-15T10:00:00',
    endTime: '2024-11-15T10:25:00',
  },
];

export const sessionService = {
  // Get previous sessions
  getPreviousSessions: async (): Promise<Session[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPreviousSessions;
  },

  // Get session by ID
  getSessionById: async (id: string): Promise<Session | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPreviousSessions.find(s => s.id === id) || null;
  },

  // Start a session step
  startStep: async (step: SessionStep): Promise<SessionStepHistory> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      step,
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  },

  // Simulate step completion (would be replaced by actual backend polling)
  completeStep: async (step: SessionStep): Promise<SessionStepHistory> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      step,
      status: 'completed',
      timestamp: new Date().toISOString(),
      duration: Math.floor(Math.random() * 10) + 2,
      message: `${step} completed successfully`,
    };
  },

  // Check Murfi/PsychoPy status
  checkSystemStatus: async (): Promise<{ murfi: boolean; psychopy: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { murfi: true, psychopy: true };
  },

  // Create/save a session
  createSession: async (session: Session): Promise<Session> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockPreviousSessions.unshift(session); // Add to beginning of array
    return session;
  },
};
