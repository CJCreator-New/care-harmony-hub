import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Activity,
  Heart,
  Bell,
  Pill,
  ClipboardList,
  CheckCircle2,
  ListChecks,
  LayoutGrid,
  ClipboardCheck,
} from 'lucide-react';
import { RecordVitalsModal } from '@/components/nurse/RecordVitalsModal';
import { ShiftHandoverModal } from '@/components/nurse/ShiftHandoverModal';
import { MedicationAdministrationModal } from '@/components/nurse/MedicationAdministrationModal';
import { NursePatientQueue } from '@/components/nurse/NursePatientQueue';
import { PatientPrepStation } from '@/components/nurse/PatientPrepStation';
import { useTodayVitalsCount } from '@/hooks/useVitalSigns';
import { useActiveQueue } from '@/hooks/useQueue';
import { usePendingHandovers, usePatientChecklists } from '@/hooks/useNurseWorkflow';
import { EnhancedTaskManagement } from '@/components/workflow/EnhancedTaskManagement';
import { NurseTaskPanel } from '@/components/nurse/NurseTaskPanel';
import { useDoctorAvailability } from '@/hooks/useDoctorAvailability';

export function NurseDashboard() {
  const { profile } = useAuth();
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [handoverMode, setHandoverMode] = useState<'create' | 'view' | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  
  const { data: vitalsCount } = useTodayVitalsCount();
  const { data: activeQueue = [] } = useActiveQueue();
  const { handovers: pendingHandovers = [] } = usePendingHandovers();
  const { checklists = [] } = usePatientChecklists();
  const { data: doctorAvailability = [] } = useDoctorAvailability();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const waitingPatients = activeQueue.filter(q => q.status === 'waiting') || [];
  const readyForDoctor = checklists.filter(c => c.ready_for_doctor).length;

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
        <Button variant="outline" onClick={() => setHandoverMode('create')} className="relative">
          <ClipboardList className="h-4 w-4 mr-2" />
          Create Handover
          <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700 border-green-200">
            Auto
          </Badge>
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[450px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="prep-station" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Prep Station
            {waitingPatients.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {waitingPatients.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <NursePatientQueue />
              <NurseTaskPanel />
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Management
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

              {/* Doctor Availability Widget */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Doctor Availability
                  </CardTitle>
                  <CardDescription>
                    Real-time status for patient handoffs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {doctorAvailability.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No doctors available</p>
                      </div>
                    ) : (
                      doctorAvailability.slice(0, 4).map((doctor) => (
                        <div
                          key={doctor.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${
                              doctor.status === 'available' ? 'bg-success' :
                              doctor.status === 'in_consultation' ? 'bg-warning' :
                              doctor.status === 'break' ? 'bg-info' :
                              'bg-muted'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">
                                Dr. {doctor.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {doctor.status.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {doctor.current_patient_count !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                {doctor.current_patient_count} patients
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prep-station">
          <PatientPrepStation />
        </TabsContent>
      </Tabs>

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
