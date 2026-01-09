import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
} from 'lucide-react';
import { useLabOrders, useLabOrderStats, useUpdateLabOrder, LabOrder } from '@/hooks/useLabOrders';
import { usePatient } from '@/hooks/usePatients';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultNotes, setResultNotes] = useState('');
  const [isCriticalValue, setIsCriticalValue] = useState(false);

  const { data: orders = [], isLoading, refetch } = useLabOrders(statusFilter);
  const { data: stats } = useLabOrderStats();
  const updateOrder = useUpdateLabOrder();
  const { notifyLabResults } = useNotificationTriggers();
  const { user } = useAuth();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('lab-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lab_orders' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    return order.test_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

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

    // Notify the ordering doctor about results
    if (selectedOrder.ordered_by) {
      // Get patient name for notification
      const { data: patient } = await supabase
        .from('patients')
        .select('first_name, last_name')
        .eq('id', selectedOrder.patient_id)
        .single();

      if (patient) {
        const patientName = `${patient.first_name} ${patient.last_name}`;
        await notifyLabResults(
          selectedOrder.ordered_by,
          patientName,
          selectedOrder.test_name,
          selectedOrder.id,
          isCriticalValue
        );
      }
    }

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
                  <p className="text-2xl font-bold">{stats?.pending ?? '--'}</p>
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
                  <p className="text-2xl font-bold">{stats?.inProgress ?? '--'}</p>
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
                  <p className="text-2xl font-bold">{stats?.completedToday ?? '--'}</p>
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

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No lab orders found</p>
                <p className="text-sm">Orders from consultations will appear here</p>
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
                    {filteredOrders.map((order) => (
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.status === 'completed' ? 'View Results' : 'Upload Results'}
            </DialogTitle>
          </DialogHeader>
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
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
