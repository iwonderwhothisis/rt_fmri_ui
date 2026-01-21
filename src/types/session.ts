export interface Participant {
  id: string;
  anchor: string;
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
  | 'cleanup'
  | 'backup_reg_mni_masks_to_2vol';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SessionStepHistory {
  step: SessionStep;
  status: StepStatus;
  timestamp: string;
  duration?: number;
  message?: string;
}

// Participant anchor (free text entry)
export type ParticipantAnchor = string;

// Valid feedback condition options
export type FeedbackCondition = '5min' | '10min' | '15min' | '20min' | '30min';

export interface PsychoPyConfig {
  displayFeedback: 'No Feedback' | 'Feedback';
  participantAnchor: ParticipantAnchor;
  feedbackCondition: FeedbackCondition;
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
