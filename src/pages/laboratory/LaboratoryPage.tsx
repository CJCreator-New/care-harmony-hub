import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  TestTube2,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Play,
  Upload,
  Eye,
  Loader2,
  Plus,
  AlertTriangle,
  XCircle,
  PhoneCall,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import {
  useLabOrders,
  useLabOrderStats,
  useUpdateLabOrder,
  useCreateLabOrder,
  LabOrder,
} from '@/hooks/useLabOrders';
import { usePatient } from '@/lib/hooks/patients';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { useClinicalMetrics } from '@/hooks/useClinicalMetrics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveAuthUserIdByProfileId } from '@/services/identityResolver';
import { format } from 'date-fns';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { LAB_ORDER_COLUMNS } from '@/lib/queryColumns';
import { Pagination } from '@/components/ui/pagination';
import { AIResultInterpretation } from '@/components/lab/AIResultInterpretation';
import { CreateLabOrderModal } from '@/components/lab/CreateLabOrderModal';
import { SpecimenCollectionModal } from '@/components/lab/SpecimenCollectionModal';
import { StructuredResultEntryModal } from '@/components/lab/StructuredResultEntryModal';
import { SpecimenRejectionModal } from '@/components/lab/SpecimenRejectionModal';
import { CriticalLabAlertBanner } from '@/components/lab/CriticalLabAlertBanner';
import { CriticalAlertAcknowledgmentModal } from '@/components/lab/CriticalAlertAcknowledgmentModal';
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { useAmendmentAlerts } from '@/hooks/useAmendmentAlerts';
import { usePermissions } from '@/lib/hooks';
import { useCriticalLabEscalation } from '@/modules/critical-lab-escalation';
import { toast } from 'sonner';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'warning' | 'info' | 'success' | 'destructive';
  }
