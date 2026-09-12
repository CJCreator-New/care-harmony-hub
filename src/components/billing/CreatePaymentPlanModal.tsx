/**
 * CreatePaymentPlanModal.tsx
 * Patient Installment Payment Plan Setup Modal
 *
 * Implements:
 * - Patient and invoice linkage
 * - Configurable down payment & installment frequencies (weekly, bi-weekly, monthly)
 * - Real-time schedule calculation & milestone dates preview
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, DollarSign, Calculator, Loader2 } from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { useInvoices, Invoice } from '@/hooks/useBilling';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { formatCurrency } from '@/lib/currency';
import { addWeeks, addMonths, format } from 'date-fns';
import { toast } from 'sonner';

interface CreatePaymentPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedInvoice?: Invoice | null;
}

export function CreatePaymentPlanModal({
  open,
  onOpenChange,
  preselectedInvoice,
}: CreatePaymentPlanModalProps) {
  const { data: patientsData } = usePatients();
  const patientsList = patientsData?.patients || [];
  const { data: invoices } = useInvoices();
  const { createPaymentPlan } = usePaymentPlans();

  const [patientId, setPatientId] = useState<string>('');
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('0');
  const [frequency, setFrequency] = useState<'weekly' | 'bi_weekly' | 'monthly'>('monthly');
  const [installmentsCount, setInstallmentsCount] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (preselectedInvoice) {
      setPatientId(preselectedInvoice.patient_id);
      setInvoiceId(preselectedInvoice.id);
      const balance = Math.max(0, preselectedInvoice.total - preselectedInvoice.paid_amount);
      setTotalAmount(balance.toString());
    }
  }, [preselectedInvoice]);

  const patientInvoices = invoices?.filter((inv) => inv.patient_id === patientId) || [];

  const handleInvoiceChange = (invId: string) => {
    setInvoiceId(invId);
    const selected = invoices?.find((i) => i.id === invId);
    if (selected) {
      const balance = Math.max(0, selected.total - selected.paid_amount);
      setTotalAmount(balance.toString());
    }
  };

  const parsedTotal = parseFloat(totalAmount) || 0;
  const parsedDown = Math.min(parsedTotal, parseFloat(downPayment) || 0);
  const remaining = Math.max(0, parsedTotal - parsedDown);
  const installmentAmount =
    installmentsCount > 0 ? Math.round((remaining / installmentsCount) * 100) / 100 : 0;

  // Calculate first due date
  const now = new Date();
  const firstDueDate =
    frequency === 'weekly'
      ? addWeeks(now, 1)
      : frequency === 'bi_weekly'
        ? addWeeks(now, 2)
        : addMonths(now, 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId) {
      toast.error('Please select a patient.');
      return;
    }
    if (parsedTotal <= 0) {
      toast.error('Total plan amount must be greater than ₹0.');
      return;
    }
    if (installmentsCount <= 0) {
      toast.error('Installment count must be at least 1.');
      return;
    }

    createPaymentPlan.mutate(
      {
        patient_id: patientId,
        invoice_id: invoiceId || undefined,
        total_amount: parsedTotal,
        down_payment: parsedDown > 0 ? parsedDown : undefined,
        installment_amount: installmentAmount,
        installment_frequency: frequency,
        total_installments: installmentsCount,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDownPayment('0');
          setNotes('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Set Up Patient Payment Plan
          </DialogTitle>
          <DialogDescription>
            Arrange structured financial installments for high-value balances with transparent
            scheduling.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-patient">Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger id="plan-patient">
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
            <Label htmlFor="plan-invoice">Linked Invoice (Optional)</Label>
            <Select value={invoiceId} onValueChange={handleInvoiceChange}>
              <SelectTrigger id="plan-invoice">
                <SelectValue
                  placeholder={patientInvoices.length > 0 ? 'Select invoice' : 'No invoices found'}
                />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {patientInvoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} — Bal: {formatCurrency(inv.total - inv.paid_amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-total">Total Plan Value (₹) *</Label>
              <Input
                id="plan-total"
                type="number"
                min="1"
                step="1"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-down">Down Payment (₹)</Label>
              <Input
                id="plan-down"
                type="number"
                min="0"
                step="1"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-freq">Frequency</Label>
              <Select value={frequency} onValueChange={(val: any) => setFrequency(val)}>
                <SelectTrigger id="plan-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi_weekly">Bi-Weekly (Every 2 Weeks)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-count">Number of Installments</Label>
              <Select
                value={installmentsCount.toString()}
                onValueChange={(val) => setInstallmentsCount(parseInt(val, 10))}
              >
                <SelectTrigger id="plan-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="2">2 Installments</SelectItem>
                  <SelectItem value="3">3 Installments</SelectItem>
                  <SelectItem value="4">4 Installments</SelectItem>
                  <SelectItem value="6">6 Installments</SelectItem>
                  <SelectItem value="12">12 Installments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule Preview Box */}
          {parsedTotal > 0 && (
            <div className="p-3.5 bg-muted/60 border rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Installment Schedule Summary</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Down Payment (Initial):</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(parsedDown)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Financed Balance:</span>
                  <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground border-t pt-1">
                  <span>Installment Amount ({frequency}):</span>
                  <span className="font-bold text-sm text-primary">
                    {formatCurrency(installmentAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>First Payment Due Date:</span>
                  <span className="font-medium text-foreground">
                    {format(firstDueDate, 'dd MMM yyyy')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plan-notes">Notes / Terms</Label>
            <Textarea
              id="plan-notes"
              placeholder="Patient counseling notes, guarantor details, or special terms..."
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
              disabled={createPaymentPlan.isPending || parsedTotal <= 0}
              className="bg-primary"
            >
              {createPaymentPlan.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Plan...
                </>
              ) : (
                'Create Payment Plan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
