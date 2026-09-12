/**
 * InvoiceAdjustmentModal.tsx
 * Invoice Disputes, Manager Concession Discounts & Refund Modal
 *
 * Implements:
 * - Line item dispute / clinical waivers
 * - Managerial discount authorization
 * - Refund processing for overpayments
 * - HIPAA and financial audit log generation via useAudit
 */

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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShieldCheck, DollarSign, Loader2 } from 'lucide-react';
import { Invoice } from '@/hooks/useBilling';
import { validateInvoiceAdjustment } from '@/lib/clinical/billingCycleRules';
import { formatCurrency } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudit } from '@/hooks/useAudit';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface InvoiceAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export function InvoiceAdjustmentModal({
  open,
  onOpenChange,
  invoice,
}: InvoiceAdjustmentModalProps) {
  const { user, profile } = useAuth();
  const { logActivity } = useAudit();
  const queryClient = useQueryClient();

  const [type, setType] = useState<'dispute_waiver' | 'manager_discount' | 'refund'>(
    'dispute_waiver'
  );
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!invoice) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const balance = Math.max(0, invoice.total - invoice.paid_amount);

  // Check manager authorization
  const isManagerOrAdmin =
    profile?.role === 'admin' || profile?.role === 'billing_manager' || managerPin === '9988';

  const validation = validateInvoiceAdjustment(invoice, {
    type,
    amount: parsedAmount,
    reason,
    managerAuthorized: isManagerOrAdmin,
    managerName: profile?.first_name || 'Admin',
  });

  const handleApplyAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.valid) {
      toast.error(validation.error || 'Adjustment validation failed.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (type === 'dispute_waiver' || type === 'manager_discount') {
        const newTotal = validation.newTotal ?? invoice.total - parsedAmount;
        const newStatus =
          invoice.paid_amount >= newTotal
            ? 'paid'
            : invoice.paid_amount > 0
              ? 'partial'
              : 'pending';

        const { error } = await supabase
          .from('invoices')
          .update({
            total: newTotal,
            discount:
              type === 'manager_discount'
                ? (invoice.discount || 0) + parsedAmount
                : invoice.discount,
            status: newStatus,
            notes: [
              invoice.notes,
              `Adjustment [${type.toUpperCase()}]: -₹${parsedAmount.toFixed(2)} (${reason}) by ${profile?.first_name || 'Staff'}`,
            ]
              .filter(Boolean)
              .join(' | '),
          })
          .eq('id', invoice.id);

        if (error) throw error;
      } else if (type === 'refund') {
        const newPaidAmount = Math.max(0, invoice.paid_amount - parsedAmount);
        const newStatus = newPaidAmount === 0 ? 'pending' : 'partial';

        const { error } = await supabase
          .from('invoices')
          .update({
            paid_amount: newPaidAmount,
            status: newStatus,
            notes: [
              invoice.notes,
              `Refund: -₹${parsedAmount.toFixed(2)} (${reason}) to patient by ${profile?.first_name || 'Staff'}`,
            ]
              .filter(Boolean)
              .join(' | '),
          })
          .eq('id', invoice.id);

        if (error) throw error;
      }

      // Financial and HIPAA Audit Record
      await logActivity({
        actionType: 'INVOICE_ADJUSTMENT',
        entityType: 'invoices',
        entityId: invoice.id,
        details: {
          type,
          amount: parsedAmount,
          reason,
          authorizedBy: profile?.id,
          patientId: invoice.patient_id,
        },
        severity: 'warning',
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });

      toast.success(
        `Successfully recorded ${type.replace('_', ' ')} of ${formatCurrency(parsedAmount)}.`
      );
      onOpenChange(false);
      setAmount('');
      setReason('');
      setManagerPin('');
    } catch (err: any) {
      toast.error(`Adjustment failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Invoice Adjustment & Concession
          </DialogTitle>
          <DialogDescription>
            Record line-item disputes, authorized fee concessions, or refunds with complete audit
            trails.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleApplyAdjustment} className="space-y-4 py-2">
          {/* Invoice Summary */}
          <div className="p-3 bg-muted/60 border rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice:</span>
              <span className="font-semibold text-foreground">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient:</span>
              <span className="text-foreground">
                {invoice.patient?.first_name} {invoice.patient?.last_name} ({invoice.patient?.mrn})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Total / Balance:</span>
              <span className="font-medium text-foreground">
                {formatCurrency(invoice.total)} /{' '}
                <span className="text-destructive font-bold">{formatCurrency(balance)}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="text-green-600 font-semibold">
                {formatCurrency(invoice.paid_amount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-type">Adjustment Action *</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger id="adj-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="dispute_waiver">Dispute / Clinical Charge Waiver</SelectItem>
                <SelectItem value="manager_discount">Managerial Concession / Discount</SelectItem>
                <SelectItem value="refund">Process Patient Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-amount">Adjustment Amount (₹) *</Label>
            <Input
              id="adj-amount"
              type="number"
              step="0.5"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Manager Authorization Check for Discounts */}
          {type === 'manager_discount' && !isManagerOrAdmin && (
            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-lg">
              <Label
                htmlFor="mgr-pin"
                className="text-xs font-semibold text-amber-900 dark:text-amber-200"
              >
                Manager Authorization PIN *
              </Label>
              <Input
                id="mgr-pin"
                type="password"
                placeholder="Enter Finance Manager PIN"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Concessions and discounts require supervisory override to prevent financial leakage.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="adj-reason">Justification Reason (Mandatory Audit) *</Label>
            <Textarea
              id="adj-reason"
              placeholder="Detailed explanation (e.g. 'Lab sample hemolyzed, test cancelled by Dr. Sharma; patient billed in error')"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          {!validation.valid && parsedAmount > 0 && (
            <Alert variant="destructive" className="py-2 text-xs">
              <AlertDescription>{validation.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !validation.valid}
              className="bg-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Adjustment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
