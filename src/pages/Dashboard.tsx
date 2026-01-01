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

export default function Dashboard() {
  const { primaryRole, hospital, roles } = useAuth();
  
  // If user has no hospital or roles, show the repair tool prominently
  const needsSetup = !hospital || roles.length === 0;

  const renderDashboard = () => {
    // If setup is incomplete, always show AdminDashboard which has the repair tool
    if (needsSetup) {
      return (
        <div className="space-y-8">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold mb-2">Account Setup Required</h1>
            <p className="text-muted-foreground mb-6">
              Your account needs to be configured before you can access the full dashboard.
            </p>
            <AdminRepairTool />
          </div>
        </div>
      );
    }

    switch (primaryRole) {
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
    </DashboardLayout>
  );
}
