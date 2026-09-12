import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Shield,
  Calendar,
  Send,
  RefreshCw,
  Printer,
  SlidersHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useInvoices,
  useInvoiceStats,
  useBillingRealtime,
  Invoice,
  Payment,
} from '@/hooks/useBilling';
import { useInsuranceClaims } from '@/hooks/useInsuranceClaims';
import { usePaymentPlans } from '@/hooks/usePaymentPlans';
import { CreateInvoiceModal } from '@/components/billing/CreateInvoiceModal';
import { CreateClaimModal } from '@/components/billing/CreateClaimModal';
import { EnhancedPaymentModal } from '@/components/billing/EnhancedPaymentModal';
import { ItemizedReceiptModal } from '@/components/billing/ItemizedReceiptModal';
import { CreatePaymentPlanModal } from '@/components/billing/CreatePaymentPlanModal';
import { RecordInstallmentModal } from '@/components/billing/RecordInstallmentModal';
import { InvoiceAdjustmentModal } from '@/components/billing/InvoiceAdjustmentModal';
import { evaluatePaymentPlanDelinquency } from '@/lib/clinical/billingCycleRules';
import { formatCurrency } from '@/lib/currency';
import { usePermissions } from '@/lib/hooks';

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: 'Pending', variant: 'destructive' },
  partial: { label: 'Partial', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

const CLAIM_STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'outline' },
  submitted: { label: 'Submitted', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  denied: { label: 'Denied', variant: 'destructive' },
  paid: { label: 'Paid', variant: 'default' },
};

