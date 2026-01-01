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
} from 'lucide-react';
import { RecordVitalsModal } from '@/components/nurse/RecordVitalsModal';
import { useTodayVitalsCount } from '@/hooks/useVitalSigns';
import { useQueue } from '@/hooks/useQueue';

export function NurseDashboard() {
  const { profile } = useAuth();
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  const { data: vitalsCount } = useTodayVitalsCount();
  const { data: queueData } = useQueue();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const waitingPatients = queueData?.filter(q => q.status === 'waiting') || [];

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
          <Badge variant="nurse" className="w-fit text-sm py-1.5 px-4">
            Nurse
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button>
          <UserCheck className="h-4 w-4 mr-2" />
          Call Next Patient
        </Button>
        <Button onClick={() => setIsVitalsModalOpen(true)}>
          <Heart className="h-4 w-4 mr-2" />
          Record Vitals
        </Button>
        <Button variant="outline" asChild>
          <Link to="/consultations">
            <Activity className="h-4 w-4 mr-2" />
            Active Consultations
          </Link>
        </Button>
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
          title="Active Consults"
          value="--"
          subtitle="In progress"
          icon={Activity}
          variant="primary"
        />
        <StatsCard
          title="Avg. Wait Time"
          value="--"
          subtitle="Current"
          icon={Clock}
          variant="info"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PatientQueue />
        </div>
        <div className="space-y-6">
          {/* Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Clock className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Vitals Due</p>
                  <p className="text-xs text-muted-foreground">3 patients waiting</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Pre-consult Complete</p>
                  <p className="text-xs text-muted-foreground">5 patients ready</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Activity className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Doctor Handoffs</p>
                  <p className="text-xs text-muted-foreground">2 pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordVitalsModal
        open={isVitalsModalOpen}
        onOpenChange={setIsVitalsModalOpen}
        patient={selectedPatient}
      />
    </>
  );
}
