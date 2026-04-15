import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Clock,
  UserCheck,
  Bell,
  Play,
  CheckCircle2,
  AlertTriangle,
  Heart,
  ClipboardList,
  Stethoscope,
} from 'lucide-react';
import { useActiveQueue, useCallNextPatient, useStartService, useCompleteService, useQueueRealtime, QueueEntry } from '@/hooks/useQueue';
import { usePatientChecklists } from '@/hooks/useNurseWorkflow';
import { usePermissions } from '@/lib/hooks';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { RecordVitalsModal } from '@/components/nurse/RecordVitalsModal';
import { PatientPrepChecklistCard } from '@/components/nurse/PatientPrepChecklistCard';
import { WalkInRegistrationModal } from '@/components/receptionist/WalkInRegistrationModal';

export default function QueueManagementPage() {
  const { data: queue = [], isLoading } = useActiveQueue();
  const { checklists = [] } = usePatientChecklists();
  const permissions = usePermissions();
  const callNext = useCallNextPatient();
  const startService = useStartService();
  const completeService = useCompleteService();
  
  // Enable realtime updates
  useQueueRealtime();

  // Nurse workflow state
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatientForVitals, setSelectedPatientForVitals] = useState<any>(null);
  const [selectedQueueEntryForPrep, setSelectedQueueEntryForPrep] = useState<QueueEntry | null>(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);

  const canRecordVitals = permissions.can('vitals:write');
  const canManageQueue = permissions.can('queue:write');

  // Force re-render every minute for wait times
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const waitingPatients = queue.filter(q => q.status === 'waiting');
  const calledPatients = queue.filter(q => q.status === 'called');
  const inServicePatients = queue.filter(q => q.status === 'in_service');

  // Get prep status for each patient
  const getPatientPrepStatus = (patientId: string) => {
    const checklist = checklists.find(c => c.patient_id === patientId);
    if (!checklist) return 'not_started';
    if (checklist.ready_for_doctor) return 'ready';
    if (checklist.vitals_completed) return 'in_progress';
    return 'started';
  };

  const getWaitTime = (checkInTime: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(checkInTime));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const avgWaitTime = waitingPatients.length > 0
    ? Math.round(
        waitingPatients.reduce((acc, p) => acc + Math.max(0, differenceInMinutes(new Date(), new Date(p.check_in_time))), 0) / waitingPatients.length
      )
    : 0;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return <Badge variant="destructive">Emergency</Badge>;
      case 'urgent':
        return <Badge variant="warning">Urgent</Badge>;
      case 'high':
        return <Badge variant="secondary">High</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline">Waiting</Badge>;
      case 'called':
        return <Badge variant="info">Called</Badge>;
      case 'in_service':
        return <Badge variant="success">In Service</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPrepBadge = (patientId: string) => {
    const status = getPatientPrepStatus(patientId);
    switch (status) {
      case 'ready':
        return <Badge variant="success" className="ml-2"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'in_progress':
        return <Badge variant="warning" className="ml-2"><ClipboardList className="h-3 w-3 mr-1" />Prep In Progress</Badge>;
      case 'started':
        return <Badge variant="secondary" className="ml-2"><ClipboardList className="h-3 w-3 mr-1" />Prep Started</Badge>;
      default:
        return null;
    }
  };

  const handleCallNext = (id: string) => {
    callNext.mutate(id);
  };

  const handleStartService = (id: string) => {
    startService.mutate(id);
  };

  const handleComplete = (id: string) => {
    setConfirmCompleteId(id);
  };

  const handleConfirmComplete = () => {
    if (confirmCompleteId) {
      completeService.mutate(confirmCompleteId);
      setConfirmCompleteId(null);
    }
  };

  const handleRecordVitals = (entry: QueueEntry) => {
    setSelectedPatientForVitals({
      id: entry.patient?.id,
      first_name: entry.patient?.first_name,
      last_name: entry.patient?.last_name,
      mrn: entry.patient?.mrn,
    });
    setIsVitalsModalOpen(true);
  };

  const handleStartPrep = (entry: QueueEntry) => {
    setSelectedQueueEntryForPrep(entry);
  };

  const handlePrepComplete = () => {
    setSelectedQueueEntryForPrep(null);
  };

  // Count patients ready for doctor
  const readyForDoctorCount = waitingPatients.filter(p => 
    getPatientPrepStatus(p.patient_id) === 'ready'
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Queue Management</h1>
            <p className="text-muted-foreground">Real-time patient queue and service tracking</p>
          </div>
          <div className="flex items-center gap-3">
            {canManageQueue && (
              <Button variant="outline" onClick={() => setIsWalkInModalOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Walk-In Registration
              </Button>
            )}
            {canRecordVitals && (
              <Button onClick={() => setIsVitalsModalOpen(true)}>
                <Heart className="h-4 w-4 mr-2" />
                Record Vitals
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Waiting"
            value={waitingPatients.length}
            subtitle="In queue"
            icon={Users}
            variant="warning"
          />
          <StatsCard
            title="Ready for Doctor"
            value={readyForDoctorCount}
            subtitle="Prep complete"
            icon={Stethoscope}
            variant="success"
          />
          <StatsCard
            title="Called"
            value={calledPatients.length}
            subtitle="Ready for service"
            icon={Bell}
            variant="info"
          />
          <StatsCard
            title="In Service"
            value={inServicePatients.length}
            subtitle="Being attended"
            icon={UserCheck}
            variant="primary"
          />
          <StatsCard
            title="Avg Wait Time"
            value={`${avgWaitTime}m`}
            subtitle="Current average"
            icon={Clock}
            variant="default"
          />
        </div>

        {/* Prep Checklist Card (when selected) */}
        {selectedQueueEntryForPrep && (
          <PatientPrepChecklistCard
            patientId={selectedQueueEntryForPrep.patient_id}
            patientName={`${selectedQueueEntryForPrep.patient?.first_name} ${selectedQueueEntryForPrep.patient?.last_name}`}
            queueEntryId={selectedQueueEntryForPrep.id}
            appointmentId={selectedQueueEntryForPrep.appointment_id || undefined}
            onComplete={handlePrepComplete}
          />
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Waiting Queue */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Waiting Queue
              </CardTitle>
              <Badge variant="outline">{waitingPatients.length} waiting</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : waitingPatients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No patients waiting</p>
                  <p className="text-sm">New patients will appear here when checked in</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {waitingPatients.map((entry: QueueEntry) => {
                    const prepStatus = getPatientPrepStatus(entry.patient_id);
                    const isReady = prepStatus === 'ready';
                    
                    return (
                      <div
                        key={entry.id}
                        className={`flex flex-col gap-3 p-4 rounded-lg border ${
                          isReady 
                            ? 'border-success/50 bg-success/5'
                            : entry.priority === 'emergency' || entry.priority === 'urgent'
                            ? 'border-destructive/50 bg-destructive/5'
                            : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                              isReady 
                                ? 'bg-success/10 text-success' 
                                : 'bg-primary/10 text-primary'
                            }`}>
                              #{entry.queue_number}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">
                                  {entry.patient?.first_name} {entry.patient?.last_name}
                                </p>
                                {getPriorityBadge(entry.priority)}
                                {getPrepBadge(entry.patient_id)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {entry.patient?.mrn} • {entry.department || 'General'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3" />
                              {getWaitTime(entry.check_in_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">waiting</p>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {canRecordVitals && !isReady && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRecordVitals(entry)}
                              >
                                <Heart className="h-4 w-4 mr-1" />
                                Vitals
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleStartPrep(entry)}
                              >
                                <ClipboardList className="h-4 w-4 mr-1" />
                                {prepStatus === 'not_started' ? 'Start Prep' : 'Continue Prep'}
                              </Button>
                            </>
                          )}
                          {isReady && (
                            <Button 
                              size="sm" 
                              onClick={() => handleCallNext(entry.id)}
                              className="bg-success hover:bg-success/90"
                              disabled={!canManageQueue}
                            >
                              <Bell className="h-4 w-4 mr-1" />
                              Call for Consultation
                            </Button>
                          )}
                          {!isReady && canManageQueue && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCallNext(entry.id)}
                            >
                              <Bell className="h-4 w-4 mr-1" />
                              Call
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Patients */}
          <div className="space-y-6">
            {/* Ready for Doctor */}
            {(() => {
              const readyPatients = waitingPatients.filter(p => getPatientPrepStatus(p.patient_id) === 'ready');
              if (readyPatients.length === 0) return null;
              return (
                <Card className="border-success/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-success" />
                      Ready for Doctor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {readyPatients.map((entry: QueueEntry) => (
                        <div key={entry.id} className="p-3 rounded-lg border bg-success/5 border-success/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-lg">#{entry.queue_number}</span>
                            <Badge variant="success" className="text-xs">Ready</Badge>
                          </div>
                          <p className="font-medium text-sm">
                            {entry.patient?.first_name} {entry.patient?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Waited {getWaitTime(entry.check_in_time)}
                          </p>
                          <Button
                            size="sm"
                            className="w-full bg-success hover:bg-success/90"
                            onClick={() => handleCallNext(entry.id)}
                            disabled={!canManageQueue}
                          >
                            <Bell className="h-4 w-4 mr-1" />
                            Call for Consultation
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Called Patients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-info" />
                  Called
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calledPatients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No patients called
                  </p>
                ) : (
                  <div className="space-y-3">
                    {calledPatients.map((entry: QueueEntry) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-info/5 border-info/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-lg">#{entry.queue_number}</span>
                          {getStatusBadge(entry.status)}
                        </div>
                        <p className="font-medium">
                          {entry.patient?.first_name} {entry.patient?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Called {formatDistanceToNow(new Date(entry.called_time!), { addSuffix: true })}
                        </p>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleStartService(entry.id)}
                          disabled={!canManageQueue}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start Service
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* In Service */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-success" />
                  In Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inServicePatients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No patients in service
                  </p>
                ) : (
                  <div className="space-y-3">
                    {inServicePatients.map((entry: QueueEntry) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-success/5 border-success/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-lg">#{entry.queue_number}</span>
                          {getStatusBadge(entry.status)}
                        </div>
                        <p className="font-medium">
                          {entry.patient?.first_name} {entry.patient?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Started {formatDistanceToNow(new Date(entry.service_start_time!), { addSuffix: true })}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleComplete(entry.id)}
                          disabled={!canManageQueue}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <WalkInRegistrationModal
        open={isWalkInModalOpen}
        onOpenChange={setIsWalkInModalOpen}
      />

      {/* Vitals Modal */}
      <RecordVitalsModal
        open={isVitalsModalOpen}
        onOpenChange={(open) => {
          setIsVitalsModalOpen(open);
          if (!open) setSelectedPatientForVitals(null);
        }}
        patient={selectedPatientForVitals}
        showPatientSelector={!selectedPatientForVitals}
      />

      {/* Complete Service Confirmation */}
      <AlertDialog open={canManageQueue && !!confirmCompleteId} onOpenChange={(open) => !open && setConfirmCompleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the patient's service as completed and remove them from the active queue. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete}>
              Complete Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
