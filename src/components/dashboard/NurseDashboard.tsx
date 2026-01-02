import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { PatientQueue } from './PatientQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { RecordVitalsModal } from '@/components/nurse/RecordVitalsModal';
import { ShiftHandoverModal } from '@/components/nurse/ShiftHandoverModal';
import { MedicationAdministrationModal } from '@/components/nurse/MedicationAdministrationModal';
import { useTodayVitalsCount } from '@/hooks/useVitalSigns';
import { useQueue } from '@/hooks/useQueue';
import { usePendingHandovers, usePatientChecklists } from '@/hooks/useNurseWorkflow';

export function NurseDashboard() {
  const { profile } = useAuth();
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [handoverMode, setHandoverMode] = useState<'create' | 'view' | null>(null);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  
  const { data: vitalsCount } = useTodayVitalsCount();
  const { data: queueData } = useQueue();
  const { data: pendingHandovers = [] } = usePendingHandovers();
  const { data: checklists = [] } = usePatientChecklists();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const waitingPatients = queueData?.filter(q => q.status === 'waiting') || [];
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
        <div className="lg:col-span-2">
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
