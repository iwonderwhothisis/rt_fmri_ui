import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PsychoPyConfig } from '@/types/session';

interface PsychoPyConfigProps {
  config: PsychoPyConfig;
  participantId: string;
  onChange: (config: PsychoPyConfig) => void;
  onParticipantIdChange: (participantId: string) => void;
  actionButton?: ReactNode;
}

export function PsychoPyConfigComponent({ config, participantId, onChange, onParticipantIdChange, actionButton }: PsychoPyConfigProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-foreground">Session Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="participantId">Participant ID</Label>
          <Input
            id="participantId"
            value={participantId}
            onChange={(e) => onParticipantIdChange(e.target.value)}
            placeholder="e.g., remind0001"
            className="bg-input border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="anchor">Participant Anchor</Label>
          <Input
            id="anchor"
            value={config.participantAnchor}
            onChange={(e) =>
              onChange({ ...config, participantAnchor: e.target.value })
            }
            placeholder="e.g., toe, finger, hand"
            className="bg-input border-border"
          />
        </div>

        {/* Action button slot - aligns with the second column */}
        {actionButton && (
          <div className="col-span-2 flex justify-end mt-2">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
}
