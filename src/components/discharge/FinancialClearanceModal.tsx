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
  Receipt,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  Loader2,
} from 'lucide-react';
import { usePatient } from '@/lib/hooks/patients';
import { toast } from 'sonner';

export interface FinancialClearanceModalProps {
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

export function FinancialClearanceModal({
  open,
  onOpenChange,
  workflow,
  onApprove,
  onReject,
  isLoading = false,
}: FinancialClearanceModalProps) {
  const { data: patient } = usePatient(workflow?.patient_id || '');

  // Estimated itemized bill line items
  const [bedDays, setBedDays] = useState(3);
  const dailyBedRate = 350;
  const roomTotal = bedDays * dailyBedRate;
  const pharmacyTotal = 285.5;
  const labTotal = 340.0;
  const consultationTotal = 450.0;
  const totalGross = roomTotal + pharmacyTotal + labTotal + consultationTotal;

  // Insurance & Copay
  const insuranceCoveragePercent = 80;
  const insuranceCoveredAmount = (totalGross * insuranceCoveragePercent) / 100;
  const patientBalanceDue = totalGross - insuranceCoveredAmount;

  // Settlement inputs
  const [settlementStatus, setSettlementStatus] = useState<
    'paid_in_full' | 'guarantee_of_payment' | 'charity_hardship' | 'billing_hold'
  >('paid_in_full');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [transactionRef, setTransactionRef] = useState('TXN-8849-CONF');
  const [billingNotes, setBillingNotes] = useState('');

  // Rejection handling
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (open) {
      setShowRejectForm(false);
      setRejectReason('');
      setBillingNotes('');
    }
  }, [open]);

  if (!workflow) return null;

  const handleConfirmApprove = async () => {
    if (settlementStatus === 'billing_hold') {
      toast.error('Cannot approve discharge clearance while billing status is on Hold.');
      return;
    }

    const financialPayload: Record<string, unknown> = {
      itemizedSummary: {
        bedDays,
        roomTotal,
        pharmacyTotal,
        labTotal,
        consultationTotal,
        totalGross,
        insuranceCoveredAmount,
        patientBalanceDue,
      },
      settlementStatus,
      paymentMethod,
      transactionRef: transactionRef.trim() || null,
      billingNotes:
        billingNotes.trim() || 'Discharge billing finalized and patient balance settled.',
      clearedAt: new Date().toISOString(),
    };

    await onApprove(workflow.id, {
      financialClearance: financialPayload,
    });
  };

  const handleConfirmReject = async () => {
    if (rejectReason.trim().length < 5) {
      toast.error('Please enter a substantive rejection reason (at least 5 characters).');
      return;
    }

    await onReject(workflow.id, rejectReason.trim(), 'administrative');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Receipt className="h-5 w-5 text-blue-600" />
              <span>Billing Discharge Clearance & Financial Audit</span>
            </DialogTitle>
            <Badge variant="outline">Stage 3 / 4</Badge>
          </div>
          <DialogDescription>
            Audit itemized inpatient hospital charges, confirm insurance adjudication, and record
            patient balance settlement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Patient Header */}
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
              <span className="text-muted-foreground block">Primary Payer</span>
              <strong className="text-primary">
                {patient?.insurance_provider || 'Standard Health Insurance'}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Policy #</span>
              <span className="font-mono">{patient?.insurance_policy_number || 'POL-9923841'}</span>
            </div>
          </div>

          {!showRejectForm ? (
            <>
              {/* Itemized Charge Manifest */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-primary" />
                  Itemized Hospital Stay Account
                </h4>
                <div className="rounded-md border overflow-hidden text-xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Charge Category</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Inpatient Room & Board</TableCell>
                        <TableCell className="text-muted-foreground">
                          {bedDays} days @ ${dailyBedRate}/day (General Med/Surg Bed)
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${roomTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">
                          Pharmacy & Dispensed Medications
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          Inpatient MAR + Take-Home Meds
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${pharmacyTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Clinical Laboratory Assays</TableCell>
                        <TableCell className="text-muted-foreground">
                          CBC, BMP, Cardiac Troponin
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${labTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Physician & Consultation Fees</TableCell>
                        <TableCell className="text-muted-foreground">
                          Attending Inpatient Daily Visits
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${consultationTotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/20 font-bold">
                        <TableCell colSpan={2}>Gross Inpatient Total</TableCell>
                        <TableCell className="text-right font-mono">
                          ${totalGross.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Insurance Breakdown Banner */}
              <div className="rounded-lg border p-3 bg-primary/5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Insurance Adjudication ({insuranceCoveragePercent}%):
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">
                    -${insuranceCoveredAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-primary/20">
                  <span className="text-foreground">Patient Balance Due (Copay & Deductible):</span>
                  <span className="font-mono text-primary text-base">
                    ${patientBalanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Settlement Form */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Financial Settlement Status *</Label>
                  <Select
                    value={settlementStatus}
                    onValueChange={(val: any) => setSettlementStatus(val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid_in_full">Paid in Full (Copay Collected)</SelectItem>
                      <SelectItem value="guarantee_of_payment">
                        Guaranteed by Secondary Payer
                      </SelectItem>
                      <SelectItem value="charity_hardship">
                        Hospital Charity Care / Hardship Exemption
                      </SelectItem>
                      <SelectItem value="billing_hold">
                        Billing Hold (Dispute / Pending Approval)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Payment Instrument</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit Card">Credit / Debit Card (POS)</SelectItem>
                      <SelectItem value="Cash">Cash at Billing Counter</SelectItem>
                      <SelectItem value="Bank Transfer">Direct Electronic Bank Wire</SelectItem>
                      <SelectItem value="Insurance Direct">
                        100% Payer Direct Reimbursement
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="txn-ref" className="text-xs">
                    Receipt / Transaction Reference #
                  </Label>
                  <Input
                    id="txn-ref"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. TXN-9982-REC"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billing-notes" className="text-xs">
                    Billing Notes & Financial Remarks
                  </Label>
                  <Input
                    id="billing-notes"
                    value={billingNotes}
                    onChange={(e) => setBillingNotes(e.target.value)}
                    placeholder="e.g. Receipt given to patient's daughter."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Rejection / Hold Form */
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm">
                <XCircle className="h-5 w-5" />
                <span>Return Workflow to Pharmacy</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Document financial discrepancy or insurance formulary denial requiring adjustment of
                medication orders.
              </p>

              <div className="space-y-1">
                <Label
                  htmlFor="bill-reject-reason"
                  className="text-xs font-semibold text-destructive"
                >
                  Return Rationale * (min 5 characters)
                </Label>
                <Textarea
                  id="bill-reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Prior authorization denied for brand name discharge anticoagulant; pharmacy must switch to formulary generic."
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
                Return to Pharmacy
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleConfirmApprove}
                  disabled={isLoading || settlementStatus === 'billing_hold'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-1.5" />
                      Clear Financials & Send to Nursing
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
                Back to Billing Review
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
                    Confirm Return to Pharmacy
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
