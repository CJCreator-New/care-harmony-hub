import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { DoctorDashboard } from '@/components/dashboard/DoctorDashboard';
import { NurseDashboard } from '@/components/dashboard/NurseDashboard';
import { ReceptionistDashboard } from '@/components/dashboard/ReceptionistDashboard';
import { PharmacistDashboard } from '@/components/dashboard/PharmacistDashboard';
import { LabTechDashboard } from '@/components/dashboard/LabTechDashboard';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { AdminRepairTool } from '@/components/admin/AdminRepairTool';
import { RoleSwitcher } from '@/components/dev/RoleSwitcher';

type RoleKey = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'patient';

export default function Dashboard() {
  const { primaryRole, hospital, roles } = useAuth();
  const [testRole, setTestRole] = useState<RoleKey | null>(null);
  
  // Use test role if set, otherwise use actual role
  const activeRole = testRole || primaryRole || 'admin';
  
  // If user has no hospital or roles, show the repair tool prominently
  const needsSetup = !hospital || roles.length === 0;

  const renderDashboard = () => {
    // If setup is incomplete and no test role selected, show repair tool
    if (needsSetup && !testRole) {
      return (
        <div className="space-y-8">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold mb-2">Account Setup Required</h1>
            <p className="text-muted-foreground mb-6">
              Your account needs to be configured before you can access the full dashboard.
              Use the role switcher (bottom-right) to preview different dashboards.
            </p>
            <AdminRepairTool />
          </div>
        </div>
      );
    }

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
      {renderDashboard()}
      <RoleSwitcher 
        currentRole={activeRole as RoleKey} 
        onRoleChange={(role) => setTestRole(role)} 
      />
    </DashboardLayout>
  );
}
