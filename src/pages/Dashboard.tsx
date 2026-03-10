import { lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { RoleSwitchErrorBoundary } from '@/components/DashboardErrorBoundary';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getDevTestRole } from '@/utils/devRoleSwitch';
import { UserRole } from '@/types/auth';

// Skeleton placeholder shown while role dashboard lazy-loads
const dashboardSkeletonKeys = ['card-1', 'card-2', 'card-3', 'card-4'];
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardSkeletonKeys.map((key) => (
          <Skeleton key={key} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// Lazy load role-specific dashboards
const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DoctorDashboard = lazy(() => import('@/components/dashboard/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const NurseDashboard = lazy(() => import('@/components/dashboard/NurseDashboard').then(m => ({ default: m.NurseDashboard })));
const ReceptionistDashboard = lazy(() => import('@/components/dashboard/ReceptionistDashboard').then(m => ({ default: m.ReceptionistDashboard })));
const PharmacistDashboard = lazy(() => import('@/components/dashboard/PharmacistDashboard').then(m => ({ default: m.PharmacistDashboard })));
const LabTechDashboard = lazy(() => import('@/components/dashboard/LabTechDashboard').then(m => ({ default: m.LabTechDashboard })));
const PatientDashboard = lazy(() => import('@/components/dashboard/PatientDashboard').then(m => ({ default: m.PatientDashboard })));

export default function Dashboard() {
  const { primaryRole, roles } = useAuth();
  useRealtimeUpdates();
  const devTestRole = getDevTestRole(roles);
  const activeRole = devTestRole || primaryRole;

  const renderDashboard = () => {
    if (!activeRole) {
      return (
        <div className="flex items-center justify-center p-12 min-h-[400px]">
          <div role="status" aria-label="Loading dashboard" className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      );
    }

    switch (activeRole as UserRole) {
      case 'admin':
        return <AdminDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'nurse':
        return <NurseDashboard />;
      case 'receptionist':
        return <ReceptionistDashboard />;
      case 'pharmacist':
        return <PharmacistDashboard />;
      case 'lab_technician':
        return <LabTechDashboard />;
      case 'patient':
        return <PatientDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <DashboardLayout>
      <RoleSwitchErrorBoundary key={activeRole || 'loading'} currentRole={activeRole}>
        <Suspense fallback={<DashboardSkeleton />}>
          {renderDashboard()}
        </Suspense>
      </RoleSwitchErrorBoundary>
    </DashboardLayout>
  );
}
