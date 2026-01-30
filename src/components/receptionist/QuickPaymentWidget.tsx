import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CreditCard, DollarSign, Receipt, AlertCircle, CheckCircle, Printer } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';
import { useInvoices, useRecordPayment } from '@/hooks/useBilling';
import { CheckoutModal } from '@/components/payments/CheckoutModal';
import { toast } from 'sonner';

interface QuickPaymentWidgetProps {
  onPaymentComplete?: () => void;
}

export function QuickPaymentWidget({ onPaymentComplete }: QuickPaymentWidgetProps) {
  const [open, setOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'insurance'>('cash');
  const [processing, setProcessing] = useState(false);

  const { data: patients = [] } = usePatients();
  const { data: invoices = [] } = useInvoices();
  const recordPayment = useRecordPayment();
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  // Get outstanding invoices for selected patient
  const patientInvoices = invoices.filter(
    inv => inv.patient_id === selectedPatient && inv.status === 'unpaid'
  );

  const totalOutstanding = patientInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  const handlePayment = async () => {
    if (!selectedPatient || !paymentAmount) {
      toast.error('Please select a patient and enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    setProcessing(true);
    try {
      // Record payment for outstanding invoices
      let remainingAmount = amount;
      const payments = [];

      for (const invoice of patientInvoices) {
        if (remainingAmount <= 0) break;

        const paymentForInvoice = Math.min(remainingAmount, invoice.total_amount);
        payments.push({
          invoice_id: invoice.id,
          amount: paymentForInvoice,
          payment_method: paymentMethod,
          notes: `Quick payment via receptionist dashboard`
        });

        remainingAmount -= paymentForInvoice;
      }

      if (paymentMethod === 'card') {
        // Open card modal and defer recording until capture completes
        setPendingPayments(payments);
        setPendingAmount(amount);
        setCardModalOpen(true);
      } else {
        // Record payments for non-card methods immediately
        for (const payment of payments) {
          const payload = {
            invoiceId: payment.invoice_id || payment.invoiceId || payment.invoiceId,
            amount: payment.amount,
            paymentMethod: payment.payment_method || payment.paymentMethod || payment.paymentMethod,
            notes: payment.notes,
          };
          await recordPayment.mutateAsync(payload);
        }
      }

      toast.success(`Payment of $${amount.toFixed(2)} recorded successfully`);
      setOpen(false);
      setSelectedPatient('');
      setPaymentAmount('');
      setPaymentMethod('cash');
      onPaymentComplete?.();

    } catch (error) {
      toast.error('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardSuccess = async () => {
    // After card capture, record payments with a synthetic reference
    for (const payment of pendingPayments) {
      const payload = {
        invoiceId: payment.invoice_id || payment.invoiceId || payment.invoiceId,
        amount: payment.amount,
        paymentMethod: 'card',
        notes: payment.notes || 'Card payment (receptionist)',
      };
      await recordPayment.mutateAsync(payload);
    }
    setPendingPayments([]);
    setPendingAmount(0);
  };

  const printReceipt = () => {
    // Simple receipt printing simulation
    const receiptData = {
      patient: patients.find(p => p.id === selectedPatient),
      amount: paymentAmount,
      method: paymentMethod,
      date: new Date().toLocaleString()
    };

    console.log('Printing receipt:', receiptData);
    toast.success('Receipt printed successfully');
  };

  return (
    <>
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOpen(true)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Quick Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Process payments for outstanding invoices
          </div>
          <Button className="w-full mt-3" size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            Process Payment
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Quick Payment Processing
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient Selection */}
            <div>
              <Label>Patient</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name} - MRN: {patient.mrn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Outstanding Balance */}
            {selectedPatient && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>Outstanding Balance:</span>
                  <Badge variant={totalOutstanding > 0 ? "destructive" : "secondary"}>
                    ${totalOutstanding.toFixed(2)}
                  </Badge>
                </div>
                {patientInvoices.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {patientInvoices.length} unpaid invoice{patientInvoices.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            {paymentAmount && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    Payment: ${parseFloat(paymentAmount || '0').toFixed(2)}
                  </span>
                </div>
                {totalOutstanding > 0 && (
                  <div className="text-xs text-green-700 mt-1">
                    Remaining balance: ${(totalOutstanding - parseFloat(paymentAmount || '0')).toFixed(2)}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={printReceipt} disabled={!selectedPatient}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <CheckoutModal
              open={cardModalOpen}
              onOpenChange={setCardModalOpen}
              amount={pendingAmount}
              invoiceId={pendingPayments.length > 0 ? pendingPayments[0].invoice_id || pendingPayments[0].invoiceId : null}
              onSuccess={handleCardSuccess}
            />
            <Button
              onClick={handlePayment}
              disabled={!selectedPatient || !paymentAmount || processing}
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Process Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}