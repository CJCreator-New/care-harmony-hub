import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSampleTracking } from '@/hooks/useSampleTracking';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Search, Plus, Clock, AlertTriangle, CheckCircle, XCircle, Thermometer, MapPin, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface SampleTrackingProps {
  className?: string;
}

export function SampleTracking({ className }: SampleTrackingProps) {
  const { profile } = useAuth();
  const {
    samples,
    isLoading,
    createSample,
    updateSampleStatus,
    trackSampleMovement,
    getSamplesByStatus,
    urgentSamples,
    overdueSamples,
  } = useSampleTracking();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);

  // Form states
  const [newSample, setNewSample] = useState({
    sample_id: '',
    patient_id: '',
    test_type: '',
    priority: 'routine' as const,
    location: '',
    temperature: '',
    volume: '',
    notes: '',
  });

  const [updateData, setUpdateData] = useState({
    status: 'received' as const,
    technician_id: '',
    notes: '',
    rejection_reason: '',
  });

  const handleCreateSample = () => {
    if (!profile?.id) return;

    createSample({
      sample_id: newSample.sample_id,
      patient_id: newSample.patient_id,
      test_type: newSample.test_type,
      status: 'collected',
      priority: newSample.priority,
      collected_at: new Date().toISOString(),
      collector_id: profile.id,
      location: newSample.location,
      temperature: newSample.temperature ? parseFloat(newSample.temperature) : undefined,
      volume: newSample.volume,
      notes: newSample.notes,
      hospital_id: profile.hospital_id || '',
    });

    setNewSample({
      sample_id: '',
      patient_id: '',
      test_type: '',
      priority: 'routine',
      location: '',
      temperature: '',
      volume: '',
      notes: '',
    });
    setIsCreateDialogOpen(false);
  };

  const handleUpdateSample = () => {
    if (!selectedSample) return;

    updateSampleStatus({
      sampleId: selectedSample.id,
      status: updateData.status,
      technician_id: updateData.technician_id || undefined,
      notes: updateData.notes,
      rejection_reason: updateData.rejection_reason,
    });

    // Track the status change
    trackSampleMovement({
      sample_id: selectedSample.id,
      location: selectedSample.location,
      action: updateData.status,
      user_id: profile?.id || '',
      temperature: selectedSample.temperature,
      notes: updateData.notes,
      hospital_id: profile?.hospital_id || '',
    });

    setIsUpdateDialogOpen(false);
    setSelectedSample(null);
  };

  const filteredSamples = samples?.filter(sample => {
    const matchesSearch = searchTerm === '' ||
      sample.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.test_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    const variants = {
      collected: 'secondary',
      received: 'default',
      processing: 'outline',
      completed: 'default',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      routine: 'secondary',
      urgent: 'destructive',
      stat: 'destructive',
    };
    return <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>{priority.toUpperCase()}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sample Tracking</h2>
          <p className="text-muted-foreground">Monitor and manage laboratory samples</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sample
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Sample</DialogTitle>
              <DialogDescription>
                Enter the details for the new laboratory sample.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sample_id">Sample ID</Label>
                  <Input
                    id="sample_id"
                    value={newSample.sample_id}
                    onChange={(e) => setNewSample(prev => ({ ...prev, sample_id: e.target.value }))}
                    placeholder="LAB-2024-001"
                  />
                </div>
                <div>
                  <Label htmlFor="patient_id">Patient ID</Label>
                  <Input
                    id="patient_id"
                    value={newSample.patient_id}
                    onChange={(e) => setNewSample(prev => ({ ...prev, patient_id: e.target.value }))}
                    placeholder="Patient ID"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test_type">Test Type</Label>
                  <Input
                    id="test_type"
                    value={newSample.test_type}
                    onChange={(e) => setNewSample(prev => ({ ...prev, test_type: e.target.value }))}
                    placeholder="CBC, Chemistry, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newSample.priority} onValueChange={(value: any) => setNewSample(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="stat">STAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newSample.location}
                    onChange={(e) => setNewSample(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Lab A, Room 101"
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={newSample.temperature}
                    onChange={(e) => setNewSample(prev => ({ ...prev, temperature: e.target.value }))}
                    placeholder="4.0"
                  />
                </div>
                <div>
                  <Label htmlFor="volume">Volume</Label>
                  <Input
                    id="volume"
                    value={newSample.volume}
                    onChange={(e) => setNewSample(prev => ({ ...prev, volume: e.target.value }))}
                    placeholder="5ml"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newSample.notes}
                  onChange={(e) => setNewSample(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSample}>
                Create Sample
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {urgentSamples.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {urgentSamples.length} urgent sample{urgentSamples.length > 1 ? 's' : ''} require{urgentSamples.length === 1 ? 's' : ''} immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {overdueSamples.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {overdueSamples.length} sample{overdueSamples.length > 1 ? 's are' : ' is'} overdue for processing.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search samples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="collected">Collected</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Samples ({samples?.length || 0})</TabsTrigger>
          <TabsTrigger value="urgent">Urgent ({urgentSamples.length})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdueSamples.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample List</CardTitle>
              <CardDescription>Manage laboratory samples and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSamples.map((sample) => (
                    <TableRow key={sample.id}>
                      <TableCell className="font-medium">{sample.sample_id}</TableCell>
                      <TableCell>
                        {sample.patient ? `${sample.patient.first_name} ${sample.patient.last_name}` : 'Unknown'}
                      </TableCell>
                      <TableCell>{sample.test_type}</TableCell>
                      <TableCell>{getStatusBadge(sample.status)}</TableCell>
                      <TableCell>{getPriorityBadge(sample.priority)}</TableCell>
                      <TableCell>{format(new Date(sample.collected_at), 'MMM dd, HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {sample.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSample(sample);
                            setUpdateData({
                              status: sample.status,
                              technician_id: sample.technician_id || '',
                              notes: '',
                              rejection_reason: '',
                            });
                            setIsUpdateDialogOpen(true);
                          }}
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urgent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Urgent Samples</CardTitle>
              <CardDescription>Samples requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Since Collection</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {urgentSamples.map((sample) => {
                    const timeSince = Math.floor((new Date().getTime() - new Date(sample.collected_at).getTime()) / (1000 * 60));
                    return (
                      <TableRow key={sample.id}>
                        <TableCell className="font-medium">{sample.sample_id}</TableCell>
                        <TableCell>
                          {sample.patient ? `${sample.patient.first_name} ${sample.patient.last_name}` : 'Unknown'}
                        </TableCell>
                        <TableCell>{sample.test_type}</TableCell>
                        <TableCell>{getStatusBadge(sample.status)}</TableCell>
                        <TableCell>{timeSince} minutes</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedSample(sample);
                              setUpdateData({
                                status: 'processing',
                                technician_id: profile?.id || '',
                                notes: 'Urgent processing initiated',
                                rejection_reason: '',
                              });
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            Process Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Samples</CardTitle>
              <CardDescription>Samples that have exceeded processing time limits</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Overdue By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueSamples.map((sample) => {
                    const hoursOverdue = Math.floor((new Date().getTime() - new Date(sample.collected_at).getTime()) / (1000 * 60 * 60));
                    return (
                      <TableRow key={sample.id}>
                        <TableCell className="font-medium">{sample.sample_id}</TableCell>
                        <TableCell>
                          {sample.patient ? `${sample.patient.first_name} ${sample.patient.last_name}` : 'Unknown'}
                        </TableCell>
                        <TableCell>{sample.test_type}</TableCell>
                        <TableCell>{getStatusBadge(sample.status)}</TableCell>
                        <TableCell className="text-red-600">{hoursOverdue} hours</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSample(sample);
                              setUpdateData({
                                status: 'processing',
                                technician_id: profile?.id || '',
                                notes: 'Processing overdue sample',
                                rejection_reason: '',
                              });
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            Process
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Sample Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Sample Status</DialogTitle>
            <DialogDescription>
              Update the status and details for sample {selectedSample?.sample_id}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={updateData.status} onValueChange={(value: any) => setUpdateData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {updateData.status === 'rejected' && (
              <div>
                <Label htmlFor="rejection_reason">Rejection Reason</Label>
                <Textarea
                  id="rejection_reason"
                  value={updateData.rejection_reason}
                  onChange={(e) => setUpdateData(prev => ({ ...prev, rejection_reason: e.target.value }))}
                  placeholder="Reason for rejection..."
                />
              </div>
            )}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={updateData.notes}
                onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSample}>
              Update Sample
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}