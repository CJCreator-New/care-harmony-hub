import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { PatientQueue } from './PatientQueue';
import { UpcomingAppointments } from './UpcomingAppointments';
import { RecentActivity } from './RecentActivity';
import { AdminRepairTool } from '@/components/admin/AdminRepairTool';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pill,
  UserPlus,
  BarChart3,
  Settings,
} from 'lucide-react';

export function AdminDashboard() {
  const { profile, hospital, roles } = useAuth();
  const needsRepair = !hospital || !roles.includes('admin');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {profile?.first_name || 'Admin'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Hospital overview and management dashboard.
            </p>
          </div>
          <Badge variant="admin" className="w-fit text-sm py-1.5 px-4">
            Administrator
          </Badge>
        </div>
      </div>

      {/* Account Repair Tool (shown if setup incomplete) */}
      {needsRepair && (
        <div className="mb-8">
          <AdminRepairTool />
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button asChild>
          <Link to="/settings/staff">
            <UserPlus className="h-4 w-4 mr-2" />
            Manage Staff
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
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
          title="Active Staff"
          value="--"
          subtitle="Loading..."
          icon={Users}
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
            <p className="text-sm text-muted-foreground">In Progress</p>
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
        <div className="lg:col-span-2 space-y-6">
          <PatientQueue />
          <UpcomingAppointments />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </>
  );
}
