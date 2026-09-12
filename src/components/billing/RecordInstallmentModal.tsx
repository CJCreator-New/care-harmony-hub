/**
 * RecordInstallmentModal.tsx
 * In-table action to record scheduled installment payments for active plans
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
import { CreditCard, Loader2 } from 'lucide-react';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface RecordInstallmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any | null;
}

export function RecordInstallmentModal({ open, onOpenChange, plan }: RecordInstallmentModalProps) {
  const { recordPayment } = usePaymentPlans();
  const [amount, setAmount] = useState<string>('');

  React.useEffect(() => {
    if (plan && open) {
      setAmount(plan.installment_amount?.toString() || '');
    }
  }, [plan, open]);

  if (!plan) return null;

  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedAmount <= 0) {
      toast.error('Payment amount must be greater than ₹0.');
      return;
    }

    recordPayment.mutate(
      {
        planId: plan.id,
        amount: parsedAmount,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(`Recorded installment of ${formatCurrency(parsedAmount)}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Record Installment Payment
          </DialogTitle>
          <DialogDescription>
            Record patient installment collection and update remaining balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="p-3 bg-muted/60 border rounded-lg text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient:</span>
              <span className="font-semibold text-foreground">
                {plan.patient?.first_name} {plan.patient?.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Plan Value:</span>
              <span className="text-foreground">{formatCurrency(plan.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="font-bold text-destructive">
                {formatCurrency(plan.remaining_balance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Installments Paid:</span>
              <span className="text-foreground">
                {plan.paid_installments || 0} of {plan.total_installments}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inst-amount">Installment Amount (₹) *</Label>
            <Input
              id="inst-amount"
              type="number"
              step="0.5"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={recordPayment.isPending || parsedAmount <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {recordPayment.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                `Confirm ${formatCurrency(parsedAmount)}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
