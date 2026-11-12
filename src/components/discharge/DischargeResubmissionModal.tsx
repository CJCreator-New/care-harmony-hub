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
import { AlertTriangle, RotateCcw, CheckCircle2, XCircle, FileText, Loader2 } from 'lucide-react';
import { ConfirmDestructiveAction } from '@/components/common/ConfirmDestructiveAction';
import { usePatient } from '@/lib/hooks/patients';
import { toast } from 'sonner';

export interface DischargeResubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: any;
  onResubmit: (workflowId: string, metadata: Record<string, unknown>) => Promise<void>;
  onCancel: (workflowId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function DischargeResubmissionModal({
  open,
  onOpenChange,
  workflow,
  onResubmit,
  onCancel,
  isLoading = false,
}: DischargeResubmissionModalProps) {
  const { data: patient } = usePatient(workflow?.patient_id || '');
  const [remediationNotes, setRemediationNotes] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setRemediationNotes('');
      setCancelOpen(false);
    }
  }, [open]);

  if (!workflow) return null;

  const handleConfirmResubmit = async () => {
    if (remediationNotes.trim().length < 5) {
      toast.error(
        'Please describe the clinical revisions made to resolve the return issue (min 5 characters).'
      );
      return;
    }

    const updatedMetadata = {
      ...(workflow.metadata || {}),
      remediation: {
        resolvedRejectionReason: workflow.rejection_reason,
        remediationNotes: remediationNotes.trim(),
        resubmittedAt: new Date().toISOString(),
      },
    };

    await onResubmit(workflow.id, updatedMetadata);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <RotateCcw className="h-5 w-5" />
            <span>Remediate Returned Discharge Order</span>
          </DialogTitle>
          <DialogDescription>
            Review rejection rationale from downstream disciplines, revise clinical instructions,
            and resubmit back into the pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Patient Info */}
          <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-2 gap-2 text-xs">
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
          </div>

          {/* Previous Rejection Alert */}
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-destructive font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>Downstream Return Rationale</span>
            </div>
            <p className="text-destructive font-medium">
              {workflow.rejection_reason ||
                'Workflow was returned for clinical or administrative review.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="remediation-notes"
              className="text-xs font-semibold flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              Doctor's Clinical Remediation & Order Adjustments *
            </Label>
            <Textarea
              id="remediation-notes"
              value={remediationNotes}
              onChange={(e) => setRemediationNotes(e.target.value)}
              placeholder="e.g. Reviewed pharmacy interaction. Discontinued Lisinopril, replaced with Amlodipine 5mg oral daily. Cleared for re-reconciliation."
              rows={4}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 justify-between">
          <div className="flex justify-between w-full">
            <ConfirmDestructiveAction
              open={cancelOpen}
              onOpenChange={setCancelOpen}
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={isLoading}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Cancel Workflow Completely
                </Button>
              }
              title="Cancel this discharge workflow?"
              description={
                <p>
                  The discharge order for {patient ? `${patient.first_name} ${patient.last_name}` : 'this patient'} will
                  be cancelled and cannot be resubmitted. The rationale is saved in the audit history.
                </p>
              }
              confirmLabel="Confirm cancellation"
              reasonLabel="Cancellation rationale"
              reasonPlaceholder="e.g. Patient condition requires extended admission. Discharge aborted."
              isPending={isLoading}
              onConfirm={(reason) => onCancel(workflow.id, reason)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Close
              </Button>
              <Button
                type="button"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmResubmit}
                disabled={isLoading || remediationNotes.trim().length < 5}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Resubmit to Pharmacy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
