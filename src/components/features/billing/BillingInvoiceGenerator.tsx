/**
 * BillingInvoiceGenerator.tsx
 * Feature 4.3: Billing Invoice UI Component
 *
 * Displays patient billing invoice with itemized charges,
 * insurance breakdowns, and payment options
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, Mail, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/lib/sanitize.utils';

interface BillingItem {
  id: string;
  service_code: string;
  service_name: string;
  date_of_service: string;
  quantity: number;
  unit_cost: number;
  total_charge: number;
  insurance_paid: number;
  patient_responsibility: number;
  status: 'billed' | 'paid' | 'denied' | 'pending';
}

interface InvoiceData {
  invoice_id: string;
  patient_id: string;
  patient_name: string;
  patient_dob: string;
  invoice_date: string;
  service_date_start: string;
  service_date_end: string;
  billing_provider: string;
  insurance_plan: string;
  items: BillingItem[];
  subtotal: number;
  deductible_applied: number;
  coinsurance_amount: number;
  copay_amount: number;
  total_insurance_payment: number;
  total_patient_responsibility: number;
  amount_paid: number;
  amount_due: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue';
  payment_due_date: string;
  notes?: string;
}

interface BillingInvoiceGeneratorProps {
  invoiceId: string;
  hospitalId: string;
  patientId?: string;
  onPaymentInitiated?: (invoiceId: string, amount: number) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
    draft: { variant: 'outline', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
    sent: { variant: 'secondary', icon: <Mail className="h-3 w-3" />, label: 'Sent' },
    viewed: { variant: 'secondary', icon: <Eye className="h-3 w-3" />, label: 'Viewed' },
    paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Paid' },
    overdue: { variant: 'destructive', icon: <AlertCircle className="h-3 w-3" />, label: 'Overdue' },
  };

  const config = variants[status] || variants.draft;

  return (
    <Badge variant={config.variant as any} className="flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
};

const CurrencyDisplay: React.FC<{ amount: number }> = ({ amount }) => {
  return <span className="font-mono font-semibold">${amount.toFixed(2)}</span>;
};

export const BillingInvoiceGenerator: React.FC<BillingInvoiceGeneratorProps> = ({
  invoiceId,
  hospitalId,
  patientId,
  onPaymentInitiated,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);

  // Fetch invoice data
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['billing-invoice', invoiceId, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('hospital_id', hospitalId)
        .single();

      if (error) throw error;
      return data as InvoiceData;
    },
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load invoice. Please try again.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Invoice not found.</AlertDescription>
      </Alert>
    );
  }

  const handlePrintInvoice = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleEmailInvoice = async () => {
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'invoice_email',
          invoice_id: invoiceId,
          patient_id: invoice.patient_id,
          patient_email: patientId, // Would come from patient record
        },
      });
      toast.success('Invoice sent to patient email');
      setIsEmailDialogOpen(false);
    } catch (error) {
      toast.error('Failed to send invoice');
      console.error('Email error:', sanitizeForLog(error));
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoice_id: invoiceId },
      });

      if (error) throw error;

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Invoice downloaded');
    } catch (error) {
      toast.error('Failed to download invoice');
      console.error('PDF error:', sanitizeForLog(error));
    }
  };

  const isOverdue = invoice.status === 'overdue' && invoice.amount_due > 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Header with Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Invoice #{invoice.invoice_id}</CardTitle>
              <CardDescription>
                {format(parseISO(invoice.invoice_date), 'MMMM dd, yyyy')}
              </CardDescription>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isPrinting}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
              disabled={isPrinting}
            >
              Print
            </Button>
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Invoice to Patient</DialogTitle>
                  <DialogDescription>
                    This will send the invoice to the patient's email on file
                  </DialogDescription>
                </DialogHeader>
                <Button onClick={handleEmailInvoice} className="w-full">
                  Send Invoice
                </Button>
              </DialogContent>
            </Dialog>

            {invoice.amount_due > 0 && (
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="ml-auto">
                    Take Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Amount Due: <CurrencyDisplay amount={invoice.amount_due} />
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Payment Amount</label>
                      <input
                        type="number"
                        value={selectedAmount}
                        onChange={(e) => setSelectedAmount(parseFloat(e.target.value))}
                        max={invoice.amount_due}
                        min={0}
                        step={0.01}
                        className="mt-1 w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (onPaymentInitiated) {
                          onPaymentInitiated(invoiceId, selectedAmount);
                        }
                        setIsPaymentDialogOpen(false);
                      }}
                      className="w-full"
                    >
                      Process Payment: <CurrencyDisplay amount={selectedAmount} />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Patient & Service Information */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{' '}
              <span className="font-medium">{invoice.patient_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">DOB:</span>{' '}
              <span className="font-medium">{format(parseISO(invoice.patient_dob), 'MMM dd, yyyy')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Insurance Plan:</span>{' '}
              <span className="font-medium">{invoice.insurance_plan}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Service Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">From:</span>{' '}
              <span className="font-medium">
                {format(parseISO(invoice.service_date_start), 'MMM dd, yyyy')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">To:</span>{' '}
              <span className="font-medium">
                {format(parseISO(invoice.service_date_end), 'MMM dd, yyyy')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Provider:</span>{' '}
              <span className="font-medium">{invoice.billing_provider}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Itemized Charges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Itemized Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Service Code</th>
                  <th className="text-left py-2 px-2">Description</th>
                  <th className="text-center py-2 px-2">Date</th>
                  <th className="text-right py-2 px-2">Quantity</th>
                  <th className="text-right py-2 px-2">Unit Cost</th>
                  <th className="text-right py-2 px-2">Total Charge</th>
                  <th className="text-right py-2 px-2">Insurance Paid</th>
                  <th className="text-right py-2 px-2">Patient Resp.</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2 font-mono text-xs">{item.service_code}</td>
                    <td className="py-2 px-2">{item.service_name}</td>
                    <td className="py-2 px-2 text-center">
                      {format(parseISO(item.date_of_service), 'MMM dd')}
                    </td>
                    <td className="py-2 px-2 text-right">{item.quantity}</td>
                    <td className="py-2 px-2 text-right">
                      <CurrencyDisplay amount={item.unit_cost} />
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">
                      <CurrencyDisplay amount={item.total_charge} />
                    </td>
                    <td className="py-2 px-2 text-right text-green-600">
                      <CurrencyDisplay amount={item.insurance_paid} />
                    </td>
                    <td className="py-2 px-2 text-right text-blue-600">
                      <CurrencyDisplay amount={item.patient_responsibility} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Billing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Subtotal:</span>
            </div>
            <div className="text-right">
              <CurrencyDisplay amount={invoice.subtotal} />
            </div>

            <div>
              <span className="text-muted-foreground">Deductible Applied:</span>
            </div>
            <div className="text-right">
              <CurrencyDisplay amount={invoice.deductible_applied} />
            </div>

            <div>
              <span className="text-muted-foreground">Coinsurance (20%):</span>
            </div>
            <div className="text-right">
              <CurrencyDisplay amount={invoice.coinsurance_amount} />
            </div>

            <div>
              <span className="text-muted-foreground">Copay:</span>
            </div>
            <div className="text-right">
              <CurrencyDisplay amount={invoice.copay_amount} />
            </div>

            <Separator className="col-span-2" />

            <div className="font-semibold">
              <span>Insurance Pays:</span>
            </div>
            <div className="text-right font-semibold text-green-600">
              <CurrencyDisplay amount={invoice.total_insurance_payment} />
            </div>

            <div className="font-semibold">
              <span>Patient Responsibility:</span>
            </div>
            <div className="text-right font-semibold text-blue-600">
              <CurrencyDisplay amount={invoice.total_patient_responsibility} />
            </div>

            <Separator className="col-span-2" />

            <div className="text-lg font-bold">
              <span>Amount Already Paid:</span>
            </div>
            <div className="text-right text-lg font-bold">
              <CurrencyDisplay amount={invoice.amount_paid} />
            </div>

            <div className={`text-lg font-bold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
              <span>Amount Due:</span>
            </div>
            <div className={`text-right text-lg font-bold ${isOverdue ? 'text-red-600' : ''}`}>
              <CurrencyDisplay amount={invoice.amount_due} />
            </div>
          </div>

          {isOverdue && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Payment was due on {format(parseISO(invoice.payment_due_date), 'MMMM dd, yyyy')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BillingInvoiceGenerator;
