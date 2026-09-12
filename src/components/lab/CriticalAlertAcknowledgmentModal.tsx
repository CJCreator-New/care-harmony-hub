import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AlertTriangle, PhoneCall, CheckCircle2, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface CriticalAlertAcknowledgmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  alert?: any;
  onAcknowledge: (data: {
    orderId: string;
    alertId?: string;
    clinicianName: string;
    clinicianRole: string;
    communicationChannel: string;
    verbalReadBackConfirmed: boolean;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function CriticalAlertAcknowledgmentModal({
  open,
  onOpenChange,
  order,
  alert,
  onAcknowledge,
  isLoading = false,
}: CriticalAlertAcknowledgmentModalProps) {
  const [clinicianName, setClinicianName] = useState('');
  const [clinicianRole, setClinicianRole] = useState('Attending Physician');
  const [communicationChannel, setCommunicationChannel] = useState('Direct Telephone');
  const [verbalReadBackConfirmed, setVerbalReadBackConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  if (!order) return null;

  const handleSubmit = async () => {
    if (!clinicianName.trim()) {
      toast.error('Please enter the name of the clinician who received and confirmed the result.');
      return;
    }
    if (!verbalReadBackConfirmed) {
      toast.error(
        'CLIA protocol requires verification that the clinician completed an accurate verbal read-back.'
      );
      return;
    }

    await onAcknowledge({
      orderId: order.id,
      alertId: alert?.id,
      clinicianName: clinicianName.trim(),
      clinicianRole,
      communicationChannel,
      verbalReadBackConfirmed: true,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Closed-Loop Critical Value Read-Back</span>
          </DialogTitle>
          <DialogDescription>
            Document mandatory verbal or digital read-back from the licensed caregiver to satisfy
            CLIA / CAP closed-loop communication requirements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Critical Value Details */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <strong className="text-foreground text-sm">{order.test_name}</strong>
              <Badge variant="destructive" className="animate-pulse">
                PANIC VALUE
              </Badge>
            </div>
            <div className="text-muted-foreground">
              Patient:{' '}
              <strong>
                {order.patient
                  ? `${order.patient.first_name} ${order.patient.last_name}`
                  : order.patient_id}
              </strong>
            </div>
            <div className="text-destructive font-medium pt-1 border-t border-destructive/20">
              {order.result_notes?.slice(0, 140) ||
                'Critical parameter breach requiring immediate clinical intervention.'}
            </div>
          </div>

          {/* Clinician Name */}
          <div className="space-y-1.5">
            <Label htmlFor="clinician-name" className="text-xs font-semibold">
              Receiving Clinician Name *
            </Label>
            <Input
              id="clinician-name"
              value={clinicianName}
              onChange={(e) => setClinicianName(e.target.value)}
              placeholder="e.g. Dr. Robert Chen, MD"
              className="h-8 text-xs"
            />
          </div>

          {/* Clinician Role & Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Clinician Role *</Label>
              <Select value={clinicianRole} onValueChange={setClinicianRole}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Attending Physician">Attending Physician</SelectItem>
                  <SelectItem value="Fellow / Specialist">Fellow / Specialist</SelectItem>
                  <SelectItem value="Resident Physician">Resident Physician</SelectItem>
                  <SelectItem value="Primary Care Nurse (RN)">Primary Care Nurse (RN)</SelectItem>
                  <SelectItem value="Charge Nurse">Charge Nurse</SelectItem>
                  <SelectItem value="Rapid Response Team">Rapid Response Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Communication Method *</Label>
              <Select value={communicationChannel} onValueChange={setCommunicationChannel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct Telephone">Direct Telephone</SelectItem>
                  <SelectItem value="In-Person Clinical Handoff">
                    In-Person Clinical Handoff
                  </SelectItem>
                  <SelectItem value="Stat Critical Pager Call-Back">
                    Stat Critical Pager Call-Back
                  </SelectItem>
                  <SelectItem value="Hospital Secure EMR Messaging">
                    Hospital Secure EMR Messaging
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Read-back confirmation checkbox */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="read-back-check"
                checked={verbalReadBackConfirmed}
                onCheckedChange={(c) => setVerbalReadBackConfirmed(Boolean(c))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label
                  htmlFor="read-back-check"
                  className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Mandatory Verbal Read-Back Confirmed
                </label>
                <p className="text-[11px] text-muted-foreground">
                  I certify that the clinician stated and verified: (1) Patient Name & Identifier,
                  (2) Test Name, and (3) Exact numeric panic values and units.
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="readback-notes" className="text-xs font-semibold">
              Clinical Action Taken / Communication Remarks
            </Label>
            <Textarea
              id="readback-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Attending notified, insulin drip ordered, repeat metabolic panel scheduled in 2 hours."
              rows={2}
              className="text-xs"
            />
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSubmit}
            disabled={isLoading || !verbalReadBackConfirmed || !clinicianName.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Confirm Verbal Read-Back & Close SLA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
