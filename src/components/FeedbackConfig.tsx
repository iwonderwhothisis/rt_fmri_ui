import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PsychoPyConfig } from '@/types/session';

interface FeedbackConfigProps {
  config: PsychoPyConfig;
  onChange: (config: PsychoPyConfig) => void;
}

export function FeedbackConfig({ config, onChange }: FeedbackConfigProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Feedback Configuration</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Select
            value={config.displayFeedback}
            onValueChange={(value: 'No Feedback' | 'Feedback') =>
              onChange({ ...config, displayFeedback: value })
            }
          >
            <SelectTrigger id="feedback" className="bg-input border-border">
              <SelectValue placeholder="Show Feedback" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="No Feedback">No Feedback</SelectItem>
              <SelectItem value="Feedback">Show Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Input
            id="anchor"
            value={config.participantAnchor}
            onChange={e => onChange({ ...config, participantAnchor: e.target.value })}
            placeholder="Anchor (e.g., toe)"
            className="bg-input border-border"
          />
        </div>

        <div>
          <Select
            value={config.feedbackCondition}
            onValueChange={value => onChange({ ...config, feedbackCondition: value })}
          >
            <SelectTrigger id="duration" className="bg-input border-border">
              <SelectValue placeholder="Duration" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="5min">5 minutes</SelectItem>
              <SelectItem value="10min">10 minutes</SelectItem>
              <SelectItem value="15min">15 minutes</SelectItem>
              <SelectItem value="20min">20 minutes</SelectItem>
              <SelectItem value="25min">25 minutes</SelectItem>
              <SelectItem value="30min">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
