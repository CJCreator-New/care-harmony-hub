import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { PatientQueue } from '@/components/dashboard/PatientQueue';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pill,
} from 'lucide-react';
import { UserRole } from '@/types/auth';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  patient: 'Patient',
};

export default function Dashboard() {
  const { profile, primaryRole } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {profile?.first_name || 'User'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome to your {primaryRole ? roleLabels[primaryRole] : 'User'} dashboard. Here's what's happening today.
            </p>
          </div>
          {primaryRole && (
            <Badge variant={primaryRole as any} className="w-fit text-sm py-1.5 px-4">
              {roleLabels[primaryRole]}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Patients"
          value="--"
          subtitle="Loading..."
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Today's Appointments"
          value="--"
          subtitle="Loading..."
          icon={Calendar}
          variant="info"
        />
        <StatsCard
          title="Active Consultations"
          value="--"
          subtitle="Loading..."
          icon={Stethoscope}
          variant="success"
        />
        <StatsCard
          title="Avg. Wait Time"
          value="--"
          subtitle="Calculating..."
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
          <CheckCircle2 className="w-8 h-8 text-success" />
          <div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Completed Today</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
          <Clock className="w-8 h-8 text-warning" />
          <div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-critical/10 border border-critical/20">
          <AlertTriangle className="w-8 h-8 text-critical" />
          <div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Critical Alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-pharmacy/10 border border-pharmacy/20">
          <Pill className="w-8 h-8 text-pharmacy" />
          <div>
            <p className="text-2xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Prescriptions</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Queue */}
        <div className="lg:col-span-2 space-y-6">
          <PatientQueue />
          <UpcomingAppointments />
        </div>

        {/* Right Column - Activity */}
        <div>
          <RecentActivity />
        </div>
      </div>
    </DashboardLayout>
  );
}
