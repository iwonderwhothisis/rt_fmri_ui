import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Participant } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ParticipantSelectorProps {
  onParticipantSelect: (participantId: string) => void;
  selectedParticipantId?: string;
}

export function ParticipantSelector({ onParticipantSelect, selectedParticipantId }: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ name: '', age: '' });
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      const data = await sessionService.getParticipants();
      setParticipants(data);
    } catch (error) {
      toast({
        title: 'Error loading participants',
        description: 'Failed to fetch participant list',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParticipant = async () => {
    if (!newParticipant.name || !newParticipant.age) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const created = await sessionService.createParticipant({
        name: newParticipant.name,
        age: parseInt(newParticipant.age),
      });
      setParticipants([...participants, created]);
      onParticipantSelect(created.id);
      setShowNewForm(false);
      setNewParticipant({ name: '', age: '' });
      toast({
        title: 'Participant created',
        description: `${created.name} (${created.id}) added successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create participant',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Participant Selection</h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participant">Select Participant</Label>
            <Select value={selectedParticipantId} onValueChange={onParticipantSelect}>
              <SelectTrigger id="participant" className="bg-input border-border">
                <SelectValue placeholder="Choose participant..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {participants.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id} - {p.name} (Age: {p.age})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!showNewForm ? (
            <Button
              variant="outline"
              className="w-full border-border hover:bg-secondary"
              onClick={() => setShowNewForm(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Participant
            </Button>
          ) : (
            <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="space-y-2">
                <Label htmlFor="newName">Name</Label>
                <Input
                  id="newName"
                  value={newParticipant.name}
                  onChange={e => setNewParticipant({ ...newParticipant, name: e.target.value })}
                  placeholder="Enter participant name"
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newAge">Age</Label>
                <Input
                  id="newAge"
                  type="number"
                  value={newParticipant.age}
                  onChange={e => setNewParticipant({ ...newParticipant, age: e.target.value })}
                  placeholder="Enter age"
                  className="bg-input border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateParticipant}
                  disabled={creating}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewParticipant({ name: '', age: '' });
                  }}
                  className="border-border"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
