import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGreeting } from '@/lib/utils/datetime';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { NurseTaskPanel } from '@/components/nurse/NurseTaskPanel';

export function NurseDashboard() {
  const { profile } = useAuth();
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [handoverMode, setHandoverMode] = useState<'create' | 'view' | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  
  const { data: vitalsCount } = useTodayVitalsCount();
  const { data: activeQueue = [] } = useActiveQueue();
  const { handovers: pendingHandovers = [] } = usePendingHandovers(profile?.id);
  const { checklists = [] } = usePatientChecklists();

  // Count ALL active queue entries (waiting, called, in_service) for the KPI
  const waitingPatients = activeQueue || [];
  const readyForDoctor = checklists.filter(c => c.ready_for_doctor).length;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {profile?.first_name?.trim() || 'Nurse'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Patient queue and vitals management.
            </p>
          </div>
          <Badge variant="nurse" className="w-fit text-sm py-1.5 px-4">
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
        <Button variant="outline" onClick={() => setIsMedModalOpen(true)}>
          <Pill className="h-4 w-4 mr-2" />
          Administer Medication
        </Button>
        <Button variant="outline" asChild>
          <Link to="/nurse/protocols">
            <ListChecks className="h-4 w-4 mr-2" />
            Care Protocols
          </Link>
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
          title="Patients in Queue"
          value={waitingPatients.length.toString()}
          subtitle="Active patients"
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
              <NursePatientQueue
                onRecordVitals={(patient) => {
                  setSelectedPatient(patient);
                  setIsVitalsModalOpen(true);
                }}
              />
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
                    <Link to="/patients">
                      <Users className="h-4 w-4 mr-2" />
                      Patient Records
                    </Link>
                  </Button>
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
