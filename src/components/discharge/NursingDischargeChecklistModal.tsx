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
import { Checkbox } from '@/components/ui/checkbox';
import {
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
  Bed,
  Thermometer,
  FileText,
  Truck,
  HeartPulse,
  Loader2,
} from 'lucide-react';
import { usePatient } from '@/lib/hooks/patients';
import { toast } from 'sonner';

export interface NursingDischargeChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: any;
  onApprove: (workflowId: string, metadata: Record<string, unknown>) => Promise<void>;
  onReject: (
    workflowId: string,
    reason: string,
    rejectionType: 'clinical' | 'administrative'
  ) => Promise<void>;
  isLoading?: boolean;
}

export function NursingDischargeChecklistModal({
  open,
  onOpenChange,
  workflow,
  onApprove,
  onReject,
  isLoading = false,
}: NursingDischargeChecklistModalProps) {
  const { data: patient } = usePatient(workflow?.patient_id || '');

  // 7 Critical Nursing Safety Gates
  const [linesRemoved, setLinesRemoved] = useState(false);
  const [foleyRemoved, setFoleyRemoved] = useState(false);
  const [vitalsStable, setVitalsStable] = useState(false);
  const [dischargeNEWS2, setDischargeNEWS2] = useState('0');
  const [educationCompleted, setEducationCompleted] = useState(false);
  const [paperworkHandedOver, setPaperworkHandedOver] = useState(false);
  const [transportArranged, setTransportArranged] = useState(false);
  const [bedMarkedCleaning, setBedMarkedCleaning] = useState(true);
  const [nurseNotes, setNurseNotes] = useState('');

  // Clinical Deterioration Rollback form
  const [showDeteriorationForm, setShowDeteriorationForm] = useState(false);
  const [deteriorationReason, setDeteriorationReason] = useState('');

  useEffect(() => {
    if (open) {
      setLinesRemoved(false);
      setFoleyRemoved(false);
      setVitalsStable(false);
      setDischargeNEWS2('0');
      setEducationCompleted(false);
      setPaperworkHandedOver(false);
      setTransportArranged(false);
      setBedMarkedCleaning(true);
      setNurseNotes('');
      setShowDeteriorationForm(false);
      setDeteriorationReason('');
    }
  }, [open]);

  if (!workflow) return null;

  const allGatesPassed =
    linesRemoved &&
    foleyRemoved &&
    vitalsStable &&
    educationCompleted &&
    paperworkHandedOver &&
    transportArranged;

  const handleConfirmApprove = async () => {
    if (!allGatesPassed) {
      toast.error('All physical nursing safety gates must be completed prior to discharge.');
      return;
    }

    const news2Num = parseInt(dischargeNEWS2, 10);
    if (isNaN(news2Num) || news2Num > 4) {
      toast.error('Patient discharge NEWS2 score must be <= 4 for safe unmonitored discharge.');
      return;
    }

    const checklistPayload: Record<string, unknown> = {
      linesRemoved,
      foleyRemoved,
      vitalsStable,
      dischargeNEWS2: news2Num,
      educationCompleted,
      paperworkHandedOver,
      transportArranged,
      bedMarkedCleaning,
      nurseNotes:
        nurseNotes.trim() ||
        'Physical discharge safety checklist completed. Patient discharged home in stable condition.',
      completedAt: new Date().toISOString(),
    };

    await onApprove(workflow.id, {
      nursingChecklist: checklistPayload,
    });
  };

  const handleConfirmDeteriorationRollback = async () => {
    if (deteriorationReason.trim().length < 5) {
      toast.error(
        'Please document specific clinical deterioration findings (at least 5 characters).'
      );
      return;
    }

    // Direct rollback to Doctor
    await onReject(workflow.id, deteriorationReason.trim(), 'clinical');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Nursing Final Discharge Safety Checklist</span>
            </DialogTitle>
            <Badge variant="outline">Final Stage (4 / 4)</Badge>
          </div>
          <DialogDescription>
            Verify patient physical readiness, line removals, teach-back education, and handover
            before closing the discharge workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Patient Details */}
          <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">Patient</span>
              <strong className="text-foreground">
                {patient
                  ? `${patient.first_name} ${patient.last_name}`
                  : workflow.patient_id.slice(0, 8)}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">MRN</span>
              <span className="font-mono">{patient?.mrn || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Pharmacy Clearance</span>
              <Badge
                variant="outline"
                className="text-emerald-700 bg-emerald-50 border-emerald-300"
              >
                Cleared
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground block">Billing Clearance</span>
              <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-300">
                Settled
              </Badge>
            </div>
          </div>

          {!showDeteriorationForm ? (
            <>
              {/* Mandatory Checklist Items */}
              <div className="space-y-2.5 rounded-lg border p-4 bg-muted/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Mandatory Clinical Exit Verification (All Required)
                </h4>

                {/* Gate 1 */}
                <div className="flex items-start space-x-2.5 pt-1">
                  <Checkbox
                    id="lines-removed"
                    checked={linesRemoved}
                    onCheckedChange={(c) => setLinesRemoved(Boolean(c))}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="lines-removed"
                    className="text-xs leading-tight cursor-pointer font-medium"
                  >
                    <strong>Invasive Lines Removed:</strong> Peripheral IV cannula, arterial lines,
                    or central catheters removed; insertion sites inspected with dry sterile
                    pressure dressing intact.
                  </label>
                </div>

                {/* Gate 2 */}
                <div className="flex items-start space-x-2.5 pt-1">
                  <Checkbox
                    id="foley-removed"
                    checked={foleyRemoved}
                    onCheckedChange={(c) => setFoleyRemoved(Boolean(c))}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="foley-removed"
                    className="text-xs leading-tight cursor-pointer font-medium"
                  >
                    <strong>Catheters & Drains Cleared:</strong> Foley catheter or surgical drains
                    removed without trauma (or caregiver demonstrated sterile home drainage
                    management).
                  </label>
                </div>

                {/* Gate 3 */}
                <div className="flex items-start space-x-2.5 pt-1">
                  <Checkbox
                    id="vitals-stable"
                    checked={vitalsStable}
                    onCheckedChange={(c) => setVitalsStable(Boolean(c))}
                    className="mt-0.5"
                  />
                  <div className="space-y-1 w-full">
                    <label
                      htmlFor="vitals-stable"
                      className="text-xs leading-tight cursor-pointer font-medium block"
                    >
                      <strong>Discharge Vital Signs Verified:</strong> Patient afebrile,
                      normotensive, SpO2 &gt;= 95% on room air, alert and oriented.
                    </label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <HeartPulse className="h-3 w-3 text-red-500" />
                        Discharge NEWS2 Score:
                      </span>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        value={dischargeNEWS2}
                        onChange={(e) => setDischargeNEWS2(e.target.value)}
                        className="h-6 w-16 text-xs text-center font-mono font-bold"
                      />
                      <span className="text-[10px] text-muted-foreground">(Must be &lt;= 4)</span>
                    </div>
                  </div>
                </div>

                {/* Gate 4 */}
                <div className="flex items-start space-x-2.5 pt-1">
                  <Checkbox
                    id="education-done"
                    checked={educationCompleted}
                    onCheckedChange={(c) => setEducationCompleted(Boolean(c))}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="education-done"
                    className="text-xs leading-tight cursor-pointer font-medium"
                  >
                    <strong>Teach-Back Patient Education:</strong> Medication administration
                    schedule, dietary restrictions, wound care, and warning symptoms for immediate
                    ER return reviewed.
                  </label>
                </div>

                {/* Gate 5 */}
                <div className="flex items-start space-x-2.5 pt-1">
                  <Checkbox
                    id="paperwork-done"
                    checked={paperworkHandedOver}
                    onCheckedChange={(c) => setPaperworkHandedOver(Boolean(c))}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="paperwork-done"
                    className="text-xs leading-tight cursor-pointer font-medium"
                  >
                    <strong>Discharge Packet Handover:</strong> Signed discharge summary, outpatient
                    prescriptions, and follow-up appointment slip provided in hand.
                  </label>
                </div>

                {/* Gate 6 */}
                <div className="flex items-start space-x-2.5 pt-1">
                  <Checkbox
                    id="transport-done"
                    checked={transportArranged}
                    onCheckedChange={(c) => setTransportArranged(Boolean(c))}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="transport-done"
                    className="text-xs leading-tight cursor-pointer font-medium"
                  >
                    <strong>Safe Escort & Transport:</strong> Accompanied via wheelchair /
                    ambulatory escort with confirmed family or medical transit pickup.
                  </label>
                </div>
              </div>

              {/* Facility Logistics */}
              <div className="rounded-lg border p-3 bg-muted/20 flex items-center space-x-2.5">
                <Checkbox
                  id="bed-cleaning"
                  checked={bedMarkedCleaning}
                  onCheckedChange={(c) => setBedMarkedCleaning(Boolean(c))}
                />
                <label
                  htmlFor="bed-cleaning"
                  className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Bed className="h-3.5 w-3.5 text-primary" />
                  Automatically transition Inpatient Bed to 'Requires Housekeeping Sanitization'
                </label>
              </div>

              {/* Nurse Notes */}
              <div className="space-y-1">
                <Label
                  htmlFor="nurse-discharge-notes"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Nursing Discharge Summary Remarks
                </Label>
                <Textarea
                  id="nurse-discharge-notes"
                  value={nurseNotes}
                  onChange={(e) => setNurseNotes(e.target.value)}
                  placeholder="e.g. Patient ambulated safely to vehicle with daughter. All questions answered. Dressing clean and intact."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </>
          ) : (
            /* Clinical Deterioration Rollback form */
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Clinical Deterioration — Abort Discharge Back to Doctor</span>
              </div>
              <p className="text-xs text-muted-foreground">
                If the patient spikes a fever, experiences acute chest pain, desaturates, or becomes
                hemodynamically unstable, immediately abort discharge and return the case to the
                attending physician.
              </p>

              <div className="space-y-1">
                <Label
                  htmlFor="nurse-deterioration-reason"
                  className="text-xs font-semibold text-destructive"
                >
                  Deterioration Findings & Urgent Clinical Rationale * (min 5 characters)
                </Label>
                <Textarea
                  id="nurse-deterioration-reason"
                  value={deteriorationReason}
                  onChange={(e) => setDeteriorationReason(e.target.value)}
                  placeholder="e.g. Patient developed acute dizziness, diaphoresis, and BP dropped to 85/50 upon standing. Rapid response called; discharge cancelled."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 justify-between">
          {!showDeteriorationForm ? (
            <div className="flex justify-between w-full">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeteriorationForm(true)}
                disabled={isLoading}
              >
                <AlertTriangle className="h-4 w-4 mr-1.5" />
                Clinical Deterioration (Return to Doctor)
              </Button>
              <div className="flex gap-2">
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
                  onClick={handleConfirmApprove}
                  disabled={isLoading || !allGatesPassed}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Complete Physical Discharge
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeteriorationForm(false)}
                disabled={isLoading}
              >
                Back to Safety Checklist
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDeteriorationRollback}
                disabled={isLoading || deteriorationReason.trim().length < 5}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Aborting Discharge...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-1.5" />
                    Confirm Clinical Rollback to Doctor
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
