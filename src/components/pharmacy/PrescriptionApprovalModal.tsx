import React, { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ShieldCheck,
  AlertTriangle,
  Pill,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';
import { checkPrescriptionSafety } from '@/hooks/usePrescriptionSafety';

export interface PrescriptionApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  onApprove: (data: { prescriptionId: string; notes?: string }) => void;
  isLoading?: boolean;
}

export function PrescriptionApprovalModal({
  open,
  onOpenChange,
  prescription,
  onApprove,
  isLoading = false,
}: PrescriptionApprovalModalProps) {
  const [overrideNotes, setOverrideNotes] = useState('');

  const medicationNames = useMemo(() => {
    if (!prescription?.items) return [];
    return prescription.items.map((item: any) => item.medication_name).filter(Boolean);
  }, [prescription?.items]);

  const patientAllergies = useMemo(() => {
    if (!prescription?.patient) return [];
    const allergies = (prescription.patient as any).allergies;
    if (Array.isArray(allergies)) return allergies;
    if (typeof allergies === 'string' && allergies.trim()) {
      return allergies.split(',').map((a: string) => a.trim());
    }
    return [];
  }, [prescription?.patient]);

  // Run DUR and Allergy Safety Check across all items
  const safetyResults = useMemo(() => {
    if (!medicationNames.length) return { alerts: [], hasContraindication: false };

    const alerts: Array<{
      type: 'allergy' | 'interaction';
      severity: string;
      title: string;
      message: string;
    }> = [];

    medicationNames.forEach((med: string) => {
      const otherMeds = medicationNames.filter((m: string) => m !== med);
      const res = checkPrescriptionSafety(med, patientAllergies, otherMeds);

      res.allergyAlerts.forEach((a) => {
        alerts.push({
          type: 'allergy',
          severity: a.severity,
          title: `Allergy Alert: ${a.medication} (${a.allergen})`,
          message: a.message,
        });
      });

      res.drugInteractions.forEach((d) => {
        alerts.push({
          type: 'interaction',
          severity: d.severity,
          title: `DDI: ${d.drug1} + ${d.drug2}`,
          message: d.message,
        });
      });
    });

    const hasContraindication = alerts.some(
      (a) =>
        a.severity === 'contraindicated' || a.severity === 'critical' || a.severity === 'severe'
    );

    return { alerts, hasContraindication };
  }, [medicationNames, patientAllergies]);

  const canSubmit = !safetyResults.hasContraindication || overrideNotes.trim().length >= 15;

  const handleSubmit = () => {
    if (!prescription?.id) return;
    onApprove({
      prescriptionId: prescription.id,
      notes: overrideNotes.trim() || undefined,
    });
    setOverrideNotes('');
  };

  if (!prescription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Pharmacist Clinical Verification & DUR Review
          </DialogTitle>
          <DialogDescription>
            ADR-0004 Gated Approval: Review patient allergies, drug interactions, and clinical
            safety before approving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Patient Details */}
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground text-xs">Patient:</span>
                <p className="font-medium">
                  {prescription.patient?.first_name} {prescription.patient?.last_name}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">MRN:</span>
                <p className="font-mono text-xs font-semibold">
                  {prescription.patient?.mrn || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Prescriber:</span>
                <p className="font-medium">
                  Dr. {prescription.prescriber?.first_name} {prescription.prescriber?.last_name}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Documented Allergies:</span>
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {patientAllergies.length > 0 ? (
                    patientAllergies.map((allergy: string, i: number) => (
                      <Badge key={i} variant="destructive" className="text-[10px] py-0 px-1.5">
                        {allergy}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      None documented (NKDA)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Prescribed Items */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Prescription Items ({prescription.items?.length || 0})
            </h4>
            <div className="space-y-2">
              {prescription.items?.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-md border text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{item.medication_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {item.dosage} • {item.frequency} • {item.duration}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">Qty: {item.quantity}</Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* DUR & Safety Check Findings */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Drug Utilization Review (DUR) & Safety Screening
              </h4>
              {safetyResults.alerts.length === 0 ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All Checks Clear
                </Badge>
              ) : safetyResults.hasContraindication ? (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertOctagon className="h-3 w-3 mr-1" />
                  Contraindicated / Severe
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Warnings Present
                </Badge>
              )}
            </div>

            {safetyResults.alerts.length === 0 ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                No high-risk drug-drug interactions or cross-reactive allergy alerts detected for
                this prescription.
              </div>
            ) : (
              <div className="space-y-2">
                {safetyResults.alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`rounded-md p-3 text-xs border ${
                      alert.severity === 'contraindicated' ||
                      alert.severity === 'severe' ||
                      alert.severity === 'critical'
                        ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                        : 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      <span>{alert.title}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] capitalize">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 pl-5 text-[11px] opacity-90">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pharmacist Override Justification for Contraindicated Orders */}
          {safetyResults.hasContraindication && (
            <div className="rounded-lg border border-red-300 bg-red-50/60 p-3 space-y-2 dark:border-red-900/60 dark:bg-red-950/30">
              <Label
                htmlFor="dur-override"
                className="text-xs font-semibold text-red-900 dark:text-red-300 flex items-center gap-1"
              >
                <Lock className="h-3.5 w-3.5" />
                Mandatory Pharmacist Clinical Override Justification *
              </Label>
              <p className="text-[11px] text-red-800 dark:text-red-400">
                Severe safety contraindication detected. Approval requires detailed clinical
                documentation (minimum 15 characters).
              </p>
              <Textarea
                id="dur-override"
                rows={3}
                placeholder="Document clinical risk-benefit evaluation, attending physician discussion, or specific monitoring protocol..."
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="text-xs bg-white dark:bg-background"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve & Release to Dispense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
