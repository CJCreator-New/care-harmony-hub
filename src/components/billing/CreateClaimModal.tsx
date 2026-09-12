/**
 * CreateClaimModal.tsx
 * Insurance Claim Creation & Pre-Authorization Verification Modal
 *
 * Implements:
 * - Patient and invoice linkage
 * - Pre-auth mandatory checks for high-cost (> ₹25,000) or govt schemes (PMJAY/CGHS/ESIC)
 * - ICD-10 diagnostic code format validation with catalog suggestions
 * - Real-time copay / payer adjudication estimates
 */

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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertCircle, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { useInvoices, Invoice } from '@/hooks/useBilling';
import { useInsuranceClaims } from '@/hooks/useInsuranceClaims';
import {
  isValidIcd10Code,
  isPreAuthRequired,
  isValidPreAuthNumber,
  COMMON_ICD10_CODES,
} from '@/lib/clinical/billingCycleRules';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface CreateClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedInvoice?: Invoice | null;
}

const POPULAR_INSURANCE_PROVIDERS = [
  'PMJAY (Ayushman Bharat)',
  'CGHS / Central Govt Health Scheme',
  'ESIC (Employees State Insurance)',
  'Star Health & Allied Insurance',
  'HDFC ERGO General Insurance',
  'ICICI Lombard General Insurance',
  'Care Health Insurance',
  'Max Bupa (Niva Bupa) Health Insurance',
  'Other TPA / Private Insurer',
];

