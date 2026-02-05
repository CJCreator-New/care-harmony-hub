import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle2, Pill, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PrescriptionDispensingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: {
    id: string;
    patient_name: string;
    patient_mrn: string;
    doctor_name: string;
    items: Array<{
      medication_name: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions: string;
    }>;
    created_at: string;
  } | null;
  onDispense: (data: {
    batchNumber: string;
    patientVerified: boolean;
    safetyChecksComplete: boolean;
    notes: string;
  }) => void;
  isLoading?: boolean;
}

export function PrescriptionDispensingModal({
  open,
  onOpenChange,
  prescription,
  onDispense,
  isLoading = false,
}: PrescriptionDispensingModalProps) {
  const [batchNumber, setBatchNumber] = useState('');
  const [patientVerified, setPatientVerified] = useState(false);
  const [safetyChecksComplete, setSafetyChecksComplete] = useState(false);
  const [notes, setNotes] = useState('');

  const handleDispense = () => {
    if (!patientVerified) {
      toast.error('Please verify patient identity');
      return;
    }
    if (!safetyChecksComplete) {
      toast.error('Please complete safety checks');
      return;
    }
    if (!batchNumber.trim()) {
      toast.error('Please enter batch number');
      return;
    }

    onDispense({
      batchNumber: batchNumber.trim(),
      patientVerified,
      safetyChecksComplete,
      notes: notes.trim(),
    });

    setBatchNumber('');
    setPatientVerified(false);
    setSafetyChecksComplete(false);
    setNotes('');
  };

  if (!prescription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Dispense Prescription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              <h3 className="font-medium">Patient Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{prescription.patient_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">MRN:</span>
                <p className="font-medium">{prescription.patient_mrn}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Medications to Dispense</h3>
            <div className="space-y-3">
              {prescription.items.map((item) => (
                <div key={`${item.medication_name}-${item.dosage}`} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-primary">{item.medication_name}</h4>
                    <Badge variant="outline">Qty: {item.quantity}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Dosage: {item.dosage}</div>
                    <div>Frequency: {item.frequency}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Safety Verification
            </h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="patientVerified"
                  checked={patientVerified}
                  onCheckedChange={(checked) => setPatientVerified(checked === true)}
                />
                <Label htmlFor="patientVerified" className="cursor-pointer">
                  Patient identity verified
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="safetyChecks"
                  checked={safetyChecksComplete}
                  onCheckedChange={(checked) => setSafetyChecksComplete(checked === true)}
                />
                <Label htmlFor="safetyChecks" className="cursor-pointer">
                  Safety checks complete
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchNumber">Batch Number *</Label>
            <Input
              id="batchNumber"
              placeholder="Enter batch number..."
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              data-autofocus="true"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Dispensing notes..."
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
          <Button 
            onClick={handleDispense} 
            disabled={isLoading || !patientVerified || !safetyChecksComplete}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Dispense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
