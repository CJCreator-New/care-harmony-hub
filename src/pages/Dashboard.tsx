import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RoleSwitcher } from '@/components/dev/RoleSwitcher';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { Loader2 } from 'lucide-react';

// Lazy load role-specific dashboards
const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DoctorDashboard = lazy(() => import('@/components/dashboard/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const NurseDashboard = lazy(() => import('@/components/dashboard/NurseDashboard').then(m => ({ default: m.NurseDashboard })));
const ReceptionistDashboard = lazy(() => import('@/components/dashboard/ReceptionistDashboard').then(m => ({ default: m.ReceptionistDashboard })));
const PharmacistDashboard = lazy(() => import('@/components/dashboard/PharmacistDashboard').then(m => ({ default: m.PharmacistDashboard })));
const LabTechDashboard = lazy(() => import('@/components/dashboard/LabTechDashboard').then(m => ({ default: m.LabTechDashboard })));
const PatientDashboard = lazy(() => import('@/components/dashboard/PatientDashboard').then(m => ({ default: m.PatientDashboard })));

type RoleKey = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'patient';

export default function Dashboard() {
  const { primaryRole } = useAuth();
  useRealtimeUpdates();
  const [testRole, setTestRole] = useState<RoleKey | null>(() => {
    const stored = localStorage.getItem('testRole');
    return stored ? stored as RoleKey : null;
  });

  const handleRoleChange = (role: RoleKey) => {
    setTestRole(role);
    localStorage.setItem('testRole', role);
  };
  
  // Use test role if set, otherwise use actual role
  const activeRole = testRole || primaryRole || 'admin';

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
    <DashboardLayout testRole={testRole}>
      <Suspense fallback={
        <div className="flex items-center justify-center p-12 min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        {renderDashboard()}
      </Suspense>
      {import.meta.env.DEV && (
        <RoleSwitcher 
          currentRole={activeRole as RoleKey} 
          onRoleChange={handleRoleChange} 
        />
      )}
    </DashboardLayout>
  );
}