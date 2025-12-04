import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Participant } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { UserPlus, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ParticipantSelectorProps {
  onParticipantSelect: (participantId: string) => void;
  selectedParticipantId?: string;
  inline?: boolean;
  showContinueButton?: boolean;
  onContinue?: () => void;
  continueDisabled?: boolean;
}

export function ParticipantSelector({
  onParticipantSelect,
  selectedParticipantId,
  inline = false,
  showContinueButton = false,
  onContinue,
  continueDisabled = true,
}: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newParticipantId, setNewParticipantId] = useState('');
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
    if (!newParticipantId.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a Participant ID',
        variant: 'destructive',
      });
      return;
    }

    // Check if ID already exists
    if (participants.some(p => p.id === newParticipantId.trim())) {
      toast({
        title: 'Validation Error',
        description: 'Participant ID already exists',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const created = await sessionService.createParticipant({
        id: newParticipantId.trim(),
        name: '',
        age: 0,
      });
      setParticipants([...participants, created]);
      onParticipantSelect(created.id);
      setShowNewForm(false);
      setNewParticipantId('');
      toast({
        title: 'Participant created',
        description: `${created.id} added successfully`,
      });
      // Reload participants to ensure fresh data
      loadParticipants();
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

  if (inline) {
    return (
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <>
            <Select value={selectedParticipantId} onValueChange={onParticipantSelect}>
              <SelectTrigger id="participant" className="w-[180px] bg-input border-border">
                <SelectValue placeholder="Select a participant" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {participants.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border hover:bg-secondary"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create New Participant</p>
                </TooltipContent>
              </Tooltip>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Add New Participant</DialogTitle>
                  <DialogDescription>
                    Enter a new participant ID to add to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="newParticipantId">Participant ID</Label>
                    <Input
                      id="newParticipantId"
                      type="number"
                      value={newParticipantId}
                      onChange={e => setNewParticipantId(e.target.value)}
                      placeholder="Enter Participant ID (e.g., 001)"
                      className="bg-input border-border"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewForm(false);
                      setNewParticipantId('');
                    }}
                    className="border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateParticipant}
                    disabled={creating}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    );
  }

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
                    {p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!showNewForm ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-border hover:bg-secondary"
                onClick={() => setShowNewForm(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Participant
              </Button>
              {showContinueButton && (
                <Button
                  onClick={onContinue}
                  disabled={continueDisabled}
                  className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="space-y-2">
                <Label htmlFor="newParticipantId">Participant ID</Label>
                <Input
                  id="newParticipantId"
                  type="number"
                  value={newParticipantId}
                  onChange={e => setNewParticipantId(e.target.value)}
                  placeholder="Enter Participant ID (e.g., 001)"
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
                    setNewParticipantId('');
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
