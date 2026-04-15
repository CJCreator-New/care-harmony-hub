import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CreditCard, DollarSign, CheckCircle, Printer, Loader2 } from 'lucide-react';
import { usePatients } from '@/lib/hooks/patients';
import { useInvoices, useRecordPayment } from '@/hooks/useBilling';
import { CheckoutModal } from '@/components/payments/CheckoutModal';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface QuickPaymentWidgetProps {
  onPaymentComplete?: () => void;
}

export function QuickPaymentWidget({ onPaymentComplete }: QuickPaymentWidgetProps) {
  const [open, setOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'insurance' | 'upi'>('cash');
  const [processing, setProcessing] = useState(false);
  const [lastPayment, setLastPayment] = useState<{
    patientId: string;
    amount: number;
    method: string;
    date: string;
  } | null>(null);

  const { data: patientsData } = usePatients();
  const patients = patientsData?.patients || [];
  const { data: invoices = [] } = useInvoices();
  const recordPayment = useRecordPayment();
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [pendingAmount, setPendingAmount] = useState<number>(0);

  // Get outstanding invoices for selected patient
  const patientInvoices = invoices.filter(
    inv => inv.patient_id === selectedPatient && (inv.status === 'pending' || inv.status === 'partial')
  );

  const totalOutstanding = patientInvoices.reduce((sum, inv) => sum + (inv.total - inv.paid_amount), 0);

  const handlePayment = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (!paymentAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    setProcessing(true);
    try {
      if (patientInvoices.length === 0) {
        toast.error('No outstanding invoices found for selected patient');
        return;
      }

      const boundedAmount = Math.min(amount, totalOutstanding);

      // Record payment for outstanding invoices
      let remainingAmount = boundedAmount;
      const payments = [];

      for (const invoice of patientInvoices) {
        if (remainingAmount <= 0) break;

        const outstandingForInvoice = Math.max(invoice.total - invoice.paid_amount, 0);
        const paymentForInvoice = Math.min(remainingAmount, outstandingForInvoice);
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
        setPendingAmount(boundedAmount);
        setCardModalOpen(true);
      } else {
        // Record payments for non-card methods immediately
        for (const payment of payments) {
          const payload = {
            invoiceId: payment.invoice_id,
            amount: payment.amount,
            paymentMethod: payment.payment_method,
            notes: payment.notes,
          };
          await recordPayment.mutateAsync(payload);
        }

        setLastPayment({
          patientId: selectedPatient,
          amount: boundedAmount,
          method: paymentMethod,
          date: new Date().toLocaleString(),
        });
      }

      toast.success(`Payment of ${formatCurrency(boundedAmount)} recorded successfully`);
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
        invoiceId: payment.invoice_id,
        amount: payment.amount,
        paymentMethod: 'card',
        notes: payment.notes || 'Card payment (receptionist)',
      };
      await recordPayment.mutateAsync(payload);
    }
    setLastPayment({
      patientId: selectedPatient,
      amount: pendingAmount,
      method: 'card',
      date: new Date().toLocaleString(),
    });
    setPendingPayments([]);
    setPendingAmount(0);
  };

  const printReceipt = () => {
    if (!lastPayment) {
      toast.error('Complete a payment before printing a receipt');
      return;
    }

    // Simple receipt printing simulation
    const receiptData = {
      patient: patients.find(p => p.id === lastPayment.patientId),
      amount: lastPayment.amount,
      method: lastPayment.method,
      date: lastPayment.date
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
                    {formatCurrency(totalOutstanding)}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="upi">UPI / Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-medium text-sm">₹</span>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            {paymentAmount && parseFloat(paymentAmount) > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    Payment: {formatCurrency(parseFloat(paymentAmount || '0'))}
                  </span>
                </div>
                {totalOutstanding > 0 && (
                  <div className="text-xs text-green-700 mt-1">
                    Remaining balance: {formatCurrency(Math.max(0, totalOutstanding - parseFloat(paymentAmount || '0')))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="sm:mr-auto">
              Cancel
            </Button>
            <Button variant="secondary" onClick={printReceipt} disabled={!lastPayment}>
              <Printer className="h-4 w-4 mr-2" />
              Print
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
              disabled={!selectedPatient || !paymentAmount || parseFloat(paymentAmount) <= 0 || processing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