export function CreateClaimModal({
  open,
  onOpenChange,
  preselectedInvoice,
}: CreateClaimModalProps) {
  const { data: patientsData } = usePatients();
  const patientsList = patientsData?.patients || [];
  const { data: invoices } = useInvoices();
  const { createClaim } = useInsuranceClaims();

  const [patientId, setPatientId] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [provider, setProvider] = useState<string>('Star Health & Allied Insurance');
  const [policyNumber, setPolicyNumber] = useState<string>('');
  const [groupNumber, setGroupNumber] = useState<string>('');
  const [diagnosisCode, setDiagnosisCode] = useState<string>('I10');
  const [procedureCode, setProcedureCode] = useState<string>('99213');
  const [claimAmount, setClaimAmount] = useState<string>('');
  const [preAuthNumber, setPreAuthNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Handle preselected invoice
  useEffect(() => {
    if (preselectedInvoice) {
      setPatientId(preselectedInvoice.patient_id);
      setInvoiceId(preselectedInvoice.id);
      setClaimAmount(preselectedInvoice.total.toString());
    }
  }, [preselectedInvoice]);

  // When patient is selected, filter their invoices
  const patientInvoices = invoices?.filter((inv) => inv.patient_id === patientId) || [];

  const handleInvoiceChange = (selectedInvId: string) => {
    setInvoiceId(selectedInvId);
    const selectedInv = invoices?.find((i) => i.id === selectedInvId);
    if (selectedInv) {
      setClaimAmount(selectedInv.total.toString());
    }
  };

  const parsedAmount = parseFloat(claimAmount) || 0;
  const preAuthNeeded = isPreAuthRequired(provider, parsedAmount);
  const preAuthValid = isValidPreAuthNumber(preAuthNumber);
  const icd10Valid = isValidIcd10Code(diagnosisCode);

  // Estimated coverage preview
  const estimatedCoverage = parsedAmount * 0.8;
  const estimatedPatientCopay = parsedAmount * 0.2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      toast.error('Please select a patient.');
      return;
    }
    if (parsedAmount <= 0) {
      toast.error('Claim amount must be greater than ₹0.');
      return;
    }
    if (!icd10Valid) {
      toast.error('Invalid ICD-10 code. Example valid formats: I10, E11.9, J18.9.');
      return;
    }
    if (preAuthNeeded && !preAuthValid) {
      toast.error(
        'A valid Pre-Authorization Number (min 6 alphanumeric characters) is required for this claim.'
      );
      return;
    }

    createClaim.mutate(
      {
        patient_id: patientId,
        invoice_id: invoiceId || undefined,
        insurance_provider: provider,
        policy_number: policyNumber || undefined,
        group_number: groupNumber || undefined,
        claim_amount: parsedAmount,
        diagnosis_codes: [diagnosisCode.toUpperCase().trim()],
        procedure_codes: procedureCode ? [procedureCode.trim()] : undefined,
        notes:
          [notes, preAuthNumber ? `Pre-Auth Ref: ${preAuthNumber.trim().toUpperCase()}` : '']
            .filter(Boolean)
            .join(' | ') || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPolicyNumber('');
          setGroupNumber('');
          setPreAuthNumber('');
          setNotes('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Create Insurance Claim
          </DialogTitle>
          <DialogDescription>
            Submit an adjudicated insurance claim with diagnostic validation and pre-authorization
            enforcement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient and Linked Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="claim-patient">Patient *</Label>
              <Select value={patientId} onValueChange={setPatientId} required>
                <SelectTrigger id="claim-patient">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {patientsList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.mrn})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-invoice">Linked Invoice (Optional)</Label>
              <Select value={invoiceId} onValueChange={handleInvoiceChange}>
                <SelectTrigger id="claim-invoice">
                  <SelectValue
                    placeholder={
                      patientInvoices.length > 0 ? 'Select invoice' : 'No invoices found'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {patientInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {formatCurrency(inv.total)} ({inv.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Provider and Policy Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="claim-provider">Insurance Provider *</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="claim-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {POPULAR_INSURANCE_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy-num">Policy Number</Label>
              <Input
                id="policy-num"
                placeholder="POL-9921402"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-num">Group / Card #</Label>
              <Input
                id="group-num"
                placeholder="GRP-4819"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
              />
            </div>
          </div>

          {/* ICD-10 and Claim Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="icd-code">ICD-10 Code *</Label>
                {icd10Valid ? (
                  <span className="text-[11px] text-green-600 flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Valid
                  </span>
                ) : (
                  <span className="text-[11px] text-destructive flex items-center gap-0.5">
                    <AlertCircle className="h-3 w-3" /> Format error
                  </span>
                )}
              </div>
              <Input
                id="icd-code"
                placeholder="e.g. I10, E11.9, J18.9"
                value={diagnosisCode}
                onChange={(e) => setDiagnosisCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proc-code">Procedure / CPT</Label>
              <Input
                id="proc-code"
                placeholder="99213 / CPT"
                value={procedureCode}
                onChange={(e) => setProcedureCode(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-amt">Claim Amount (₹) *</Label>
              <Input
                id="claim-amt"
                type="number"
                step="1"
                min="1"
                placeholder="0"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Quick ICD-10 chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Suggestions:
            </span>
            {COMMON_ICD10_CODES.slice(0, 5).map((icd) => (
              <Badge
                key={icd.code}
                variant="outline"
                className="cursor-pointer hover:bg-muted text-[10px]"
                onClick={() => setDiagnosisCode(icd.code)}
              >
                {icd.code} ({icd.description.split(' ')[0]})
              </Badge>
            ))}
          </div>

          {/* Pre-Authorization Guard Alert */}
          {preAuthNeeded && (
            <Alert
              className={`border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 ${!preAuthValid ? 'border-destructive' : ''}`}
            >
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Mandatory Pre-Authorization Required
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 space-y-2">
                <p>
                  High-value claims (≥ ₹25,000) or Government Payer Schemes (PMJAY/CGHS/ESIC)
                  require an approved pre-auth reference before submission.
                </p>
                <div className="pt-1">
                  <Input
                    placeholder="Enter Pre-Auth Ref (e.g. PA-2026-98124)"
                    value={preAuthNumber}
                    onChange={(e) => setPreAuthNumber(e.target.value)}
                    className="bg-white dark:bg-slate-900"
                    required
                  />
                  {!preAuthValid && preAuthNumber.length > 0 && (
                    <span className="text-[11px] text-destructive mt-1 block">
                      Must be at least 6 alphanumeric characters.
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Financial Breakdown Preview */}
          {parsedAmount > 0 && (
            <div className="p-3 bg-muted/60 rounded-lg border text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Claim Value</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(parsedAmount)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Insurer Adjudication (80%)</span>
                <span className="text-green-600 dark:text-green-400 font-semibold">
                  {formatCurrency(estimatedCoverage)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Patient Copay Responsibility (20%)</span>
                <span>{formatCurrency(estimatedPatientCopay)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="claim-notes">Internal Notes</Label>
            <Textarea
              id="claim-notes"
              placeholder="Clinical summary or payer communication notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createClaim.isPending ||
                !icd10Valid ||
                (preAuthNeeded && !preAuthValid) ||
                parsedAmount <= 0
              }
              className="bg-primary"
            >
              {createClaim.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Claim...
                </>
              ) : (
                'Create & Validate Claim'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
