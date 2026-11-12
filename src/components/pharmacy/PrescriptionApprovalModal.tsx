import { useMemo, useState } from 'react';
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
import { ShieldCheck, AlertTriangle, Pill, CheckCircle2, AlertOctagon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OrderSafetyPanel } from '@/components/prescriptions/OrderSafetyPanel';
import {
  buildPrescriptionSafetyColumns,
  overrideSummary,
  priorOverridesForFindings,
  toOrderItems,
  useOrderSafety,
  usePatientClinicalContext,
  type PatientClinicalContext,
  type PrescriptionSafetyColumns,
} from '@/modules/order-safety';

export interface PrescriptionApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: any;
  onApprove: (data: {
    prescriptionId: string;
    notes?: string;
    /** Pharmacist safety verification to append to the prescription's safety record. */
    safety?: PrescriptionSafetyColumns;
  }) => void;
  isLoading?: boolean;
}

const isUnreadableName = (name: unknown) =>
  typeof name !== 'string' || !name.trim() || name.startsWith('__ENCRYPTED__') || name === '[Encrypted]';

/**
 * Pharmacist verification (ADR-0004) with the fail-closed order-safety engine.
 * Allergies and current medications are loaded from the patient record (the
 * previous version read `prescription.patient.allergies`, which the queue query
 * never selected, so allergy checks always ran against an empty list).
 */
export function PrescriptionApprovalModal({
  open,
  onOpenChange,
  prescription,
  onApprove,
  isLoading = false,
}: PrescriptionApprovalModalProps) {
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  const patientId: string | undefined = prescription?.patient_id ?? prescription?.patient?.id;
  const safetyContext = usePatientClinicalContext({
    patientId,
    enabled: open && !!patientId,
    excludePrescriptionId: prescription?.id,
  });

  const rawItems: any[] = useMemo(() => prescription?.items ?? [], [prescription?.items]);
  const unreadableCount = rawItems.filter((i) => isUnreadableName(i?.medication_name)).length;

  // Medication names that could not be decrypted cannot be screened: fail closed.
  const patient: PatientClinicalContext | null = useMemo(() => {
    const ctx = safetyContext.context;
    if (!ctx) return null;
    if (unreadableCount === 0) return ctx;
    return {
      ...ctx,
      dataGaps: [
        ...(ctx.dataGaps || []),
        `${unreadableCount} medication name(s) on this prescription could not be decrypted`,
      ],
    };
  }, [safetyContext.context, unreadableCount]);

  const items = useMemo(
    () => toOrderItems(rawItems.filter((i) => !isUnreadableName(i?.medication_name)), 'item'),
    [rawItems]
  );
  // Unreadable-only prescriptions still need the incomplete-screening finding.
  const evaluatedItems = useMemo(
    () =>
      items.length > 0 || unreadableCount === 0
        ? items
        : [{ clientItemId: 'unreadable', drugName: 'Unreadable medication', doseMg: Number.NaN, route: 'UNSPECIFIED' as const, frequency: 'unspecified' }],
    [items, unreadableCount]
  );

  const safety = useOrderSafety({
    patient,
    items: evaluatedItems,
    actingRole: 'pharmacist',
    enabled: open,
    isContextLoading: safetyContext.isLoading,
    contextError: safetyContext.loadError,
  });

  const priorOverrides = useMemo(
    () =>
      priorOverridesForFindings(
        [...(prescription?.allergy_alerts ?? []), ...(prescription?.drug_interactions ?? [])],
        safety.findings
      ),
    [prescription?.allergy_alerts, prescription?.drug_interactions, safety.findings]
  );
  const withoutPrescriberOverride = safety.findings.filter(
    (f) => f.requiresPhysicianOverride && !f.isHardStop && !priorOverrides[f.code]
  ).length;

  const allergyList = safetyContext.context?.allergies ?? [];
  const allergyUnknown = safetyContext.context?.allergyStatusUnknown;

  const handleSubmit = async () => {
    if (!prescription?.id || !safety.canProceed) return;
    setIsSigning(true);
    try {
      const receipt = await safety.clearAndSign('PHARMACIST_DISPENSE');
      const notes = [
        generalNotes.trim() || undefined,
        overrideSummary(safety.findings, receipt.overridesApplied).replace(
          /\[CLINICAL SAFETY OVERRIDE\]/g,
          '[PHARMACIST VERIFICATION]'
        ) || undefined,
      ]
        .filter(Boolean)
        .join('\n');
      onApprove({
        prescriptionId: prescription.id,
        notes: notes || undefined,
        safety: buildPrescriptionSafetyColumns(safety.findings, receipt),
      });
      setGeneralNotes('');
    } catch (err) {
      toast.error(`Safety verification failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSigning(false);
    }
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
            ADR-0004 gated approval: review allergies, interactions and dosing before releasing the
            prescription for dispensing.
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
                <p className="font-mono text-xs font-semibold">{prescription.patient?.mrn || 'N/A'}</p>
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
                  {safetyContext.isLoading ? (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  ) : !safetyContext.context ? (
                    <span className="text-xs font-semibold text-destructive">Unavailable</span>
                  ) : allergyList.length > 0 ? (
                    allergyList.map((allergy: string) => (
                      <Badge key={allergy} variant="destructive" className="text-[10px] py-0 px-1.5">
                        {allergy}
                      </Badge>
                    ))
                  ) : allergyUnknown ? (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Not recorded
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No known allergies</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Prescribed Items */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Prescription Items ({rawItems.length})
            </h4>
            <div className="space-y-2">
              {rawItems.map((item: any, idx: number) => (
                <div
                  key={item?.id ?? idx}
                  className="flex items-center justify-between p-2.5 rounded-md border text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    <div>
                      <span className="font-medium text-foreground">
                        {isUnreadableName(item?.medication_name) ? 'Unreadable (decryption failed)' : item.medication_name}
                      </span>
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

          {/* DUR & Safety Screening */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" />
                Drug Utilization Review (DUR) & Safety Screening
              </h4>
              {safety.status === 'checking' ? (
                <Badge variant="outline">Checking…</Badge>
              ) : safety.status === 'error' || safety.hasHardStop ? (
                <Badge variant="destructive">
                  <AlertOctagon className="h-3 w-3 mr-1" aria-hidden="true" />
                  Blocked
                </Badge>
              ) : safety.findings.some((f) => f.requiresPhysicianOverride) ? (
                <Badge variant="secondary">
                  <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                  Verification required
                </Badge>
              ) : (
                <Badge variant="outline">
                  <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden="true" />
                  No blocking findings
                </Badge>
              )}
            </div>

            {withoutPrescriberOverride > 0 && (
              <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                {withoutPrescriberOverride} finding(s) have no prescriber override on record. Contact
                the prescriber before verifying, and record the outcome in the note.
              </p>
            )}

            <OrderSafetyPanel
              safety={safety}
              priorOverrides={priorOverrides}
              overrideLabel="Pharmacist verification note"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pharmacist-general-notes" className="text-xs font-semibold">
              Verification notes (optional)
            </Label>
            <Textarea
              id="pharmacist-general-notes"
              rows={2}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isSigning}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isSigning || !safety.canProceed}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading || isSigning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Approve & Release to Dispense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
