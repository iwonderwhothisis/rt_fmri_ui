import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Participant } from '@/types/session';
import { sessionService } from '@/services/mockSessionService';
import { Users, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [editForm, setEditForm] = useState({ anchor: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const data = await sessionService.getParticipants();
      setParticipants(data);
    } catch (error) {
      toast.error('Failed to load participants', {
        description: 'Please try refreshing the page.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (participant: Participant) => {
    setSelectedParticipant(participant);
    setEditForm({
      anchor: participant.anchor,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (participant: Participant) => {
    setSelectedParticipant(participant);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedParticipant) return;

    setSaving(true);
    try {
      const updated = await sessionService.updateParticipant(selectedParticipant.id, {
        anchor: editForm.anchor.trim(),
      });
      setParticipants(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      );
      setEditDialogOpen(false);
      toast.success('Participant updated', {
        description: `Participant ${updated.id} has been updated.`,
      });
    } catch (error) {
      toast.error('Failed to update participant', {
        description: 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedParticipant) return;

    setDeleting(true);
    try {
      await sessionService.deleteParticipant(selectedParticipant.id);
      setParticipants(prev => prev.filter(p => p.id !== selectedParticipant.id));
      setDeleteDialogOpen(false);
      toast.success('Participant deleted', {
        description: `Participant ${selectedParticipant.id} has been removed.`,
      });
    } catch (error) {
      toast.error('Failed to delete participant', {
        description: 'Please try again.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Edit Participants
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View, edit, and manage participant information
          </p>
        </div>

        {/* Participants Table */}
        <Card className="p-6 bg-card border-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : participants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No participants found</p>
              <p className="text-xs mt-1">Create participants from the Run Scan page</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Anchor</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map(participant => (
                  <TableRow key={participant.id}>
                    <TableCell className="font-medium">{participant.id}</TableCell>
                    <TableCell>{participant.anchor || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(participant)}
                          className="border-border hover:bg-secondary"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(participant)}
                          className="border-border hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Edit Participant</DialogTitle>
              <DialogDescription>
                Update participant details. ID cannot be changed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-id">Participant ID</Label>
                <Input
                  id="edit-id"
                  value={selectedParticipant?.id || ''}
                  disabled
                  className="bg-muted border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-anchor">Anchor</Label>
                <Input
                  id="edit-anchor"
                  value={editForm.anchor}
                  onChange={e => setEditForm(prev => ({ ...prev, anchor: e.target.value }))}
                  placeholder="Enter participant anchor (e.g., toe, finger)"
                  className="bg-input border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Participant</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete participant {selectedParticipant?.id}?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
