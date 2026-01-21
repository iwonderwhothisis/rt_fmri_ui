import { Participant, Session, SessionStep, SessionStepHistory } from '@/types/session';
import { buildApiUrl } from '@/lib/apiBase';

// Mock previous sessions (sessions still use in-memory storage)
const mockPreviousSessions: Session[] = [
  {
    id: 'S001',
    config: {
      participantId: '001',
      sessionDate: '2024-11-15',
      protocol: 'DMN-NFB',
      psychopyConfig: {
        displayFeedback: 'Feedback',
        participantAnchor: 'toe' as const,
        feedbackCondition: '15min' as const,
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
  // Get all participants from CSV via API
  getParticipants: async (): Promise<Participant[]> => {
    const response = await fetch(buildApiUrl('/api/participants'));
    if (!response.ok) {
      throw new Error('Failed to fetch participants');
    }
    return response.json();
  },

  // Get participant by ID from CSV via API
  getParticipant: async (id: string): Promise<Participant | undefined> => {
    const response = await fetch(buildApiUrl(`/api/participants/${id}`));
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error('Failed to fetch participant');
    }
    return response.json();
  },

  // Create new participant in CSV via API
  createParticipant: async (participant: Participant): Promise<Participant> => {
    const response = await fetch(buildApiUrl('/api/participants'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant),
    });
    if (response.status === 409) {
      throw new Error('Participant ID already exists');
    }
    if (!response.ok) {
      throw new Error('Failed to create participant');
    }
    return response.json();
  },

  // Update participant in CSV via API (anchor only, ID is immutable)
  updateParticipant: async (id: string, updates: { anchor?: string }): Promise<Participant> => {
    const response = await fetch(buildApiUrl(`/api/participants/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (response.status === 404) {
      throw new Error('Participant not found');
    }
    if (!response.ok) {
      throw new Error('Failed to update participant');
    }
    return response.json();
  },

  // Delete participant from CSV via API
  deleteParticipant: async (id: string): Promise<void> => {
    const response = await fetch(buildApiUrl(`/api/participants/${id}`), {
      method: 'DELETE',
    });
    if (response.status === 404) {
      throw new Error('Participant not found');
    }
    if (!response.ok) {
      throw new Error('Failed to delete participant');
    }
  },

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
