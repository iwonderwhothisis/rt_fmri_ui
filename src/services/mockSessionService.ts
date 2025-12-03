import { Participant, Session, SessionStep, SessionStepHistory } from '@/types/session';

// Mock participants database
const mockParticipants: Participant[] = [
  { id: '001', name: 'Alex Johnson', age: 14, lastSession: '2024-11-15' },
  { id: '002', name: 'Sam Chen', age: 12, lastSession: '2024-11-20' },
  { id: '003', name: 'Jordan Lee', age: 15, lastSession: '2024-11-28' },
];

// Mock previous sessions
const mockPreviousSessions: Session[] = [
  {
    id: 'S001',
    config: {
      participantId: '001',
      sessionDate: '2024-11-15',
      protocol: 'DMN-NFB',
      psychopyConfig: {
        runNumber: 1,
        displayFeedback: 'Feedback',
        participantAnchor: 'toe',
        feedbackCondition: '15min',
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
  // Get all participants
  getParticipants: async (): Promise<Participant[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockParticipants;
  },

  // Get participant by ID
  getParticipant: async (id: string): Promise<Participant | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockParticipants.find(p => p.id === id);
  },

  // Create new participant
  createParticipant: async (participant: Participant): Promise<Participant> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Check if ID already exists
    if (mockParticipants.some(p => p.id === participant.id)) {
      throw new Error('Participant ID already exists');
    }
    mockParticipants.push(participant);
    return participant;
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
};
