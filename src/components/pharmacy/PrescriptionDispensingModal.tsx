import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AlertTriangle, CheckCircle2, Pill, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const dispenseSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  notes: z.string().optional(),
});

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
  const [patientVerified, setPatientVerified] = useState(false);
  const [safetyChecksComplete, setSafetyChecksComplete] = useState(false);

  const form = useForm<z.infer<typeof dispenseSchema>>({
    resolver: zodResolver(dispenseSchema),
    defaultValues: { batchNumber: '', notes: '' },
  });

  const handleDispense = form.handleSubmit((data) => {
    if (!patientVerified) {
      toast.error('Please verify patient identity before dispensing');
      return;
    }
    if (!safetyChecksComplete) {
      toast.error('Please complete all safety checks before dispensing');
      return;
    }

    onDispense({
      batchNumber: data.batchNumber,
      patientVerified,
      safetyChecksComplete,
      notes: (data.notes ?? '').trim(),
    });

    form.reset();
    setPatientVerified(false);
    setSafetyChecksComplete(false);
  });

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

        <Form {...form}>
          <form onSubmit={handleDispense} className="space-y-6">
            {/* Patient info */}
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

            {/* Medications */}
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

            {/* Safety verification */}
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
                  <label htmlFor="patientVerified" className="text-sm cursor-pointer">
                    Patient identity verified
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="safetyChecks"
                    checked={safetyChecksComplete}
                    onCheckedChange={(checked) => setSafetyChecksComplete(checked === true)}
                  />
                  <label htmlFor="safetyChecks" className="text-sm cursor-pointer">
                    Safety checks complete
                  </label>
                </div>
              </div>
            </div>

            {/* Batch number — inline FormMessage */}
            <FormField
              control={form.control}
              name="batchNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Batch Number <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter batch number..." autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes{' '}
                    <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dispensing notes..." rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !patientVerified || !safetyChecksComplete}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Dispensing…' : 'Dispense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
