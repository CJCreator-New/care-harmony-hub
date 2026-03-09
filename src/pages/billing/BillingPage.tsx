import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Loader2,
  Shield,
  Calendar,
  Send,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import {
  useInvoices,
  useInvoiceStats,
  useRecordPayment,
  useBillingRealtime,
  Invoice,
} from "@/hooks/useBilling";
import { useInsuranceClaims } from "@/hooks/useInsuranceClaims";
import { usePaymentPlans } from "@/hooks/usePaymentPlans";
import { usePatients } from "@/hooks/usePatients";
import { CreateInvoiceModal } from "@/components/billing/CreateInvoiceModal";
import { formatCurrency } from "@/lib/currency";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "destructive" },
  partial: { label: "Partial", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

const CLAIM_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Submitted", variant: "secondary" },
  under_review: { label: "Under Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  denied: { label: "Denied", variant: "destructive" },
  paid: { label: "Paid", variant: "default" },
};

const PLAN_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  defaulted: { label: "Defaulted", variant: "destructive" },
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
  const { claims, isLoading: claimsLoading, submitClaim, refreshClaimStatus } = useInsuranceClaims();
  const { paymentPlans, isLoading: plansLoading } = usePaymentPlans();

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
            <h1 className="text-2xl font-bold text-foreground">Billing & Finance</h1>
            <p className="text-muted-foreground">
              Manage patient invoices, insurance claims, and payment plans
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-destructive/50 ${statusFilter === 'pending' ? 'ring-2 ring-destructive' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Click to filter</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-yellow-400/50 ${statusFilter === 'partial' ? 'ring-2 ring-yellow-400' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'partial' ? 'all' : 'partial')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partial Payment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.partial || 0}</div>
              <p className="text-xs text-muted-foreground">Click to filter</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-green-500/50 ${statusFilter === 'paid' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.paid || 0}</div>
              <p className="text-xs text-muted-foreground">Click to filter</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalOutstanding ? formatCurrency(stats.totalOutstanding) : formatCurrency(0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="claims">
              <Shield className="h-4 w-4 mr-2" />
              Insurance Claims
            </TabsTrigger>
            <TabsTrigger value="plans">
              <Calendar className="h-4 w-4 mr-2" />
              Payment Plans
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4 mt-4">
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
                        <TableCell>{formatCurrency(invoice.total)}</TableCell>
                        <TableCell>{formatCurrency(invoice.paid_amount)}</TableCell>
                        <TableCell className={balance > 0 ? "text-destructive font-medium" : ""}>
                          {formatCurrency(balance)}
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
          </TabsContent>

          <TabsContent value="claims" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Claim Amount</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !claims?.length ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No insurance claims found
                        </TableCell>
                      </TableRow>
                    ) : (
                      claims.map((claim) => {
                        const status = CLAIM_STATUS_CONFIG[claim.status] || CLAIM_STATUS_CONFIG.draft;
                        return (
                          <TableRow key={claim.id}>
                            <TableCell className="font-medium">{claim.claim_number}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {claim.patient?.first_name} {claim.patient?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{claim.patient?.mrn}</p>
                              </div>
                            </TableCell>
                            <TableCell>{claim.insurance_provider}</TableCell>
                            <TableCell>{formatCurrency(claim.claim_amount)}</TableCell>
                            <TableCell>
                              {claim.approved_amount != null
                                ? formatCurrency(claim.approved_amount)
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {claim.submitted_at
                                ? format(new Date(claim.submitted_at), "MMM d, yyyy")
                                : <span className="text-muted-foreground">Not submitted</span>}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {claim.status === 'draft' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => submitClaim.mutate(claim.id)}
                                  disabled={submitClaim.isPending}
                                >
                                  <Send className="mr-1 h-3 w-3" />
                                  Submit
                                </Button>
                              )}
                              {['submitted', 'under_review'].includes(claim.status) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => refreshClaimStatus.mutate(claim.id)}
                                  disabled={refreshClaimStatus.isPending}
                                >
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  Refresh
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
          </TabsContent>

          <TabsContent value="plans" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Installment</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plansLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !paymentPlans?.length ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No payment plans found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentPlans.map((plan) => {
                        const status = PLAN_STATUS_CONFIG[plan.status] || PLAN_STATUS_CONFIG.active;
                        const paid = plan.paid_installments ?? 0;
                        const pct = plan.total_installments > 0
                          ? Math.round((paid / plan.total_installments) * 100)
                          : 0;
                        return (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {plan.patient?.first_name} {plan.patient?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">{plan.patient?.mrn}</p>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(plan.total_amount)}</TableCell>
                            <TableCell className="text-destructive font-medium">
                              {formatCurrency(plan.remaining_balance)}
                            </TableCell>
                            <TableCell>{formatCurrency(plan.installment_amount)}</TableCell>
                            <TableCell className="capitalize">
                              {plan.installment_frequency.replace('_', ' ')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-1.5">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {paid}/{plan.total_installments}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {plan.next_due_date
                                ? format(new Date(plan.next_due_date), "MMM d, yyyy")
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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

  // Pre-fill the amount with the outstanding balance when the dialog opens
  useEffect(() => {
    if (open && invoice) {
      setAmount(balance.toFixed(2));
    }
  }, [open, invoice?.id]);

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Payment
          </DialogTitle>
        </DialogHeader>

        {invoice && (
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border">
              <div>
                <p className="font-semibold text-sm">{invoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.patient?.first_name} {invoice.patient?.last_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Balance Due</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI / Digital</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground font-medium text-sm">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    step="1"
                    min="1"
                    className="pl-7"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ref">Reference Number / Transaction ID</Label>
              <Input
                id="ref"
                placeholder="Transaction ID, Check #, etc."
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any internal payment notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={recordPayment.isPending || !amount || parseFloat(amount) <= 0}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {recordPayment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
