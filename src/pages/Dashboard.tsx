import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { DoctorDashboard } from '@/components/dashboard/DoctorDashboard';
import { NurseDashboard } from '@/components/dashboard/NurseDashboard';
import { ReceptionistDashboard } from '@/components/dashboard/ReceptionistDashboard';
import { PharmacistDashboard } from '@/components/dashboard/PharmacistDashboard';
import { LabTechDashboard } from '@/components/dashboard/LabTechDashboard';

export default function Dashboard() {
  const { primaryRole } = useAuth();

  const renderDashboard = () => {
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
