import { lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { RoleSwitchErrorBoundary } from '@/components/DashboardErrorBoundary';
import { Loader2 } from 'lucide-react';
import { getDevTestRole } from '@/utils/devRoleSwitch';
import { UserRole } from '@/types/auth';

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
  const activeRole = (devTestRole || primaryRole || 'admin') as UserRole;

  const renderDashboard = () => {
    switch (activeRole) {
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
      <RoleSwitchErrorBoundary currentRole={activeRole}>
        <Suspense fallback={
          <div className="flex items-center justify-center p-12 min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }>
          {renderDashboard()}
        </Suspense>
      </RoleSwitchErrorBoundary>
    </DashboardLayout>
  );
}
