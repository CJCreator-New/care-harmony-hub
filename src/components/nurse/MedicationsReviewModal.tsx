import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Pill, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MedicationsReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  onComplete: (data: { hasMedications: boolean; medications: string; notes: string }) => void;
  isLoading?: boolean;
}

export function MedicationsReviewModal({
  open,
  onOpenChange,
  patientName,
  onComplete,
  isLoading = false,
}: MedicationsReviewModalProps) {
  const [hasMedications, setHasMedications] = useState(false);
  const [medications, setMedications] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (hasMedications && !medications.trim()) {
      toast.error('Please list current medications');
      return;
    }
    onComplete({ 
      hasMedications, 
      medications: medications.trim(), 
      notes: notes.trim() 
    });
    setHasMedications(false);
    setMedications('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Review Current Medications - {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="hasMedications"
              checked={hasMedications}
              onCheckedChange={(checked) => setHasMedications(checked === true)}
            />
            <Label htmlFor="hasMedications">Patient is currently taking medications</Label>
          </div>

          {hasMedications && (
            <div className="space-y-2">
              <Label>Current Medications *</Label>
              <Textarea
                placeholder="List all current medications with dosages and frequency..."
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Include prescription drugs, over-the-counter medications, supplements, and herbal remedies
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Review Notes</Label>
            <Textarea
              placeholder="Any concerns, interactions, or additional notes..."
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
            Complete Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}