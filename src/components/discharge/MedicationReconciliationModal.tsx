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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pill,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Building2,
  ExternalLink,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { usePatient } from '@/lib/hooks/patients';
import { toast } from 'sonner';

export interface MedicationReconciliationModalProps {
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

interface InpatientMedItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  action: 'continue' | 'discontinue';
  notes: string;
}

interface DischargePrescriptionItem {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  fulfillment: 'in_house' | 'external';
}

interface InFlightOrderItem {
  orderId: string;
  orderType: 'lab' | 'medication';
  name: string;
  action: 'cancel' | 'await' | 'outpatient_followup';
  notes: string;
}

export function MedicationReconciliationModal({
  open,
  onOpenChange,
  workflow,
  onApprove,
  onReject,
  isLoading = false,
}: MedicationReconciliationModalProps) {
  const { data: patient } = usePatient(workflow?.patient_id || '');

  // Inpatient active MAR medications state
  const [inpatientMeds, setInpatientMeds] = useState<InpatientMedItem[]>([
    {
      id: 'med-1',
      name: 'Furosemide (Lasix)',
      dosage: '40mg IV',
      frequency: 'BID',
      action: 'discontinue',
      notes: 'Transition to oral Torsemide on discharge',
    },
    {
      id: 'med-2',
      name: 'Enoxaparin (Lovenox)',
      dosage: '40mg SubQ',
      frequency: 'Daily (DVT Prophylaxis)',
      action: 'discontinue',
      notes: 'Discontinue prophylaxis on ambulation at home',
    },
    {
      id: 'med-3',
      name: 'Lisinopril',
      dosage: '10mg Oral',
      frequency: 'Daily',
      action: 'continue',
      notes: 'Continue home chronic dosing',
    },
  ]);

  // Take-home discharge prescriptions
  const [dischargePrescriptions, setDischargePrescriptions] = useState<DischargePrescriptionItem[]>(
    [
      {
        id: 'rx-1',
        name: 'Torsemide (Demadex)',
        dosage: '20mg Oral',
        instructions: 'Take 1 tablet daily every morning. Weigh daily.',
        fulfillment: 'in_house',
      },
      {
        id: 'rx-2',
        name: 'Carvedilol (Coreg)',
        dosage: '6.25mg Oral',
        instructions: 'Take 1 tablet BID with food. Monitor pulse.',
        fulfillment: 'in_house',
      },
      {
        id: 'rx-3',
        name: 'Potassium Chloride ER',
        dosage: '20 mEq',
        instructions: 'Take 1 tablet daily with meal.',
        fulfillment: 'external',
      },
    ]
  );

  // In-flight active orders
  const [inFlightOrders, setInFlightOrders] = useState<InFlightOrderItem[]>([
    {
      orderId: 'inflight-1',
      orderType: 'lab',
      name: 'Repeat Serum Electrolytes (K+)',
      action: 'await',
      notes: 'Specimen in lab; wait for result before pharmacy sign-off',
    },
    {
      orderId: 'inflight-2',
      orderType: 'medication',
      name: 'IV Potassium Chloride Infusion',
      action: 'cancel',
      notes: 'Cancelled due to impending discharge',
    },
  ]);

  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectionType, setRejectionType] = useState<'clinical' | 'administrative'>('clinical');

  useEffect(() => {
    if (open) {
      setShowRejectForm(false);
      setRejectReason('');
      setPharmacistNotes('');
    }
  }, [open]);

  if (!workflow) return null;

  const handleToggleInpatientAction = (id: string, action: 'continue' | 'discontinue') => {
    setInpatientMeds((prev) => prev.map((m) => (m.id === id ? { ...m, action } : m)));
  };

  const handleFulfillmentChange = (id: string, fulfillment: 'in_house' | 'external') => {
    setDischargePrescriptions((prev) =>
      prev.map((rx) => (rx.id === id ? { ...rx, fulfillment } : rx))
    );
  };

  const handleInFlightActionChange = (
    orderId: string,
    action: 'cancel' | 'await' | 'outpatient_followup'
  ) => {
    setInFlightOrders((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? { ...ord, action } : ord))
    );
  };

  const handleConfirmApprove = async () => {
    const reconciliationPayload: Record<string, unknown> = {
      inpatientMeds,
      dischargePrescriptions,
      inFlightOrders,
      pharmacistNotes:
        pharmacistNotes.trim() || 'Medication reconciliation completed without contraindications.',
      reconciledAt: new Date().toISOString(),
    };

    await onApprove(workflow.id, {
      medicationReconciliation: reconciliationPayload,
    });
  };

  const handleConfirmReject = async () => {
    if (rejectReason.trim().length < 5) {
      toast.error('Please enter a substantive rejection reason (at least 5 characters).');
      return;
    }

    await onReject(workflow.id, rejectReason.trim(), rejectionType);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Pill className="h-5 w-5 text-emerald-600" />
              <span>Pharmacist Medication Reconciliation</span>
            </DialogTitle>
            <Badge variant="outline">Stage 2 / 4</Badge>
          </div>
          <DialogDescription>
            Reconcile inpatient MAR medications against new discharge prescriptions and resolve
            in-flight orders before billing clearance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Patient Banner */}
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
              <span className="text-muted-foreground block">Discharge Diagnosis</span>
              <strong>
                {workflow.metadata?.clinicalSummary?.dischargeDiagnosis || 'Clinical Discharge'}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Disposition</span>
              <span className="capitalize">
                {workflow.metadata?.clinicalSummary?.dischargeDisposition || 'Home'}
              </span>
            </div>
          </div>

          {!showRejectForm ? (
            <>
              {/* Section 1: Inpatient MAR Medications */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    1. Inpatient MAR Medications (Continue vs Discontinue)
                  </h4>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead>Medication & Dose</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Clinical Remarks</TableHead>
                        <TableHead className="text-right">Reconciliation Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inpatientMeds.map((med) => (
                        <TableRow key={med.id}>
                          <TableCell className="font-medium text-xs py-2">
                            <div>{med.name}</div>
                            <span className="text-[11px] text-muted-foreground">{med.dosage}</span>
                          </TableCell>
                          <TableCell className="text-xs py-2">{med.frequency}</TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">
                            {med.notes}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={med.action === 'continue' ? 'default' : 'outline'}
                                onClick={() => handleToggleInpatientAction(med.id, 'continue')}
                                className="h-6 text-[10px] px-2"
                              >
                                Continue
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={med.action === 'discontinue' ? 'destructive' : 'outline'}
                                onClick={() => handleToggleInpatientAction(med.id, 'discontinue')}
                                className="h-6 text-[10px] px-2"
                              >
                                Discontinue
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Section 2: New Take-Home Prescriptions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  2. New Take-Home Discharge Prescriptions & Fulfillment
                </h4>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead>Prescription</TableHead>
                        <TableHead>Instructions</TableHead>
                        <TableHead className="text-right">Fulfillment Channel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dischargePrescriptions.map((rx) => (
                        <TableRow key={rx.id}>
                          <TableCell className="font-medium text-xs py-2">
                            <div>{rx.name}</div>
                            <span className="text-[11px] text-muted-foreground">{rx.dosage}</span>
                          </TableCell>
                          <TableCell className="text-xs py-2 text-muted-foreground">
                            {rx.instructions}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Select
                              value={rx.fulfillment}
                              onValueChange={(val: 'in_house' | 'external') =>
                                handleFulfillmentChange(rx.id, val)
                              }
                            >
                              <SelectTrigger className="h-7 w-44 text-[11px] ml-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_house">In-House Hospital Dispense</SelectItem>
                                <SelectItem value="external">External Retail E-Rx</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Section 3: In-Flight Orders Reconciliation */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  3. In-Flight Orders Reconciliation (ADR-0003 Invariant)
                </h4>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead>Active Order</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Pharmacist Rationale</TableHead>
                        <TableHead className="text-right">Action Prior to Discharge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inFlightOrders.map((ord) => (
                        <TableRow key={ord.orderId}>
                          <TableCell className="font-medium text-xs py-2">{ord.name}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {ord.orderType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2">
                            {ord.notes}
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Select
                              value={ord.action}
                              onValueChange={(val: 'cancel' | 'await' | 'outpatient_followup') =>
                                handleInFlightActionChange(ord.orderId, val)
                              }
                            >
                              <SelectTrigger className="h-7 w-48 text-[11px] ml-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cancel">Cancel Order</SelectItem>
                                <SelectItem value="await">Await Stat Result</SelectItem>
                                <SelectItem value="outpatient_followup">
                                  Convert to Outpatient Follow-up
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pharmacist Remarks */}
              <div className="space-y-1">
                <Label
                  htmlFor="pharm-notes"
                  className="text-xs font-semibold flex items-center gap-1"
                >
                  <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  Pharmacist Medication Reconciliation Sign-off Notes
                </Label>
                <Textarea
                  id="pharm-notes"
                  value={pharmacistNotes}
                  onChange={(e) => setPharmacistNotes(e.target.value)}
                  placeholder="e.g. Allergies verified. Inpatient IV diuretic discontinued; oral torsemide discharge counseling scheduled."
                  rows={2}
                  className="text-xs"
                />
              </div>
            </>
          ) : (
            /* Rejection Form */
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <XCircle className="h-5 w-5" />
                <span>Return Discharge Workflow to Doctor</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Document clinical drug interaction, contraindication, or discrepancy requiring the
                attending physician to alter orders.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Rejection Severity</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={rejectionType === 'clinical' ? 'destructive' : 'outline'}
                    onClick={() => setRejectionType('clinical')}
                    className="text-xs h-7"
                  >
                    Clinical Rejection (Direct to Doctor)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={rejectionType === 'administrative' ? 'secondary' : 'outline'}
                    onClick={() => setRejectionType('administrative')}
                    className="text-xs h-7"
                  >
                    Administrative Rollback
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="pharm-reject-reason"
                  className="text-xs font-semibold text-destructive"
                >
                  Mandatory Return Rationale * (min 5 characters)
                </Label>
                <Textarea
                  id="pharm-reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Home drug Lisinopril contraindicated with acute renal elevation (Cr 2.1). Doctor must review and adjust discharge ACE-inhibitor."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 justify-between">
          {!showRejectForm ? (
            <div className="flex justify-between w-full">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setShowRejectForm(true)}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Return to Doctor
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Approve Med-Rec & Send to Billing
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
                onClick={() => setShowRejectForm(false)}
                disabled={isLoading}
              >
                Back to Reconciliation
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={isLoading || rejectReason.trim().length < 5}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Returning...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Confirm Return to Doctor
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
