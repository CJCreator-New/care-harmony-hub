import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { XCircle, AlertTriangle, Bell, FileWarning, Loader2 } from 'lucide-react';
import { WITHHOLDING_REASONS } from '@/lib/clinical/medicationAdministrationRules';
import { toast } from 'sonner';

export interface DoseWithholdingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  patient: any;
  onWithhold: (data: {
    prescriptionId: string;
    patientId: string;
    medicationName: string;
    status: 'withheld' | 'refused';
    reasonCode: string;
    reasonLabel: string;
    clinicalNotes: string;
    alertDoctor: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function DoseWithholdingModal({
  open,
  onOpenChange,
  prescription,
  patient,
  onWithhold,
  isLoading = false,
}: DoseWithholdingModalProps) {
  const [withholdType, setWithholdType] = useState<'withheld' | 'refused'>('withheld');
  const [reasonCode, setReasonCode] = useState('vitals_out_of_range');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [alertDoctor, setAlertDoctor] = useState(true);

  useEffect(() => {
    if (open) {
      setWithholdType('withheld');
      setReasonCode('vitals_out_of_range');
      setClinicalNotes('');
      setAlertDoctor(true);
    }
  }, [open]);

  if (!prescription || !patient) return null;

  const currentReason = WITHHOLDING_REASONS.find((r) => r.code === reasonCode);

  const handleSubmit = async () => {
    if (clinicalNotes.trim().length < 5) {
      toast.error(
        'Please document specific clinical rationale for withholding or refusal (min 5 chars).'
      );
      return;
    }

    await onWithhold({
      prescriptionId: prescription.id,
      patientId: patient.id,
      medicationName: prescription.medication_name,
      status: withholdType,
      reasonCode,
      reasonLabel: currentReason?.label || reasonCode,
      clinicalNotes: clinicalNotes.trim(),
      alertDoctor,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5 text-destructive" />
            <span>Document Withheld or Refused Medication Dose</span>
          </DialogTitle>
          <DialogDescription>
            Record clinical reason for not administering scheduled dose and dispatch notification to
            the attending physician.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Drug & Patient Summary */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <strong className="text-foreground text-sm">{prescription.medication_name}</strong>
              <Badge variant="outline">{prescription.dosage}</Badge>
            </div>
            <div className="text-muted-foreground">
              Patient:{' '}
              <strong>
                {patient.first_name} {patient.last_name}
              </strong>{' '}
              (MRN: {patient.mrn || 'N/A'})
            </div>
          </div>

          {/* Type Toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Action Classification *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant={withholdType === 'withheld' ? 'default' : 'outline'}
                onClick={() => setWithholdType('withheld')}
                className="text-xs h-8"
              >
                Withheld (Clinical Hold)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={withholdType === 'refused' ? 'destructive' : 'outline'}
                onClick={() => setWithholdType('refused')}
                className="text-xs h-8"
              >
                Patient Refused Dose
              </Button>
            </div>
          </div>

          {/* Reason Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Standard Reason Code *</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WITHHOLDING_REASONS.map((r) => (
                  <SelectItem key={r.code} value={r.code} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clinical Notes */}
          <div className="space-y-1.5">
            <Label
              htmlFor="withhold-notes"
              className="text-xs font-semibold flex items-center gap-1.5"
            >
              <FileWarning className="h-3.5 w-3.5 text-muted-foreground" />
              Clinical Observations & Context *
            </Label>
            <Textarea
              id="withhold-notes"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. SBP was 84/52 mmHg prior to lisinopril dose. Patient asymptomatic. Dose withheld per protocol."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Doctor Alert Checkbox */}
          <div className="rounded-lg border p-3 bg-amber-500/10 border-amber-500/20 flex items-start space-x-2.5">
            <Checkbox
              id="alert-prescriber"
              checked={alertDoctor}
              onCheckedChange={(c) => setAlertDoctor(Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <label
                htmlFor="alert-prescriber"
                className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
              >
                <Bell className="h-3.5 w-3.5 text-amber-600" />
                Alert Attending Physician of Missed / Held Dose
              </label>
              <p className="text-[11px] text-muted-foreground">
                Flags the held dose in the doctor's rounding queue so therapeutic alternatives can
                be ordered if needed.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading || clinicalNotes.trim().length < 5}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                Record {withholdType === 'refused' ? 'Patient Refusal' : 'Clinical Hold'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
