import { ProgressTimeline } from '@/components/ProgressTimeline';
import { SessionStepHistory } from '@/types/session';

interface StepHistoryProps {
  history: SessionStepHistory[];
}

export function StepHistory({ history }: StepHistoryProps) {
  return <ProgressTimeline history={history} />;
}
