import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PsychoPyConfig, ParticipantAnchor, FeedbackCondition } from '@/types/session';

interface PsychoPyConfigProps {
  config: PsychoPyConfig;
  onChange: (config: PsychoPyConfig) => void;
}

export function PsychoPyConfigComponent({ config, onChange }: PsychoPyConfigProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-foreground">PsychoPy Configuration</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="feedback">Display Feedback</Label>
          <Select
            value={config.displayFeedback}
            onValueChange={(value: 'No Feedback' | 'Feedback') =>
              onChange({ ...config, displayFeedback: value })
            }
          >
            <SelectTrigger id="feedback" className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="No Feedback">No Feedback</SelectItem>
              <SelectItem value="Feedback">Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="anchor">Participant Anchor</Label>
          <Select
            value={config.participantAnchor}
            onValueChange={(value: ParticipantAnchor) =>
              onChange({ ...config, participantAnchor: value })
            }
          >
            <SelectTrigger id="anchor" className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="toe">Toe</SelectItem>
              <SelectItem value="finger">Finger</SelectItem>
              <SelectItem value="hand">Hand</SelectItem>
              <SelectItem value="nose">Nose</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="condition">Feedback Condition</Label>
          <Select
            value={config.feedbackCondition}
            onValueChange={(value: FeedbackCondition) =>
              onChange({ ...config, feedbackCondition: value })
            }
          >
            <SelectTrigger id="condition" className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="5min">5 minutes</SelectItem>
              <SelectItem value="10min">10 minutes</SelectItem>
              <SelectItem value="15min">15 minutes</SelectItem>
              <SelectItem value="20min">20 minutes</SelectItem>
              <SelectItem value="30min">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
