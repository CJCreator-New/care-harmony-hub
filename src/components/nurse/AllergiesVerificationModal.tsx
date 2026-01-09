import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AllergiesVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  onComplete: (data: { hasAllergies: boolean; allergies: string; notes: string }) => void;
  isLoading?: boolean;
}

export function AllergiesVerificationModal({
  open,
  onOpenChange,
  patientName,
  onComplete,
  isLoading = false,
}: AllergiesVerificationModalProps) {
  const [hasAllergies, setHasAllergies] = useState(false);
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (hasAllergies && !allergies.trim()) {
      toast.error('Please specify allergies');
      return;
    }
    onComplete({ hasAllergies, allergies: allergies.trim(), notes: notes.trim() });
    setHasAllergies(false);
    setAllergies('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Verify Allergies - {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="hasAllergies"
              checked={hasAllergies}
              onCheckedChange={(checked) => setHasAllergies(checked === true)}
            />
            <Label htmlFor="hasAllergies">Patient has known allergies</Label>
          </div>

          {hasAllergies && (
            <div className="space-y-2">
              <Label>Allergies *</Label>
              <Textarea
                placeholder="List all known allergies (medications, food, environmental)..."
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes about allergy verification..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Verify Allergies
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}