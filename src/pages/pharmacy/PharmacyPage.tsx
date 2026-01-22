import { DashboardLayout } from '@/components/layout/DashboardLayout';
import PharmacistDashboard from '@/components/pharmacist/PharmacistDashboard';

export default function PharmacyPage() {
  return (
    <DashboardLayout>
      <PharmacistDashboard />
    </DashboardLayout>
  );
}
