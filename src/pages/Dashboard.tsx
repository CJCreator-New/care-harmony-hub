import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { DoctorDashboard } from '@/components/dashboard/DoctorDashboard';
import { NurseDashboard } from '@/components/dashboard/NurseDashboard';
import { ReceptionistDashboard } from '@/components/dashboard/ReceptionistDashboard';
import { PharmacistDashboard } from '@/components/dashboard/PharmacistDashboard';
import { LabTechDashboard } from '@/components/dashboard/LabTechDashboard';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';
import { RoleSwitcher } from '@/components/dev/RoleSwitcher';

type RoleKey = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'patient';

export default function Dashboard() {
  const { primaryRole } = useAuth();
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
      {renderDashboard()}
      {import.meta.env.DEV && (
        <RoleSwitcher 
          currentRole={activeRole as RoleKey} 
          onRoleChange={handleRoleChange} 
        />
      )}
    </DashboardLayout>
  );
}