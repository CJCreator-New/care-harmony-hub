import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGreeting } from '@/lib/utils/datetime';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Database,
  Smartphone,
} from 'lucide-react';
import { RecordVitalsModal } from '@/components/nurse/RecordVitalsModal';
import { ShiftHandoverModal } from '@/components/nurse/ShiftHandoverModal';
import { MedicationAdministrationModal } from '@/components/nurse/MedicationAdministrationModal';
import { OfflineIndicator } from '@/components/nurse/OfflineIndicator';
import { OfflineVitalsCaptureModal } from '@/components/nurse/OfflineVitalsCaptureModal';
import { OfflineVitalsHistory } from '@/components/nurse/OfflineVitalsHistory';
import { OfflineDataImportExport } from '@/components/nurse/OfflineDataImportExport';
import { SyncProgressPanel } from '@/components/nurse/SyncProgressPanel';
import { MobileLandscapeVitalsForm } from '@/components/nurse/MobileLandscapeVitalsForm';
import { NursePatientQueue } from '@/components/nurse/NursePatientQueue';
import { PatientPrepStation } from '@/components/nurse/PatientPrepStation';
import { useTodayVitalsCount } from '@/hooks/useVitalSigns';
import { useActiveQueue } from '@/hooks/useQueue';
import { usePendingHandovers, usePatientChecklists } from '@/hooks/useNurseWorkflow';
import { NurseTaskPanel } from '@/components/nurse/NurseTaskPanel';
import { DashboardPageTransition, DashboardSection } from './DashboardPageTransition';

export function NurseDashboard() {
  const { profile } = useAuth();
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [handoverMode, setHandoverMode] = useState<'create' | 'view' | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isOfflineVitalsOpen, setIsOfflineVitalsOpen] = useState(false);
  const [isMobileLandscapeOpen, setIsMobileLandscapeOpen] = useState(false);
  const [offlineTab, setOfflineTab] = useState<'history' | 'sync' | 'import'>(
    'history'
  );
  
  const { data: vitalsCount } = useTodayVitalsCount();
  const { data: activeQueue = [] } = useActiveQueue();
  const { handovers: pendingHandovers = [] } = usePendingHandovers(profile?.id);
  const { checklists = [] } = usePatientChecklists();

  // Count ALL active queue entries (waiting, called, in_service) for the KPI
  const waitingPatients = activeQueue || [];  const patientsInPrepCount = waitingPatients.filter(q => {
    const checklist = checklists.find(c => c.patient_id === q.patient_id);
    return !checklist?.ready_for_doctor && !checklist?.vitals_completed;
  }).length;  const readyForDoctor = waitingPatients.filter(q => 
    (q.status === 'waiting' || q.status === 'called') && 
    checklists.some(c => c.patient_id === q.patient_id && c.ready_for_doctor)
  ).length;

  return (
    <DashboardPageTransition className="space-y-8">
      <DashboardSection>
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
        </div>
      </div>

      {/* Offline Indicator */}
      <OfflineIndicator />
      </DashboardSection>

      <DashboardSection>
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => setIsVitalsModalOpen(true)}>
          <Heart className="h-4 w-4 mr-2" />
          Record Vitals
        </Button>
        <Button variant="outline" onClick={() => setIsOfflineVitalsOpen(true)}>
          <Heart className="h-4 w-4 mr-2" />
          Offline Vitals
        </Button>
        <Button variant="outline" onClick={() => setIsMobileLandscapeOpen(true)}>
          <Smartphone className="h-4 w-4 mr-2" />
          Mobile Entry
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
      </DashboardSection>

      <DashboardSection>
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
      </DashboardSection>

      <DashboardSection>
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="prep-station" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Prep Station
            {patientsInPrepCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {patientsInPrepCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Offline Data
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

        <TabsContent value="offline" className="space-y-6">
          <div className="space-y-6">
            {/* Offline Data Sub-Tabs */}
            <Tabs value={offlineTab} onValueChange={(val) => setOfflineTab(val as 'history' | 'sync' | 'import')} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="sync">Sync</TabsTrigger>
                <TabsTrigger value="import">Import/Export</TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <OfflineVitalsHistory />
              </TabsContent>

              <TabsContent value="sync">
                <SyncProgressPanel />
              </TabsContent>

              <TabsContent value="import">
                <OfflineDataImportExport />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
      </DashboardSection>

      {/* Modals */}
      <RecordVitalsModal
        open={isVitalsModalOpen}
        onOpenChange={setIsVitalsModalOpen}
        patient={selectedPatient}
        showPatientSelector={!selectedPatient}
      />
      
      <OfflineVitalsCaptureModal
        open={isOfflineVitalsOpen}
        onOpenChange={setIsOfflineVitalsOpen}
        onVitalsCaptured={() => {
          // Optional: refresh vitals count or show success message
        }}
      />

      <MobileLandscapeVitalsForm
        isOpen={isMobileLandscapeOpen}
        onClose={() => setIsMobileLandscapeOpen(false)}
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
    </DashboardPageTransition>
  );
}
