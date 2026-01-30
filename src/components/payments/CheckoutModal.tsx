import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCapturePayment } from '@/hooks/usePayments';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  invoiceId: string | null;
  onSuccess?: (ref?: string) => void;
}

export function CheckoutModal({ open, onOpenChange, amount, invoiceId, onSuccess }: CheckoutModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const capture = useCapturePayment();

  const handlePay = async () => {
    if (!invoiceId) return;
    try {
      await capture.mutateAsync({
        invoiceId,
        amount,
        paymentMethod: 'card',
        card: { number: cardNumber, name, expiry, cvv },
        notes: 'Card payment via CheckoutModal'
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      // mutation shows toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Card Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Amount</Label>
            <div className="font-medium">${amount.toFixed(2)}</div>
          </div>

          <div>
            <Label>Cardholder Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label>Card Number</Label>
            <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Expiry (MM/YY)</Label>
              <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div>
              <Label>CVV</Label>
              <Input value={cvv} onChange={(e) => setCvv(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePay} disabled={!cardNumber || !name || !expiry || !cvv || capture.isLoading}>
            Pay ${amount.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
