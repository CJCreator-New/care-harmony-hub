import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { useActivityLog } from '@/hooks/useActivityLog';
import {
  Pill,
  Package,
  CheckCircle2,
  Clock,
  Search,
  AlertTriangle,
  FileText,
  RefreshCw,
  XCircle,
  Loader2,
} from 'lucide-react';
import { usePrescriptions, usePrescriptionStats, useDispensePrescription, usePrescriptionsRealtime, Prescription } from '@/hooks/usePrescriptions';
import { useMedicationStats } from '@/hooks/useMedications';
import { useHospitalRefillRequests, useUpdateRefillRequest } from '@/hooks/useRefillRequests';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { MEDICATION_COLUMNS } from '@/lib/queryColumns';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/contexts/AuthContext';

export default function PharmacyPage() {
  const { logActivity } = useActivityLog();
  const { notifyPrescriptionReady } = useNotificationTriggers();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [refillTab, setRefillTab] = useState<'pending' | 'processed'>('pending');

  const { user } = useAuth();

  // Debounce search term for server-side filtering
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Build filters for the query
  const filters = {
    hospital_id: user?.user_metadata?.hospital_id,
    ...(activeTab !== 'all' && { status: activeTab }),
  };

  const {
    data: prescriptions,
    isLoading,
    isSearching,
    currentPage,
    totalPages,
    count: totalCount,
    nextPage,
    prevPage,
    goToPage,
  } = usePaginatedQuery({
    table: 'prescriptions',
    select: `${MEDICATION_COLUMNS.list},patient:patients(id, first_name, last_name, mrn)`,
    filters,
    searchQuery: debouncedSearch,
    searchColumn: 'patient.first_name,patient.last_name,patient.mrn',
    orderBy: { column: 'created_at', ascending: false },
    pageSize: 50,
  });

  const { data: stats } = usePrescriptionStats();
  const { data: inventoryStats } = useMedicationStats();
  const dispenseMutation = useDispensePrescription();
  
  // Refill requests
  const { data: pendingRefills = [] } = useHospitalRefillRequests(refillTab === 'pending' ? 'pending' : undefined);
  const { data: processedRefills = [] } = useHospitalRefillRequests(refillTab === 'processed' ? undefined : undefined);
  const updateRefillMutation = useUpdateRefillRequest();
  const refillsToShow = refillTab === 'pending' 
    ? pendingRefills.filter(r => r.status === 'pending')
    : pendingRefills.filter(r => r.status !== 'pending');

  // Enable realtime updates
  usePrescriptionsRealtime();

  const handleDispense = async (prescription: Prescription) => {
    await dispenseMutation.mutateAsync(prescription.id);
    
    // Notify patient that prescription is ready (if patient has user_id)
    const patientName = `${prescription.patient?.first_name} ${prescription.patient?.last_name}`;
    // Note: In a full implementation, we'd get patient's user_id and notify them
    // For now we log the activity
    
    logActivity({
      actionType: 'prescription_dispense',
      entityType: 'prescription',
      entityId: prescription.id,
      details: {
        patientName,
        patientMRN: prescription.patient?.mrn,
        itemCount: prescription.items?.length || 0,
      },
    });
  };

  const handleRefillAction = async (requestId: string, action: 'approved' | 'denied' | 'fulfilled') => {
    await updateRefillMutation.mutateAsync({ requestId, status: action });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'dispensed':
        return <Badge variant="success">Dispensed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRefillStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-info/10 text-info border-info/20">Approved</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      case 'fulfilled':
        return <Badge variant="success">Fulfilled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pharmacy</h1>
          <p className="text-muted-foreground">Manage prescriptions and medications</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Pending Rx"
            value={stats?.pending || 0}
            subtitle="To dispense"
            icon={FileText}
            variant="warning"
          />
          <StatsCard
            title="Dispensed Today"
            value={stats?.dispensed || 0}
            subtitle="Completed"
            icon={CheckCircle2}
            variant="success"
          />
          <StatsCard
            title="Refill Requests"
            value={pendingRefills.filter(r => r.status === 'pending').length}
            subtitle="Pending review"
            icon={RefreshCw}
            variant="info"
          />
          <StatsCard
            title="Low Stock Items"
            value={inventoryStats?.lowStock || 0}
            subtitle="Need reorder"
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or MRN..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="dispensed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Dispensed
            </TabsTrigger>
            <TabsTrigger value="refills" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refill Requests
              {pendingRefills.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRefills.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Pill className="h-4 w-4" />
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="refills" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Refill Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={refillTab} onValueChange={(v) => setRefillTab(v as 'pending' | 'processed')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="processed">Processed</TabsTrigger>
                  </TabsList>
                </Tabs>

                {refillsToShow.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-1">No {refillTab} refill requests</p>
                    <p className="text-sm">Refill requests from patients will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Medications</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refillsToShow.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {request.patient?.first_name} {request.patient?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{request.patient?.mrn}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {request.prescription?.items?.slice(0, 2).map((item, idx) => (
                                <p key={idx} className="text-sm">
                                  {item.medication_name} - {item.dosage}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm max-w-[200px] truncate">
                              {request.reason || 'No reason provided'}
                            </p>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(request.requested_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{getRefillStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleRefillAction(request.id, 'approved')}
                                  disabled={updateRefillMutation.isPending}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRefillAction(request.id, 'denied')}
                                  disabled={updateRefillMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Deny
                                </Button>
                              </div>
                            )}
                            {request.status === 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => handleRefillAction(request.id, 'fulfilled')}
                                disabled={updateRefillMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Mark Fulfilled
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value={activeTab === 'refills' ? 'never' : activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Prescriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading || isSearching ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isSearching ? "Searching..." : "Loading prescriptions..."}</span>
                    </div>
                  </div>
                ) : prescriptions?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-1">No prescriptions found</p>
                    <p className="text-sm">{searchTerm ? "No prescriptions match your search" : "Prescriptions will appear here when created"}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Medications</TableHead>
                        <TableHead>Prescribed By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions?.map((rx: Prescription) => (
                        <TableRow key={rx.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {rx.patient?.first_name} {rx.patient?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">{rx.patient?.mrn}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {rx.items?.slice(0, 2).map((item) => (
                                <p key={item.id} className="text-sm">
                                  {item.medication_name} - {item.dosage}
                                </p>
                              ))}
                              {(rx.items?.length || 0) > 2 && (
                                <p className="text-sm text-muted-foreground">
                                  +{(rx.items?.length || 0) - 2} more
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            Dr. {rx.prescriber?.first_name} {rx.prescriber?.last_name}
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(rx.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>{getStatusBadge(rx.status)}</TableCell>
                          <TableCell className="text-right">
                            {rx.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleDispense(rx)}
                                disabled={dispenseMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Dispense
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                
                {totalPages > 1 && prescriptions && prescriptions.length > 0 && (
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
