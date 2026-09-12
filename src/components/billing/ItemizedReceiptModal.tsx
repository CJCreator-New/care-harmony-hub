/**
 * ItemizedReceiptModal.tsx
 * Official Tax Invoice & Payment Receipt Modal
 *
 * Displays formatted legal hospital receipt with:
 * - Hospital header & GSTIN
 * - Patient details (MRN, Name)
 * - Itemized charges (Tariff, Qty, Line Total)
 * - GST Breakdown (CGST 2.5% + SGST 2.5%)
 * - Tender / Payment breakdown with Transaction IDs
 * - Printable / Downloadable receipt format
 */

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Invoice, Payment } from '@/hooks/useBilling';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';

interface ItemizedReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  latestPayments?: Payment[];
}

export function ItemizedReceiptModal({
  open,
  onOpenChange,
  invoice,
  latestPayments,
}: ItemizedReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const balance = Math.max(0, invoice.total - invoice.paid_amount);
  const isFullySettled = balance <= 0 || invoice.status === 'paid';

  const subtotal = invoice.subtotal || invoice.total / 1.05;
  const totalTax = invoice.tax || invoice.total - subtotal;
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  const paymentsToDisplay =
    latestPayments && latestPayments.length > 0 ? latestPayments : invoice.payments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Official Tax Invoice & Payment Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Printable Receipt Container */}
        <div
          ref={receiptRef}
          className="p-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border rounded-xl space-y-6 shadow-sm print:shadow-none print:border-none print:p-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">CareSync Harmony Hub</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-Specialty Hospital & Research Institute
              </p>
              <p className="text-[11px] text-muted-foreground">
                GSTIN: 29AAAAA0000A1Z5 | Reg: HIMS-KA-2026-081
              </p>
              <p className="text-[11px] text-muted-foreground">
                Main Campus, Bengaluru, KA 560001 | Tel: +91 (80) 4123-4567
              </p>
            </div>
            <div className="text-left sm:text-right">
              <Badge
                variant={isFullySettled ? 'default' : 'secondary'}
                className="mb-1 uppercase tracking-wider text-[10px]"
              >
                {isFullySettled ? 'Original Tax Receipt (Paid)' : 'Partial Tax Invoice'}
              </Badge>
              <p className="font-mono text-sm font-bold">{invoice.invoice_number}</p>
              <p className="text-xs text-muted-foreground">
                Date: {format(new Date(invoice.created_at || Date.now()), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-lg text-xs">
            <div>
              <p className="text-muted-foreground uppercase text-[10px] font-bold">
                Billed To Patient
              </p>
              <p className="font-semibold text-sm mt-0.5">
                {invoice.patient?.first_name} {invoice.patient?.last_name}
              </p>
              <p className="text-muted-foreground font-mono">MRN: {invoice.patient?.mrn}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground uppercase text-[10px] font-bold">
                Billing Status
              </p>
              <p
                className={`font-semibold capitalize mt-0.5 ${isFullySettled ? 'text-green-600 dark:text-green-400' : 'text-amber-600'}`}
              >
                {invoice.status}
              </p>
              {invoice.due_date && (
                <p className="text-muted-foreground">
                  Due: {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Itemized Charges & Tariff
            </h4>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/80 border-b font-medium text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-center w-16">Type</th>
                    <th className="p-2.5 text-right w-16">Qty</th>
                    <th className="p-2.5 text-right w-24">Unit Price</th>
                    <th className="p-2.5 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-muted/20">
                        <td className="p-2.5 font-medium">{item.description}</td>
                        <td className="p-2.5 text-center capitalize text-muted-foreground text-[11px]">
                          {item.item_type || 'service'}
                        </td>
                        <td className="p-2.5 text-right">{item.quantity}</td>
                        <td className="p-2.5 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="p-2.5 text-right font-semibold">
                          {formatCurrency(item.total || item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-2.5 font-medium" colSpan={4}>
                        Clinical Care Services / Comprehensive Encounter
                      </td>
                      <td className="p-2.5 text-right font-semibold">
                        {formatCurrency(invoice.total)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Taxes and Totals Breakdown */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (Tariff)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Concession / Discount</span>
                  <span>- {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>CGST (2.5%)</span>
                <span>{formatCurrency(cgst)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>SGST (2.5%)</span>
                <span>{formatCurrency(sgst)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t pt-1.5 text-foreground">
                <span>Grand Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between font-semibold text-green-600 dark:text-green-400">
                <span>Total Paid</span>
                <span>{formatCurrency(invoice.paid_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs border-t pt-1">
                <span>Balance Due</span>
                <span className={balance > 0 ? 'text-destructive' : 'text-green-600'}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Transactions List */}
          {paymentsToDisplay.length > 0 && (
            <div className="border-t pt-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Transactions & Tender Audit
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {paymentsToDisplay.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-2.5 bg-muted/40 border rounded-md flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold capitalize">
                        {p.payment_method.replace('_', ' ')}
                      </p>
                      {p.reference_number && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Ref: {p.reference_number}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {p.created_at
                          ? format(new Date(p.created_at), 'dd MMM yyyy, hh:mm a')
                          : 'Recent'}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-green-600 dark:text-green-400">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer & Authorized Signatory */}
          <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-end text-[11px] text-muted-foreground gap-4">
            <div>
              <p>This is a computer-generated official tax invoice and electronic receipt.</p>
              <p>For questions or TPA reimbursement queries, contact billing@caresync.org.</p>
            </div>
            <div className="text-right">
              <div className="h-8 border-b border-dashed border-muted-foreground/50 w-36 mb-1"></div>
              <p className="font-medium text-foreground">Authorized Cashier / Finance</p>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden border-t pt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="bg-primary">
            <Printer className="h-4 w-4 mr-1.5" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
