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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HelpCircle, Send, Loader2, Stethoscope, User, AlertCircle } from 'lucide-react';

export interface PrescriptionClarificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  onClarify: (data: {
    prescriptionId: string;
    clarificationReason: string;
    category: string;
    prescriberId?: string;
    patientId?: string;
  }) => void;
  isLoading?: boolean;
}

export function PrescriptionClarificationModal({
  open,
  onOpenChange,
  prescription,
  onClarify,
  isLoading = false,
}: PrescriptionClarificationModalProps) {
  const [category, setCategory] = useState('dosage_adjustment');
  const [reason, setReason] = useState('');

  const canSubmit = reason.trim().length >= 10;

  const handleSubmit = () => {
    if (!prescription?.id || !canSubmit) return;
    onClarify({
      prescriptionId: prescription.id,
      clarificationReason: reason.trim(),
      category,
      prescriberId: prescription.prescribed_by || prescription.prescriber?.id,
      patientId: prescription.patient_id || prescription.patient?.id,
    });
    setReason('');
    onOpenChange(false);
  };

  if (!prescription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <HelpCircle className="h-5 w-5" />
            Request Prescriber Clarification
          </DialogTitle>
          <DialogDescription>
            Hold this prescription in 'Awaiting Clarification' and dispatch an urgent clinical
            inquiry to the prescribing physician.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target Encounter Info */}
          <div className="rounded-lg border border-purple-200 bg-purple-50/40 dark:border-purple-900/50 dark:bg-purple-950/20 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between font-medium">
              <span className="flex items-center gap-1 text-purple-900 dark:text-purple-300">
                <User className="h-3.5 w-3.5" />
                Patient: {prescription.patient?.first_name} {prescription.patient?.last_name}
              </span>
              <span className="text-muted-foreground font-mono">
                MRN: {prescription.patient?.mrn || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>
                Prescriber: Dr. {prescription.prescriber?.first_name}{' '}
                {prescription.prescriber?.last_name}
              </span>
            </div>
          </div>

          {/* Category Select */}
          <div className="space-y-2">
            <Label htmlFor="clarification-category" className="text-xs font-medium">
              Clinical Inquiry Category *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="clarification-category" className="h-9 text-xs">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dosage_adjustment">Dosage / Frequency Optimization</SelectItem>
                <SelectItem value="contraindicated_interaction">
                  Potential Drug-Drug Interaction
                </SelectItem>
                <SelectItem value="allergy_concern">
                  Patient Allergy / Cross-Reactivity Concern
                </SelectItem>
                <SelectItem value="renal_clearance">
                  Renal / Hepatic Clearance Adjustment
                </SelectItem>
                <SelectItem value="formulary_substitution">
                  Formulary Generic Alternative
                </SelectItem>
                <SelectItem value="duplicate_therapy">Therapeutic Duplication</SelectItem>
                <SelectItem value="other">General Clinical Question</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inquiry Notes */}
          <div className="space-y-2">
            <Label htmlFor="clarification-notes" className="text-xs font-medium">
              Pharmacist Inquiry & Recommendation * (Min. 10 chars)
            </Label>
            <Textarea
              id="clarification-notes"
              rows={4}
              placeholder="e.g., Patient eGFR is 32 mL/min; recommended metformin reduction or substitution with linagliptin..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300 flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
            <span>
              Submitting this inquiry will update the prescription status to{' '}
              <strong>Awaiting Clarification</strong> and alert Dr.{' '}
              {prescription.prescriber?.last_name} with an amendment link.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send to Prescriber
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
