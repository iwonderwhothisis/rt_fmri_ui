export interface Participant {
  id: string;
  name: string;
  age: number;
  lastSession?: string;
}

export type SessionStep = 
  | 'create'
  | 'setup'
  | '2vol'
  | 'resting_state'
  | 'extract_rs_networks'
  | 'process_roi_masks'
  | 'register'
  | 'feedback'
  | 'cleanup';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SessionStepHistory {
  step: SessionStep;
  status: StepStatus;
  timestamp: string;
  duration?: number;
  message?: string;
}

export interface PsychoPyConfig {
  runNumber: number;
  displayFeedback: 'No Feedback' | 'Feedback';
  participantAnchor: string;
  feedbackCondition: string;
}

export interface SessionConfig {
  participantId: string;
  sessionDate: string;
  protocol: string;
  psychopyConfig: PsychoPyConfig;
}

export interface Session {
  id: string;
  config: SessionConfig;
  status: 'idle' | 'running' | 'completed' | 'error';
  currentStep?: SessionStep;
  stepHistory: SessionStepHistory[];
  startTime?: string;
  endTime?: string;
}
