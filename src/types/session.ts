export type SessionStep =
  | 'create'
  | 'setup'
  | '2vol'
  | 'resting_state'
  | 'extract_rs_networks'
  | 'process_roi_masks'
  | 'register'
  | 'feedback_no_15'
  | 'feedback_no_30'
  | 'feedback_yes_15'
  | 'feedback_yes_30'
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

export interface PsychoPyConfig {
  participantAnchor: ParticipantAnchor;
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
