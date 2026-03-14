import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { useLabOrders, useLabOrderStats, useUpdateLabOrder, LabOrder } from '@/hooks/useLabOrders';
import { usePatient } from '@/hooks/usePatients';
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
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { useAmendmentAlerts } from '@/hooks/useAmendmentAlerts';
import { AlertTriangle } from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'info' | 'success' | 'destructive' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  sample_collected: { label: 'Sample Collected', variant: 'info' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const priorityConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'destructive' }> = {
  low: { label: 'Low', variant: 'secondary' },
  normal: { label: 'Normal', variant: 'default' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'destructive' },
};

function PatientName({ patientId }: { patientId: string }) {
  const { data: patient } = usePatient(patientId);
  return <span>{patient ? `${patient.first_name} ${patient.last_name}` : '...'}</span>;
}

export default function LaboratoryPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const getInitialStatus = () => {
    if (initialTab === 'collected') return 'sample_collected';
    // 'results' tab shows collected samples — they're ready to process/enter results
    if (initialTab === 'results') return 'sample_collected';
    if (initialTab === 'in_progress') return 'in_progress';
    return 'all';
  };
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultNotes, setResultNotes] = useState('');
  const [isCriticalValue, setIsCriticalValue] = useState(false);
  const [newLabOrderOpen, setNewLabOrderOpen] = useState(false);
  const { alerts: amendmentAlerts } = useAmendmentAlerts(null);
  const [showAuditTimeline, setShowAuditTimeline] = useState(false);

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
  const { recordOperation, recordCustomEvent } = useClinicalMetrics();

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
  });

  const { data: stats } = useLabOrderStats();
  const updateOrder = useUpdateLabOrder();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const queryClient = useQueryClient();

  const handleCollectSample = (order: LabOrder) => {
    updateOrder.mutate({
      id: order.id,
      updates: {
        status: 'sample_collected',
        collected_by: user?.id,
        collected_at: new Date().toISOString(),
      },
    });
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

  const handleUploadResults = async () => {
    if (!selectedOrder) return;
    
    // Phase 3B: Record lab result submission with telemetry
    await recordOperation(
      {
        operationName: 'submit_lab_result',
        workflowType: 'lab',
        attributes: {
          'lab_order.id': selectedOrder.id,
          'test.name': selectedOrder.test_name,
          'patient.id': selectedOrder.patient_id,
          'is_critical': isCriticalValue,
          'has_notes': !!resultNotes,
        },
      },
      async () => {
        await updateOrder.mutateAsync({
          id: selectedOrder.id,
          updates: {
            status: 'completed',
            result_notes: resultNotes,
            completed_at: new Date().toISOString(),
            is_critical: isCriticalValue,
            critical_notified: isCriticalValue,
            critical_notified_at: isCriticalValue ? new Date().toISOString() : null,
          },
        });

        // Trigger workflow for lab results ready using the canonical event type
        // constant so that workflow_rules with trigger_event='lab.results_ready'
        // are correctly matched.
        if (selectedOrder.ordered_by) {
          // Get patient name for workflow
          const { data: patient } = await supabase
            .from('patients')
            .select('first_name, last_name')
            .eq('id', selectedOrder.patient_id)
            .single();

          if (patient) {
            // ordered_by is a profile ID in lab_orders; resolve auth user for
            // recipient-safe downstream notification routing.
            const orderedByUserId = await resolveAuthUserIdByProfileId(selectedOrder.ordered_by);
            const patientName = `${patient.first_name} ${patient.last_name}`;
            await triggerWorkflow({
              type: WORKFLOW_EVENT_TYPES.LAB_RESULTS_READY,
              patientId: selectedOrder.patient_id,
              data: {
                patientName,
                testName: selectedOrder.test_name,
                labOrderId: selectedOrder.id,
                isCritical: isCriticalValue,
                orderedBy: selectedOrder.ordered_by,
                orderedByUserId
              },
              priority: isCriticalValue ? 'urgent' : 'normal'
            });
          }
        }
      }
    );

    // Record custom event for analytics
    recordCustomEvent('lab_result.submitted', {
      lab_order_id: selectedOrder.id,
      test_name: selectedOrder.test_name,
      patient_id: selectedOrder.patient_id,
      is_critical: isCriticalValue,
    });

    setResultDialogOpen(false);
    setSelectedOrder(null);
    setResultNotes('');
    setIsCriticalValue(false);
  };

  const openResultDialog = (order: LabOrder) => {
    setSelectedOrder(order);
    setResultNotes(order.result_notes || '');
    setResultDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Laboratory</h1>
            <p className="text-muted-foreground">Manage lab orders and test results</p>
          </div>
          <Button onClick={() => setNewLabOrderOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Lab Order
          </Button>
        </div>

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
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
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
                  <p className="text-sm text-muted-foreground">In Progress</p>
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-primary" />
              Lab Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by test name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sample_collected">Sample Collected</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading || isSearching ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isSearching ? "Searching..." : "Loading lab orders..."}</span>
                </div>
              </div>
            ) : ordersError ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-70" />
                <p className="text-lg font-medium text-destructive mb-1">Failed to load lab orders</p>
                <p className="text-sm text-muted-foreground mb-4">There was a problem contacting the server. Please try again.</p>
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['lab_orders'] })}
                >
                  Retry
                </Button>
              </div>
            ) : orders?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No lab orders found</p>
                <p className="text-sm">{searchTerm ? "No orders match your search" : "Orders from consultations will appear here"}</p>
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
                      <TableHead>Test</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          <PatientName patientId={order.patient_id} />
                        </TableCell>
                        <TableCell>{order.test_name}</TableCell>
                        <TableCell>{order.test_category || '--'}</TableCell>
                        <TableCell>
                          <Badge variant={order.priority ? (priorityConfig[order.priority]?.variant || 'default') : 'default'}>
                            {order.priority ? (priorityConfig[order.priority]?.label || order.priority) : '--'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[order.status]?.variant || 'default'}>
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.ordered_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {order.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCollectSample(order)}
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                Collect
                              </Button>
                            )}
                            {order.status === 'sample_collected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartProcessing(order)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                            {order.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => openResultDialog(order)}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Results
                              </Button>
                            )}
                            {order.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openResultDialog(order)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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

      {/* Results Dialog */}
      <Dialog open={resultDialogOpen || showAuditTimeline} onOpenChange={(open) => {
        if (!open) {
          setResultDialogOpen(false);
          setShowAuditTimeline(false);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showAuditTimeline 
                ? 'Lab Result Audit History' 
                : (selectedOrder?.status === 'completed' ? 'View Results' : 'Upload Results')
              }
            </DialogTitle>
          </DialogHeader>
          {showAuditTimeline && selectedOrder ? (
            <div className="space-y-4 py-4">
              {getRecentAmendment(selectedOrder.id) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">Critical value status was recently amended</p>
                </div>
              )}
              <AuditTimeline recordId={selectedOrder.id} recordType="lab_result" />
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold mb-4">Complete Audit History</h4>
                <div className="max-h-96 overflow-y-auto">
                  <ForensicTimeline recordId={selectedOrder.id} recordType="lab_result" isOpen={true} onClose={() => setShowAuditTimeline(false)} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowAuditTimeline(false)}>
                  Back to Results
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            <div>
              <Label>Test Name</Label>
              <p className="text-sm text-muted-foreground">{selectedOrder?.test_name}</p>
            </div>
            <div>
              <Label htmlFor="result-notes">Result Notes</Label>
              <Textarea
                id="result-notes"
                value={resultNotes}
                onChange={(e) => setResultNotes(e.target.value)}
                placeholder="Enter test results and findings..."
                rows={6}
                disabled={selectedOrder?.status === 'completed'}
              />
            </div>

            {/* AI Interpretation Integration */}
            {(resultNotes.length > 10 || selectedOrder?.status === 'completed') && (
              <AIResultInterpretation 
                results={[{
                  test_name: selectedOrder?.test_name || '',
                  value: resultNotes
                }]}
              />
            )}

            {selectedOrder?.status !== 'completed' && (
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <input
                  type="checkbox"
                  id="critical-value"
                  checked={isCriticalValue}
                  onChange={(e) => setIsCriticalValue(e.target.checked)}
                  className="h-4 w-4 rounded border-destructive text-destructive focus:ring-destructive"
                />
                <label htmlFor="critical-value" className="text-sm font-medium text-destructive cursor-pointer">
                  ⚠️ Mark as Critical Value (will immediately notify ordering physician)
                </label>
              </div>
            )}
            {selectedOrder?.status !== 'completed' && (
              <Button onClick={handleUploadResults} className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete & Upload Results
              </Button>
            )}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="ghost" onClick={() => setShowAuditTimeline(true)}>
                View Audit History
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