> = {
  pending: { label: 'Pending Collection', variant: 'warning' },
  sample_collected: { label: 'Sample Accessioned', variant: 'info' },
  in_progress: { label: 'Analyzing', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  sample_rejected: { label: 'Specimen Rejected', variant: 'destructive' },
};

const priorityConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' }
> = {
  low: { label: 'Low', variant: 'secondary' },
  normal: { label: 'Normal', variant: 'default' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

const LAB_CATEGORY_BY_TEST: Record<string, string> = {
  cbc: 'Hematology',
  'complete blood count': 'Hematology',
  hemoglobin: 'Hematology',
  'blood glucose': 'Biochemistry',
  glucose: 'Biochemistry',
  creatinine: 'Biochemistry',
  lipid: 'Biochemistry',
  bmp: 'Biochemistry',
  troponin: 'Biochemistry',
  cardiac: 'Biochemistry',
  coag: 'Hematology',
  inr: 'Hematology',
  urinalysis: 'Urinalysis',
  'urine routine': 'Urinalysis',
  culture: 'Microbiology',
  'x-ray': 'Radiology',
  ultrasound: 'Radiology',
};

function getLabCategory(order: Pick<LabOrder, 'test_name' | 'test_category'>) {
  const category = order.test_category?.trim();
  if (category && category.toLowerCase() !== order.test_name?.trim().toLowerCase()) return category;
  const testName = order.test_name?.toLowerCase() || '';
  const match = Object.entries(LAB_CATEGORY_BY_TEST).find(([needle]) => testName.includes(needle));
  return match?.[1] || 'General';
}

function PatientName({ patientId }: { patientId: string }) {
  const { data: patient } = usePatient(patientId);
  return <span>{patient ? `${patient.first_name} ${patient.last_name}` : '...'}</span>;
}

export default function LaboratoryPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const getInitialStatus = () => {
    if (initialTab === 'collected') return 'sample_collected';
    if (initialTab === 'results') return 'sample_collected';
    if (initialTab === 'in_progress') return 'in_progress';
    return 'all';
  };
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newLabOrderOpen, setNewLabOrderOpen] = useState(false);
  const { alerts: amendmentAlerts } = useAmendmentAlerts(null);
  const [showAuditTimeline, setShowAuditTimeline] = useState(false);
  const [viewOrder, setViewOrder] = useState<LabOrder | null>(null);

  // Workflow 4 Specimen Accessioning & Collection Modal State
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [orderForCollection, setOrderForCollection] = useState<LabOrder | null>(null);

  // Workflow 4 Structured Result Entry Modal State
  const [structuredEntryOpen, setStructuredEntryOpen] = useState(false);
  const [orderForEntry, setOrderForEntry] = useState<LabOrder | null>(null);

  // Workflow 4 Specimen Rejection Modal State
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [orderForRejection, setOrderForRejection] = useState<LabOrder | null>(null);

  // Workflow 4 Closed-Loop Read-Back Acknowledgment Modal State
  const [acknowledgmentModalOpen, setAcknowledgmentModalOpen] = useState(false);
  const [orderForAck, setOrderForAck] = useState<LabOrder | null>(null);

  // Critical escalation hook
  const { acknowledgeAlert: acknowledgeEscalationAlert, refresh: refreshEscalations } =
    useCriticalLabEscalation();

  // Check if selected order has recent amendments
  const getRecentAmendment = (orderId: string) => {
    return amendmentAlerts.find(
      (a) => a.recordId === orderId && a.recordType === 'lab_result' && a.unread
    );
  };

  // Sync tab param to status filter
  useEffect(() => {
    setStatusFilter(getInitialStatus());
  }, [initialTab]);

  const { user, hospital } = useAuth();
  const permissions = usePermissions();
  const { recordOperation, recordCustomEvent } = useClinicalMetrics();
  const canManageLabOrders = permissions.can('lab:write');

  // Debounce search term for server-side filtering
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Build filters for the query
  const filters = {
    hospital_id: hospital?.id,
    ...(statusFilter !== 'all' && { status: statusFilter }),
  };

  const {
    data: orders,
    isLoading,
    isSearching,
    error: ordersError,
    currentPage,
    totalPages,
    count: totalCount,
    nextPage,
    prevPage,
    goToPage,
  } = usePaginatedQuery({
    table: 'lab_orders',
    select: `${LAB_ORDER_COLUMNS.list},patient:patients(id, first_name, last_name, mrn)`,
    filters,
    searchQuery: debouncedSearch,
    searchColumn: 'test_name,test_category',
    orderBy: { column: 'ordered_at', ascending: false },
    pageSize: 50,
    enabled: !!hospital?.id,
  });

  const { data: stats } = useLabOrderStats();
  const updateOrder = useUpdateLabOrder();
  const createOrder = useCreateLabOrder();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const queryClient = useQueryClient();
  const typedOrders: LabOrder[] = (orders as unknown as LabOrder[]) || [];

  // ==========================================
  // SPECIMEN ACCESSIONING & COLLECTION
  // ==========================================
  const handleOpenCollectionModal = (order: LabOrder) => {
    setOrderForCollection(order);
    setCollectionModalOpen(true);
  };

  const handleConfirmCollection = async (data: {
    orderId: string;
    specimenType: string;
    containerType: string;
    barcode: string;
    collectionSite: string;
    integrityVerified: boolean;
  }) => {
    const target = orderForCollection;
    if (!target) return;

    const prevResults = (target.results as any) || {};

    await updateOrder.mutateAsync({
      id: data.orderId,
      updates: {
        status: 'sample_collected',
        collected_by: user?.id,
        collected_at: new Date().toISOString(),
        specimen_type: data.specimenType,
        results: {
          ...prevResults,
          accession: {
            barcode: data.barcode,
            specimenType: data.specimenType,
            containerType: data.containerType,
            collectionSite: data.collectionSite,
            integrityVerified: data.integrityVerified,
            collectedAt: new Date().toISOString(),
            collectedBy: user?.id,
          },
        },
      },
    });

    void triggerWorkflow({
      type: WORKFLOW_EVENT_TYPES.LAB_SAMPLE_COLLECTED,
      patientId: target.patient_id,
      data: {
        orderId: data.orderId,
        testName: target.test_name,
        barcode: data.barcode,
        containerType: data.containerType,
      },
      priority: target.priority === 'urgent' ? 'urgent' : 'normal',
    });

    setCollectionModalOpen(false);
    setOrderForCollection(null);
    toast.success(`Specimen accessioned successfully. Barcode: ${data.barcode}`);
  };

  const handleStartProcessing = (order: LabOrder) => {
    updateOrder.mutate({
      id: order.id,
      updates: {
        status: 'in_progress',
        processed_by: user?.id,
      },
    });
  };

  // ==========================================
  // SPECIMEN REJECTION & PRIORITY REDRAW
  // ==========================================
  const handleOpenRejectionModal = (order: LabOrder) => {
    setOrderForRejection(order);
    setRejectionModalOpen(true);
  };

  const handleConfirmRejection = async (data: {
    orderId: string;
    reasonCode: string;
    reasonLabel: string;
    clinicalNotes: string;
    dispatchRedraw: boolean;
    redrawPriority: 'urgent' | 'high' | 'normal';
  }) => {
    const target = orderForRejection;
    if (!target) return;

    const prevResults = (target.results as any) || {};

    await updateOrder.mutateAsync({
      id: data.orderId,
      updates: {
        status: 'sample_rejected',
        result_notes: `SPECIMEN REJECTED: ${data.reasonLabel}. Remarks: ${data.clinicalNotes}`,
        results: {
          ...prevResults,
          rejection: {
            reasonCode: data.reasonCode,
            reasonLabel: data.reasonLabel,
            clinicalNotes: data.clinicalNotes,
            dispatchRedraw: data.dispatchRedraw,
            redrawPriority: data.redrawPriority,
            rejectedAt: new Date().toISOString(),
            rejectedBy: user?.id,
          },
        },
      },
    });

    void triggerWorkflow({
      type: WORKFLOW_EVENT_TYPES.LAB_SAMPLE_REJECTED,
      patientId: target.patient_id,
      data: {
        orderId: data.orderId,
        testName: target.test_name,
        rejectionReason: data.reasonLabel,
        dispatchRedraw: data.dispatchRedraw,
      },
      priority: 'urgent',
    });

    // Auto-dispatch replacement redraw order to nursing / phlebotomy
    if (data.dispatchRedraw && hospital?.id) {
      await createOrder.mutateAsync({
        hospital_id: hospital.id,
        patient_id: target.patient_id,
        test_name: target.test_name,
        test_category: target.test_category,
        priority: data.redrawPriority,
        ordered_by: user?.id || target.ordered_by,
        consultation_id: target.consultation_id,
        status: 'pending',
        result_notes: `AUTOMATED REDRAW for rejected specimen (${data.reasonLabel}). Notes: ${data.clinicalNotes}`,
      });
      toast.success(
        `Specimen rejected. Urgent replacement redraw order automatically dispatched to phlebotomy.`
      );
    } else {
      toast.info(`Specimen rejected without redraw request.`);
    }

    setRejectionModalOpen(false);
    setOrderForRejection(null);
  };

  // ==========================================
  // STRUCTURED RESULT ENTRY & PANIC DETECTION
  // ==========================================
  const handleOpenStructuredResultEntry = (order: LabOrder) => {
    setOrderForEntry(order);
    setStructuredEntryOpen(true);
  };

  const handleSubmitStructuredResults = async (data: {
    orderId: string;
    rawValues: Record<string, any>;
    resultNotes: string;
    isCritical: boolean;
    criticalSummary?: string;
  }) => {
    const target = orderForEntry;
    if (!target) return;

    const prevResults = (target.results as any) || {};

    await recordOperation(
      {
        operationName: 'submit_lab_result',
        workflowType: 'lab',
        attributes: {
          'lab_order.id': target.id,
          'test.name': target.test_name,
          'patient.id': target.patient_id,
          is_critical: data.isCritical,
          has_notes: !!data.resultNotes,
        },
      },
      async () => {
        await updateOrder.mutateAsync({
          id: target.id,
          updates: {
            status: 'completed',
            result_notes: data.resultNotes,
            completed_at: new Date().toISOString(),
            is_critical: data.isCritical,
            critical_notified: data.isCritical,
            critical_notified_at: data.isCritical ? new Date().toISOString() : null,
            processed_by: user?.id,
            results: {
              ...prevResults,
              rawValues: data.rawValues,
              hasCriticalPanic: data.isCritical,
              criticalSummary: data.criticalSummary,
              completedAt: new Date().toISOString(),
              processedBy: user?.id,
            },
          },
        });

        // CLIN-002: Dispatch critical lab escalation engine if panic value
        if (data.isCritical && target.hospital_id) {
          try {
            await supabase.functions.invoke('critical-lab-check', {
              body: {
                labResultId: target.id,
                labResult: {
                  hospital_id: target.hospital_id,
                  patient_id: target.patient_id,
                  test_code: target.test_name,
                  test_name: target.test_name,
                  result_value: data.criticalSummary || data.resultNotes || 'CRITICAL_ALERT',
                  ordering_doctor_id: target.ordered_by,
                },
              },
            });
          } catch (criticalErr) {
            console.warn('[LaboratoryPage] Failed to invoke critical-lab-check:', criticalErr);
          }
        }

        // Trigger workflow for lab results ready
        if (target.ordered_by) {
          const { data: patient } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('id', target.patient_id)
            .single();

          if (patient) {
            const orderedByUserId = await resolveAuthUserIdByProfileId(target.ordered_by);
            const patientName = `${patient.first_name} ${patient.last_name}`;
            await triggerWorkflow({
              type: WORKFLOW_EVENT_TYPES.LAB_RESULTS_READY,
              patientId: target.patient_id,
              data: {
                patientName,
                testName: target.test_name,
                labOrderId: target.id,
                isCritical: data.isCritical,
                orderedBy: target.ordered_by,
                orderedByUserId,
              },
              priority: data.isCritical ? 'urgent' : 'normal',
            });

            if (data.isCritical) {
              await triggerWorkflow({
                type: WORKFLOW_EVENT_TYPES.LAB_CRITICAL_ALERT,
                patientId: target.patient_id,
                data: {
                  patientName,
                  testName: target.test_name,
                  labOrderId: target.id,
                  criticalSummary: data.criticalSummary,
                  orderedByUserId,
                },
                priority: 'urgent',
              });
            }
          }
        }
      }
    );

    recordCustomEvent('lab_result.submitted', {
      lab_order_id: target.id,
      test_name: target.test_name,
      patient_id: target.patient_id,
      is_critical: data.isCritical,
    });

    setStructuredEntryOpen(false);
    setOrderForEntry(null);
    if (data.isCritical) {
      toast.error(
        'Critical Panic Value Recorded! 15-Minute Closed-Loop Notification Protocol Initiated.',
        { duration: 8000 }
      );
    } else {
      toast.success('Lab results finalized and uploaded successfully.');
    }
  };

  // ==========================================
  // CLOSED-LOOP VERBAL READ-BACK ACKNOWLEDGMENT
  // ==========================================
  const handleOpenAcknowledgmentModal = (order: LabOrder) => {
    setOrderForAck(order);
    setAcknowledgmentModalOpen(true);
  };

  const handleConfirmAcknowledgment = async (data: {
    orderId: string;
    alertId?: string;
    clinicianName: string;
    clinicianRole: string;
    communicationChannel: string;
    verbalReadBackConfirmed: boolean;
    notes?: string;
  }) => {
    const target = orderForAck;
    if (!target) return;

    const prevResults = (target.results as any) || {};

    await updateOrder.mutateAsync({
      id: data.orderId,
      updates: {
        critical_notified: true,
        results: {
          ...prevResults,
          acknowledgment: {
            clinicianName: data.clinicianName,
            clinicianRole: data.clinicianRole,
            communicationChannel: data.communicationChannel,
            verbalReadBackConfirmed: true,
            notes: data.notes,
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy: user?.id,
          },
        },
      },
    });

    if (data.alertId) {
      try {
        await acknowledgeEscalationAlert(data.alertId, data.notes);
        await refreshEscalations();
      } catch (escErr) {
        console.warn('[LaboratoryPage] Escalation engine acknowledgment error:', escErr);
      }
    }

    setAcknowledgmentModalOpen(false);
    setOrderForAck(null);
    toast.success(
      `Verbal read-back verified with ${data.clinicianName}. CLIA 15-min closed-loop protocol successfully fulfilled.`
    );
  };

  const openViewDialog = (order: LabOrder) => {
    setViewOrder(order);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Laboratory Operations</h1>
            <p className="text-muted-foreground">
              Specimen accessioning, structured analytical testing, automated panic evaluation &
              rapid escalation
            </p>
          </div>
          <Button onClick={() => setNewLabOrderOpen(true)} disabled={!canManageLabOrders}>
            <Plus className="h-4 w-4 mr-2" />
            New Lab Order
          </Button>
        </div>

        {/* Live Closed-Loop Critical Lab Escalation Banner */}
        <CriticalLabAlertBanner
          criticalOrders={typedOrders.filter((o) => o.is_critical)}
          onAcknowledgeClick={handleOpenAcknowledgmentModal}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-warning/10">
                  <FileText className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pending ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Pending Collection</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <TestTube2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.inProgress ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Accessioned / In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.completedToday ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-primary" />
              Lab Order Queue & Analytical Manifest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by test name, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending Collection</SelectItem>
                  <SelectItem value="sample_collected">Sample Accessioned</SelectItem>
                  <SelectItem value="in_progress">Analyzing / In Progress</SelectItem>
                  <SelectItem value="completed">Completed Results</SelectItem>
                  <SelectItem value="sample_rejected">Specimen Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading || isSearching ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isSearching ? 'Searching...' : 'Loading lab orders...'}</span>
                </div>
              </div>
            ) : ordersError ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-70" />
                <p className="text-lg font-medium text-destructive mb-1">
                  Failed to load lab orders
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  There was a problem contacting the server. Please try again.
                </p>
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['lab_orders'] })}
                >
                  Retry
                </Button>
              </div>
            ) : typedOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No lab orders found</p>
                <p className="text-sm">
                  {searchTerm
                    ? 'No orders match your search'
                    : 'Orders from consultations will appear here'}
                </p>
                {!searchTerm && (
                  <Button className="mt-4" asChild>
                    <Link to="/consultations">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Lab Order
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Test / Panel</TableHead>
                      <TableHead>Specimen Matrix</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typedOrders.map((order) => {
                      const accession = order.results?.accession;
                      const isUnreadAck =
                        order.is_critical &&
                        !order.results?.acknowledgment?.verbalReadBackConfirmed;

                      return (
                        <TableRow
                          key={order.id}
                          className={isUnreadAck ? 'bg-destructive/5 font-medium' : undefined}
                        >
                          <TableCell className="font-medium">
                            <PatientName patientId={order.patient_id} />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold flex items-center gap-1.5">
                                {order.test_name}
                                {order.is_critical && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px] px-1 py-0 uppercase animate-pulse font-bold"
                                  >
                                    Panic
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {getLabCategory(order)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {accession?.barcode ? (
                              <div className="space-y-0.5">
                                <span className="text-xs font-mono font-medium flex items-center gap-1 text-primary">
                                  <QrCode className="h-3 w-3" />
                                  {accession.barcode}
                                </span>
                                <span className="text-[11px] text-muted-foreground block truncate max-w-[140px]">
                                  {accession.containerType ||
                                    order.specimen_type ||
                                    'Standard Tube'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Not Accessioned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.priority
                                  ? priorityConfig[order.priority]?.variant || 'default'
                                  : 'default'
                              }
                            >
                              {order.priority
                                ? priorityConfig[order.priority]?.label || order.priority
                                : '--'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig[order.status]?.variant || 'default'}>
                              {statusConfig[order.status]?.label || order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(order.ordered_at), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              {order.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenCollectionModal(order)}
                                  disabled={!canManageLabOrders}
                                  className="h-8 text-xs font-medium"
                                >
                                  <TestTube2 className="h-3.5 w-3.5 mr-1 text-primary" />
                                  Accession
                                </Button>
                              )}

                              {order.status === 'sample_collected' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStartProcessing(order)}
                                    disabled={!canManageLabOrders}
                                    className="h-8 text-xs font-medium"
                                  >
                                    <Play className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                                    Start
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenRejectionModal(order)}
                                    disabled={!canManageLabOrders}
                                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}

                              {order.status === 'in_progress' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenStructuredResultEntry(order)}
                                    disabled={!canManageLabOrders}
                                    className="h-8 text-xs font-semibold shadow-sm"
                                  >
                                    <Upload className="h-3.5 w-3.5 mr-1" />
                                    Results
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenRejectionModal(order)}
                                    disabled={!canManageLabOrders}
                                    className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}

                              {order.status === 'completed' && (
                                <>
                                  {isUnreadAck && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleOpenAcknowledgmentModal(order)}
                                      className="h-8 text-xs font-bold animate-pulse"
                                    >
                                      <PhoneCall className="h-3.5 w-3.5 mr-1" />
                                      Read-Back
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openViewDialog(order)}
                                    className="h-8 text-xs"
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    View
                                  </Button>
                                </>
                              )}

                              {order.status === 'sample_rejected' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openViewDialog(order)}
                                  className="h-8 text-xs text-muted-foreground"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Details
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      onPrevious={prevPage}
                      onNext={nextPage}
                      pageSize={50}
                      totalCount={totalCount}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow 4 Specimen Accessioning Modal */}
      <SpecimenCollectionModal
        open={collectionModalOpen}
        onOpenChange={setCollectionModalOpen}
        order={orderForCollection}
        onCollect={handleConfirmCollection}
        isLoading={updateOrder.isPending}
      />

      {/* Workflow 4 Structured Results Entry Modal with Automated Panic Evaluator */}
      <StructuredResultEntryModal
        open={structuredEntryOpen}
        onOpenChange={setStructuredEntryOpen}
        order={orderForEntry}
        onSubmitResults={handleSubmitStructuredResults}
        isLoading={updateOrder.isPending}
      />

      {/* Workflow 4 Specimen Rejection & Automated Redraw Modal */}
      <SpecimenRejectionModal
        open={rejectionModalOpen}
        onOpenChange={setRejectionModalOpen}
        order={orderForRejection}
        onRejectSpecimen={handleConfirmRejection}
        isLoading={updateOrder.isPending || createOrder.isPending}
      />

      {/* Workflow 4 Closed-Loop Verbal Read-Back Acknowledgment Modal */}
      <CriticalAlertAcknowledgmentModal
        open={acknowledgmentModalOpen}
        onOpenChange={setAcknowledgmentModalOpen}
        order={orderForAck}
        onAcknowledge={handleConfirmAcknowledgment}
        isLoading={updateOrder.isPending}
      />

      {/* View Results / Audit Timeline Dialog */}
      <Dialog
        open={Boolean(viewOrder) || showAuditTimeline}
        onOpenChange={(open) => {
          if (!open) {
            setViewOrder(null);
            setShowAuditTimeline(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showAuditTimeline
                ? 'Lab Result Audit History'
                : viewOrder?.status === 'sample_rejected'
                  ? 'Specimen Rejection Details'
                  : 'Laboratory Result Report'}
            </DialogTitle>
          </DialogHeader>

          {showAuditTimeline && viewOrder ? (
            <div className="space-y-4 py-4">
              {getRecentAmendment(viewOrder.id) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Critical value status was recently amended
                  </p>
                </div>
              )}
              <AuditTimeline recordId={viewOrder.id} recordType="lab_result" />
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold mb-4">Complete Audit History</h4>
                <div className="max-h-96 overflow-y-auto">
                  <ForensicTimeline prescriptionId={viewOrder.id} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowAuditTimeline(false)}>
                  Back to Results
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block">Test Name:</span>
                  <strong>{viewOrder?.test_name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status:</span>
                  <Badge variant={statusConfig[viewOrder?.status || '']?.variant || 'default'}>
                    {statusConfig[viewOrder?.status || '']?.label || viewOrder?.status}
                  </Badge>
                </div>
                {viewOrder?.results?.accession && (
                  <div>
                    <span className="text-muted-foreground block">Accession Barcode:</span>
                    <span className="font-mono">{viewOrder.results.accession.barcode}</span>
                  </div>
                )}
                {viewOrder?.results?.acknowledgment && (
                  <div>
                    <span className="text-muted-foreground block">Verbal Read-Back Clinician:</span>
                    <strong className="text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {viewOrder.results.acknowledgment.clinicianName} (
                      {viewOrder.results.acknowledgment.clinicianRole})
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold">Laboratory Findings & Remarks</Label>
                <div className="mt-1 p-3 bg-muted/40 rounded-lg text-xs font-mono whitespace-pre-wrap border">
                  {viewOrder?.result_notes || 'No notes documented.'}
                </div>
              </div>

              {viewOrder?.result_notes && (
                <AIResultInterpretation
                  results={[
                    {
                      test_name: viewOrder?.test_name || '',
                      value: viewOrder?.result_notes || '',
                    },
                  ]}
                />
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={() => setShowAuditTimeline(true)}>
                  View Audit History
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateLabOrderModal open={newLabOrderOpen} onOpenChange={setNewLabOrderOpen} />
    </DashboardLayout>
  );
}
