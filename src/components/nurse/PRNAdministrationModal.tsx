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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  HeartPulse,
  Pill,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface PRNAdministrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  patient: any;
  onAdministerPRN: (data: {
    prescriptionId: string;
    patientId: string;
    medicationName: string;
    dosage: string;
    route: string;
    indication: string;
    baselineScore: string;
    notes?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function PRNAdministrationModal({
  open,
  onOpenChange,
  prescription,
  patient,
  onAdministerPRN,
  isLoading = false,
}: PRNAdministrationModalProps) {
  const [indication, setIndication] = useState('Acute Pain');
  const [baselineScore, setBaselineScore] = useState('7');
  const [route, setRoute] = useState('Oral');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && prescription) {
      const name = (prescription.medication_name || '').toLowerCase();
      if (
        name.includes('ondansetron') ||
        name.includes('metoclopramide') ||
        name.includes('zofran')
      ) {
        setIndication('Nausea / Vomiting');
        setBaselineScore('Moderate');
      } else if (
        name.includes('paracetamol') ||
        name.includes('acetaminophen') ||
        name.includes('tylenol')
      ) {
        setIndication('Fever / Pain');
        setBaselineScore('6');
      } else if (name.includes('albuterol') || name.includes('salbutamol')) {
        setIndication('Shortness of Breath / Wheezing');
        setBaselineScore('Dyspnea Grade 2');
      } else {
        setIndication('Acute Pain');
        setBaselineScore('7');
      }
      setRoute('Oral');
      setNotes('');
    }
  }, [open, prescription]);

  if (!prescription || !patient) return null;

  const handleSubmit = async () => {
    if (!baselineScore.trim()) {
      toast.error('Please record the patient pre-administration baseline symptom score.');
      return;
    }

    await onAdministerPRN({
      prescriptionId: prescription.id,
      patientId: patient.id,
      medicationName: prescription.medication_name,
      dosage: prescription.dosage,
      route,
      indication,
      baselineScore,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5 text-indigo-600" />
              <span>Administer PRN (As-Needed) Medication</span>
            </DialogTitle>
            <Badge variant="secondary" className="font-semibold">
              PRN Dose
            </Badge>
          </div>
          <DialogDescription>
            Document clinical indication and baseline severity score. Automatic follow-up
            reassessment prompt will be scheduled in 45 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Patient Header */}
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

          {/* Indication Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Clinical Indication *</Label>
            <Select value={indication} onValueChange={setIndication}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Acute Pain">Acute Pain (Breakthrough)</SelectItem>
                <SelectItem value="Chronic Pain Flare">Chronic Pain Flare</SelectItem>
                <SelectItem value="Nausea / Vomiting">Nausea / Emesis</SelectItem>
                <SelectItem value="Fever / Hyperthermia">Fever / Temperature Spike</SelectItem>
                <SelectItem value="Shortness of Breath / Wheezing">
                  Dyspnea / Bronchospasm
                </SelectItem>
                <SelectItem value="Acute Anxiety / Agitation">Acute Anxiety / Agitation</SelectItem>
                <SelectItem value="Insomnia">Insomnia / Sleep Disturbance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Baseline Symptom Score */}
          <div className="space-y-1.5">
            <Label
              htmlFor="baseline-score"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span>Baseline Symptom Score (Pre-Dose) *</span>
              <span className="text-[11px] text-muted-foreground">
                e.g. Pain 0-10 or Mild/Mod/Severe
              </span>
            </Label>
            <Input
              id="baseline-score"
              value={baselineScore}
              onChange={(e) => setBaselineScore(e.target.value)}
              placeholder="e.g. Pain 8/10 (Severe), or Temp 38.5C"
              className="h-8 text-xs font-medium"
            />
          </div>

          {/* Route */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Route</Label>
            <Select value={route} onValueChange={setRoute}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oral">Oral (PO)</SelectItem>
                <SelectItem value="Intravenous (IV Push)">Intravenous (IV Push)</SelectItem>
                <SelectItem value="Subcutaneous (SubQ)">Subcutaneous (SubQ)</SelectItem>
                <SelectItem value="Intramuscular (IM)">Intramuscular (IM)</SelectItem>
                <SelectItem value="Sublingual">Sublingual</SelectItem>
                <SelectItem value="Inhalation">Inhalation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reassessment Banner */}
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
            <Clock className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Closed-Loop Reassessment Scheduled:</strong> An outcome evaluation reminder
              will prompt you in 45 minutes to document post-dose pain/symptom relief.
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="prn-notes" className="text-xs">
              Clinical Remarks
            </Label>
            <Textarea
              id="prn-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient requested dose after physical therapy. Non-pharmacological repositioning attempted."
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSubmit}
            disabled={isLoading || !baselineScore.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Administering...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Sign & Administer PRN
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
