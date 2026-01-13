import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { PatientQueue } from './PatientQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Activity,
  Clock,
  CheckCircle2,
  UserCheck,
  Heart,
  Bell,
  Pill,
  ClipboardList,
  AlertTriangle,
  Play,
  ListChecks,
} from 'lucide-react';
import { RecordVitalsModal } from '@/components/nurse/RecordVitalsModal';
import { ShiftHandoverModal } from '@/components/nurse/ShiftHandoverModal';
import { MedicationAdministrationModal } from '@/components/nurse/MedicationAdministrationModal';
import { PatientPrepChecklistCard } from '@/components/nurse/PatientPrepChecklistCard';
import { useTodayVitalsCount } from '@/hooks/useVitalSigns';
import { useActiveQueue, useQueue } from '@/hooks/useQueue';
import { usePendingHandovers, usePatientChecklists } from '@/hooks/useNurseWorkflow';
import { differenceInMinutes } from 'date-fns';

export function NurseDashboard() {
  const { profile } = useAuth();
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [handoverMode, setHandoverMode] = useState<'create' | 'view' | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [selectedQueueEntry, setSelectedQueueEntry] = useState<any>(null);
  
  const { data: vitalsCount } = useTodayVitalsCount();
  const { data: queueData } = useQueue();
  const { data: activeQueue = [] } = useActiveQueue();
  const { handovers: pendingHandovers = [] } = usePendingHandovers();
  const { checklists = [] } = usePatientChecklists();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const waitingPatients = queueData?.filter(q => q.status === 'waiting') || [];
  const readyForDoctor = checklists.filter(c => c.ready_for_doctor).length;
  
  // Get patients needing prep (in queue but not yet marked ready for doctor)
  const patientsNeedingPrep = activeQueue.filter(q => {
    const hasReadyChecklist = checklists.some(c => c.patient_id === q.patient_id && c.ready_for_doctor);
    return q.status === 'waiting' && !hasReadyChecklist;
  });

  const handleStartPrep = (queueEntry: any) => {
    if (!queueEntry.patient) return;
    
    setSelectedQueueEntry(queueEntry);
    setSelectedPatient({
      id: queueEntry.patient.id,
      first_name: queueEntry.patient.first_name,
      last_name: queueEntry.patient.last_name,
      mrn: queueEntry.patient.mrn,
    });
  };

  const handleRecordVitals = (patient: any) => {
    setSelectedPatient(patient);
    setIsVitalsModalOpen(true);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {profile?.first_name || 'Nurse'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Patient queue and vitals management.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit text-sm py-1.5 px-4">
            Nurse
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => setIsVitalsModalOpen(true)}>
          <Heart className="h-4 w-4 mr-2" />
          Record Vitals
        </Button>
        <Button variant="outline" asChild>
          <Link to="/nurse/protocols">
            <ListChecks className="h-4 w-4 mr-2" />
            Care Protocols
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setIsMedModalOpen(true)}>
          <Pill className="h-4 w-4 mr-2" />
          Administer Medication
        </Button>
        <Button variant="outline" onClick={() => setHandoverMode('create')}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Create Handover
        </Button>
        {pendingHandovers.length > 0 && (
          <Button variant="outline" onClick={() => setHandoverMode('view')}>
            <Bell className="h-4 w-4 mr-2" />
            View Handovers
            <Badge variant="destructive" className="ml-2">{pendingHandovers.length}</Badge>
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Patients Waiting"
          value={waitingPatients.length.toString()}
          subtitle="In queue"
          icon={Users}
          variant="warning"
        />
        <StatsCard
          title="Vitals Recorded"
          value={vitalsCount?.toString() || '0'}
          subtitle="Today"
          icon={Heart}
          variant="success"
        />
        <StatsCard
          title="Ready for Doctor"
          value={readyForDoctor.toString()}
          subtitle="Prep complete"
          icon={CheckCircle2}
          variant="primary"
        />
        <StatsCard
          title="Pending Handovers"
          value={pendingHandovers.length.toString()}
          subtitle="Need acknowledgment"
          icon={ClipboardList}
          variant="info"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Patients Needing Prep */}
          {patientsNeedingPrep.length > 0 && (
            <Card className="border-warning/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-warning" />
                  Patients Needing Prep
                  <Badge variant="warning" className="ml-2">{patientsNeedingPrep.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {patientsNeedingPrep.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-warning/5 border-warning/20"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-warning/10 text-warning font-bold text-lg">
                            #{entry.queue_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {entry.patient?.first_name} {entry.patient?.last_name}
                              </p>
                              {(entry.priority === 'urgent' || entry.priority === 'emergency') && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {entry.priority}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              MRN: {entry.patient?.mrn} • {entry.department || 'General'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Waiting {differenceInMinutes(new Date(), new Date(entry.check_in_time))} min
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecordVitals({
                              id: entry.patient?.id,
                              first_name: entry.patient?.first_name,
                              last_name: entry.patient?.last_name,
                              mrn: entry.patient?.mrn,
                            })}
                          >
                            <Heart className="h-4 w-4 mr-1" />
                            Vitals
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleStartPrep(entry)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start Prep
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Selected Patient Prep */}
          {selectedQueueEntry && (
            <PatientPrepChecklistCard
              patientId={selectedQueueEntry.patient?.id}
              patientName={`${selectedQueueEntry.patient?.first_name} ${selectedQueueEntry.patient?.last_name}`}
              queueEntryId={selectedQueueEntry.id}
              appointmentId={selectedQueueEntry.appointment_id}
              onComplete={() => setSelectedQueueEntry(null)}
            />
          )}

          <PatientQueue />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/queue">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Queue
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/consultations">
                  <Activity className="h-4 w-4 mr-2" />
                  Active Consultations
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <RecordVitalsModal
        open={isVitalsModalOpen}
        onOpenChange={setIsVitalsModalOpen}
        patient={selectedPatient}
        showPatientSelector={!selectedPatient}
      />
      <ShiftHandoverModal
        open={handoverMode !== null}
        onOpenChange={(open) => !open && setHandoverMode(null)}
        mode={handoverMode || 'create'}
      />
      <MedicationAdministrationModal
        open={isMedModalOpen}
        onOpenChange={setIsMedModalOpen}
      />
    </>
  );
}
