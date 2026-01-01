import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateRefillRequest } from '@/hooks/useRefillRequests';
import { Loader2 } from 'lucide-react';

interface RefillRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: {
    id: string;
    patient_id: string;
    hospital_id: string;
    items?: Array<{
      medication_name: string;
      dosage: string;
    }>;
  };
}

export function RefillRequestModal({ open, onOpenChange, prescription }: RefillRequestModalProps) {
  const [reason, setReason] = useState('');
  const createRefillRequest = useCreateRefillRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createRefillRequest.mutateAsync({
      prescriptionId: prescription.id,
      patientId: prescription.patient_id,
      hospitalId: prescription.hospital_id,
      reason: reason || undefined,
    });

    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Prescription Refill</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Medications</Label>
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              {prescription.items?.map((item, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{item.medication_name}</span>
                  <span className="text-muted-foreground"> - {item.dosage}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for refill (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Running low on medication..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRefillRequest.isPending}>
              {createRefillRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