export default function BillingPage() {
  useBillingRealtime();
  const permissions = usePermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [isCreateClaimModalOpen, setIsCreateClaimModalOpen] = useState(false);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [receiptModal, setReceiptModal] = useState<{
    open: boolean;
    invoice: Invoice | null;
    latestPayments?: Payment[];
  }>({
    open: false,
    invoice: null,
    latestPayments: undefined,
  });
  const [adjustmentModal, setAdjustmentModal] = useState<{
    open: boolean;
    invoice: Invoice | null;
  }>({
    open: false,
    invoice: null,
  });
  const [installmentModal, setInstallmentModal] = useState<{ open: boolean; plan: any | null }>({
    open: false,
    plan: null,
  });

  const { data: invoices, isLoading } = useInvoices();
  const { data: stats } = useInvoiceStats();
  const {
    claims,
    isLoading: claimsLoading,
    submitClaim,
    refreshClaimStatus,
  } = useInsuranceClaims();
  const { paymentPlans, isLoading: plansLoading } = usePaymentPlans();

  const filteredInvoices = invoices?.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handlePaymentSuccess = (updatedInvoice: Invoice, recordedPayments: Payment[]) => {
    // Automatically open itemized receipt upon successful payment completion
    setReceiptModal({
      open: true,
      invoice: updatedInvoice,
      latestPayments: recordedPayments,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Billing & Revenue Cycle</h1>
            <p className="text-muted-foreground text-sm">
              Clinical charge capture, adjudicated claims, multi-tender payments, and financing
              plans
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateInvoiceModalOpen(true)}
              disabled={!permissions.can('billing:read')}
              className="bg-primary text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-destructive/50 ${
              statusFilter === 'pending' ? 'ring-2 ring-destructive' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Click to filter</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-yellow-400/50 ${
              statusFilter === 'partial' ? 'ring-2 ring-yellow-400' : ''
            }`}
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
            className={`cursor-pointer transition-all hover:ring-2 hover:ring-green-500/50 ${
              statusFilter === 'paid' ? 'ring-2 ring-green-500' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === 'paid' ? 'all' : 'paid')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Settled / Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.paid || 0}</div>
              <p className="text-xs text-muted-foreground">Click to filter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalOutstanding
                  ? formatCurrency(stats.totalOutstanding)
                  : formatCurrency(0)}
              </div>
              <p className="text-xs text-muted-foreground">Accounts receivable</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">
              <FileText className="h-4 w-4 mr-2" />
              Invoices & Billing
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

          {/* Invoices Tab Content */}
          <TabsContent value="invoices" className="space-y-4 mt-4">
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
                        const balance = Math.max(0, invoice.total - invoice.paid_amount);

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium font-mono text-xs">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {invoice.patient?.first_name} {invoice.patient?.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {invoice.patient?.mrn}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="font-semibold text-xs">
                              {formatCurrency(invoice.total)}
                            </TableCell>
                            <TableCell className="text-xs text-green-600 dark:text-green-400 font-medium">
                              {formatCurrency(invoice.paid_amount)}
                            </TableCell>
                            <TableCell
                              className={`text-xs font-bold ${balance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                            >
                              {formatCurrency(balance)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="text-[11px] capitalize">
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => setReceiptModal({ open: true, invoice })}
                                  title="View & Print Official Receipt"
                                >
                                  <Printer className="h-3.5 w-3.5 mr-1" />
                                  Receipt
                                </Button>

                                {invoice.status !== 'paid' &&
                                  invoice.status !== 'cancelled' &&
                                  permissions.can('billing:read') && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2.5 text-xs text-primary border-primary/40 hover:bg-primary/5"
                                      onClick={() => setPaymentModal({ open: true, invoice })}
                                    >
                                      <CreditCard className="mr-1 h-3.5 w-3.5" />
                                      Pay
                                    </Button>
                                  )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() => setAdjustmentModal({ open: true, invoice })}
                                  title="Apply Waiver, Concession, or Refund"
                                >
                                  <SlidersHorizontal className="h-3 w-3" />
                                </Button>
                              </div>
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

          {/* Insurance Claims Tab Content */}
          <TabsContent value="claims" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">Adjudicated Claims Queue</h3>
                <p className="text-xs text-muted-foreground">
                  Verify ICD-10 diagnostic coding, pre-authorization compliance, and track insurer
                  reimbursement
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCreateClaimModalOpen(true)}
                className="bg-primary text-white"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Create Insurance Claim
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Payer / Provider</TableHead>
                      <TableHead>Diagnosis (ICD-10)</TableHead>
                      <TableHead>Claim Value</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Status</TableHead>
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
                        const status =
                          CLAIM_STATUS_CONFIG[claim.status] || CLAIM_STATUS_CONFIG.draft;
                        return (
                          <TableRow key={claim.id}>
                            <TableCell className="font-mono text-xs font-medium">
                              {claim.claim_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {claim.patient?.first_name} {claim.patient?.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {claim.patient?.mrn}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {claim.insurance_provider}
                            </TableCell>
                            <TableCell>
                              {claim.diagnosis_codes && claim.diagnosis_codes.length > 0 ? (
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  {claim.diagnosis_codes[0]}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {formatCurrency(claim.claim_amount)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {claim.approved_amount != null ? (
                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                  {formatCurrency(claim.approved_amount)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} className="text-[10px] capitalize">
                                {status.label}
                              </Badge>
                              {claim.denial_reason && (
                                <span className="text-[10px] text-destructive block mt-0.5">
                                  Reason: {claim.denial_reason}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {claim.status === 'draft' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs"
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
                                  className="h-7 px-2 text-xs"
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

          {/* Payment Plans Tab Content */}
          <TabsContent value="plans" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">Patient Installment Financing</h3>
                <p className="text-xs text-muted-foreground">
                  Monitor repayment milestones with 14-day default grace periods
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsCreatePlanModalOpen(true)}
                className="bg-primary text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Payment Plan
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Installment</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status & Delinquency</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plansLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !paymentPlans?.length ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No payment plans found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentPlans.map((plan) => {
                        const paid = plan.paid_installments ?? 0;
                        const pct =
                          plan.total_installments > 0
                            ? Math.round((paid / plan.total_installments) * 100)
                            : 0;

                        const delinquency = evaluatePaymentPlanDelinquency(plan);

                        return (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {plan.patient?.first_name} {plan.patient?.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {plan.patient?.mrn}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {formatCurrency(plan.total_amount)}
                            </TableCell>
                            <TableCell className="text-xs text-destructive font-bold">
                              {formatCurrency(plan.remaining_balance)}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {formatCurrency(plan.installment_amount)}
                            </TableCell>
                            <TableCell className="capitalize text-xs">
                              {plan.installment_frequency.replace('_', ' ')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-1.5 w-16">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {paid}/{plan.total_installments}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              {plan.next_due_date ? (
                                format(new Date(plan.next_due_date), 'MMM d, yyyy')
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={delinquency.badgeVariant} className="text-[10px]">
                                {delinquency.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {plan.status !== 'completed' && plan.remaining_balance > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-green-700 dark:text-green-400 border-green-400/40 hover:bg-green-50 dark:hover:bg-green-950/20"
                                  onClick={() => setInstallmentModal({ open: true, plan })}
                                >
                                  <CreditCard className="mr-1 h-3 w-3" />
                                  Collect
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
        </Tabs>
      </div>

      {/* Modals */}
      <CreateInvoiceModal
        open={isCreateInvoiceModalOpen}
        onOpenChange={setIsCreateInvoiceModalOpen}
      />

      <CreateClaimModal open={isCreateClaimModalOpen} onOpenChange={setIsCreateClaimModalOpen} />

      <CreatePaymentPlanModal
        open={isCreatePlanModalOpen}
        onOpenChange={setIsCreatePlanModalOpen}
      />

      <EnhancedPaymentModal
        open={paymentModal.open}
        onOpenChange={(open) => setPaymentModal({ open, invoice: paymentModal.invoice })}
        invoice={paymentModal.invoice}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <ItemizedReceiptModal
        open={receiptModal.open}
        onOpenChange={(open) => setReceiptModal({ open, invoice: receiptModal.invoice })}
        invoice={receiptModal.invoice}
        latestPayments={receiptModal.latestPayments}
      />

      <InvoiceAdjustmentModal
        open={adjustmentModal.open}
        onOpenChange={(open) => setAdjustmentModal({ open, invoice: adjustmentModal.invoice })}
        invoice={adjustmentModal.invoice}
      />

      <RecordInstallmentModal
        open={installmentModal.open}
        onOpenChange={(open) => setInstallmentModal({ open, plan: installmentModal.plan })}
        plan={installmentModal.plan}
      />
    </DashboardLayout>
  );
}
