import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  useInvoices,
  useInvoiceStats,
  useRecordPayment,
  useBillingRealtime,
  Invoice,
} from "@/hooks/useBilling";
import { usePatients } from "@/hooks/usePatients";
import { CreateInvoiceModal } from "@/components/billing/CreateInvoiceModal";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "destructive" },
  partial: { label: "Partial", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export default function BillingPage() {
  useBillingRealtime();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });

  const { data: invoices, isLoading } = useInvoices();
  const { data: stats } = useInvoiceStats();

  const filteredInvoices = invoices?.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing & Invoices</h1>
            <p className="text-muted-foreground">
              Manage patient invoices and track payments
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partial Payment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.partial || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.paid || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(stats?.totalOutstanding || 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number, patient name, or MRN..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices?.map((invoice) => {
                    const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
                    const balance = invoice.total - invoice.paid_amount;

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {invoice.patient?.first_name} {invoice.patient?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.patient?.mrn}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>${invoice.total.toFixed(2)}</TableCell>
                        <TableCell>${invoice.paid_amount.toFixed(2)}</TableCell>
                        <TableCell className={balance > 0 ? "text-destructive font-medium" : ""}>
                          ${balance.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPaymentModal({ open: true, invoice })}
                            >
                              <CreditCard className="mr-1 h-3 w-3" />
                              Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <CreateInvoiceModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <PaymentModal
        open={paymentModal.open}
        onOpenChange={(open) => setPaymentModal({ open, invoice: paymentModal.invoice })}
        invoice={paymentModal.invoice}
      />
    </DashboardLayout>
  );
}

function PaymentModal({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const recordPayment = useRecordPayment();

  const balance = invoice ? invoice.total - invoice.paid_amount : 0;

  const handleSubmit = () => {
    if (!invoice) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return;
    }

    recordPayment.mutate(
      {
        invoiceId: invoice.id,
        amount: paymentAmount,
        paymentMethod,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setAmount("");
          setPaymentMethod("cash");
          setReferenceNumber("");
          setNotes("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4">
            <div className="flex justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">{invoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.patient?.first_name} {invoice.patient?.last_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-lg font-bold text-destructive">
                  ${balance.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: $${balance.toFixed(2)}`}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reference Number (Optional)</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Transaction ID, Check #, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={recordPayment.isPending || !amount}
          >
            {recordPayment.isPending ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
