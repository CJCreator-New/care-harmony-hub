/**
 * EnhancedPaymentModal.tsx
 * Multi-Tender Split Payment Modal with Change Calculation & Audit Reference
 *
 * Implements:
 * - Multi-method split payments (e.g. Card + UPI + Cash, or Partial Insurance Copay)
 * - Real-time tender balance & change calculation
 * - Mandatory transaction references for electronic tenders
 * - Post-payment receipt launch
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
import { Plus, Trash2, CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Invoice, Payment, useRecordPayment } from '@/hooks/useBilling';
import { SplitTenderItem, calculateSplitPaymentSummary } from '@/lib/clinical/billingCycleRules';
import { formatCurrency, CURRENCY_SYMBOL } from '@/lib/currency';
import { toast } from 'sonner';

interface EnhancedPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onPaymentSuccess: (invoice: Invoice, recordedPayments: Payment[]) => void;
}

export function EnhancedPaymentModal({
  open,
  onOpenChange,
  invoice,
  onPaymentSuccess,
}: EnhancedPaymentModalProps) {
  const recordPayment = useRecordPayment();
  const [isProcessing, setIsProcessing] = useState(false);

  const balance = invoice ? Math.max(0, invoice.total - invoice.paid_amount) : 0;

  const [tenders, setTenders] = useState<SplitTenderItem[]>([
    {
      id: 't-1',
      method: 'cash',
      amount: balance,
      referenceNumber: '',
    },
  ]);

  // Reset tenders with default balance when opening
  useEffect(() => {
    if (open && invoice) {
      const initialBalance = Math.max(0, invoice.total - invoice.paid_amount);
      setTenders([
        {
          id: `t-${Date.now()}`,
          method: 'cash',
          amount: initialBalance,
          referenceNumber: '',
        },
      ]);
    }
  }, [open, invoice?.id, invoice?.paid_amount]);

  if (!invoice) return null;

  const summary = calculateSplitPaymentSummary(balance, tenders);

  const handleAddTender = () => {
    const remainingToAllocate = summary.remainingBalance > 0 ? summary.remainingBalance : 0;
    setTenders((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        method: 'card',
        amount: remainingToAllocate,
        referenceNumber: '',
      },
    ]);
  };

  const handleRemoveTender = (id: string) => {
    if (tenders.length <= 1) return;
    setTenders((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTender = (id: string, updates: Partial<SplitTenderItem>) => {
    setTenders((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleProcessPayment = async () => {
    if (summary.hasErrors || summary.totalTendered <= 0) {
      toast.error(summary.errorMessage || 'Please correct the payment amounts.');
      return;
    }

    setIsProcessing(true);
    const recordedPayments: Payment[] = [];

    try {
      for (const tender of tenders) {
        if (tender.amount <= 0) continue;

        // If tender is cash and provided change, only record the amount applied towards balance
        const actualAppliedAmount =
          tender.method === 'cash' && summary.changeDue > 0
            ? Math.max(0.01, tender.amount - summary.changeDue)
            : tender.amount;

        const result = await recordPayment.mutateAsync({
          invoiceId: invoice.id,
          amount: actualAppliedAmount,
          paymentMethod: tender.method,
          referenceNumber: tender.referenceNumber?.trim() || undefined,
          notes:
            tender.notes?.trim() ||
            (tender.method === 'cash' && summary.changeDue > 0
              ? `Cash tendered: ₹${tender.amount.toFixed(2)}, Change returned: ₹${summary.changeDue.toFixed(2)}`
              : undefined),
        });

        if (result) {
          recordedPayments.push(result);
        }
      }

      toast.success('Payment recorded successfully.');
      onOpenChange(false);
      onPaymentSuccess(
        {
          ...invoice,
          paid_amount: invoice.paid_amount + summary.totalTendered - summary.changeDue,
          status: summary.isFullySettled ? 'paid' : 'partial',
        },
        recordedPayments
      );
    } catch (err: any) {
      toast.error(`Payment failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Process Settlement & Multi-Tender Payment
          </DialogTitle>
          <DialogDescription>
            Record single or split-tender payments across cash, card, UPI, bank transfer, and
            insurance copay.
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary Bar */}
        <div className="flex justify-between items-center p-3 bg-muted/60 rounded-lg border text-sm">
          <div>
            <p className="font-semibold">{invoice.invoice_number}</p>
            <p className="text-xs text-muted-foreground">
              {invoice.patient?.first_name} {invoice.patient?.last_name} ({invoice.patient?.mrn})
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Balance Due</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(balance)}</p>
          </div>
        </div>

        {/* Tenders List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Payment Tenders
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTender}
              className="text-xs h-7"
            >
              <Plus className="h-3 w-3 mr-1" />
              Split Tender
            </Button>
          </div>

          <div className="space-y-2.5">
            {tenders.map((tender, index) => {
              const isElectronic = ['card', 'upi', 'bank_transfer'].includes(tender.method);
              return (
                <div key={tender.id} className="p-3 border rounded-lg bg-card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Tender #{index + 1}
                    </span>
                    {tenders.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTender(tender.id)}
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Method</Label>
                      <Select
                        value={tender.method}
                        onValueChange={(val: any) => handleUpdateTender(tender.id, { method: val })}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Debit / Credit Card</SelectItem>
                          <SelectItem value="upi">UPI / QR / Digital</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                          <SelectItem value="insurance">Insurance Pre-Auth / TPA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Amount ({CURRENCY_SYMBOL})</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        className="h-9 text-xs font-medium"
                        value={tender.amount || ''}
                        onChange={(e) =>
                          handleUpdateTender(tender.id, { amount: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {isElectronic && (
                    <div className="pt-1">
                      <Label className="text-xs">
                        Reference Number / Transaction ID{' '}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        className="h-8 text-xs font-mono mt-1"
                        placeholder="UTR / Auth Code / Pos Slip #"
                        value={tender.referenceNumber || ''}
                        onChange={(e) =>
                          handleUpdateTender(tender.id, { referenceNumber: e.target.value })
                        }
                        required
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculation Summary Box */}
        <div className="p-3 bg-muted/60 border rounded-lg space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Total Tendered</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(summary.totalTendered)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Balance Remaining</span>
            <span
              className={
                summary.remainingBalance > 0 ? 'text-destructive font-bold' : 'text-foreground'
              }
            >
              {formatCurrency(summary.remainingBalance)}
            </span>
          </div>
          {summary.changeDue > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t pt-1">
              <span>Change to Return to Patient</span>
              <span>{formatCurrency(summary.changeDue)}</span>
            </div>
          )}
          {summary.isFullySettled && (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold border-t pt-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Full Settlement Achieved</span>
            </div>
          )}
        </div>

        {summary.hasErrors && summary.errorMessage && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/30">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{summary.errorMessage}</span>
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            disabled={isProcessing || summary.hasErrors || summary.totalTendered <= 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Settling Payments...
              </>
            ) : (
              `Confirm Settlement (${formatCurrency(summary.totalTendered)})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
