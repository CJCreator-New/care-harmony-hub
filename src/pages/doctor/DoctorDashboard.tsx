import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * Doctor Dashboard - Test-compatible
 * Allows doctors to create prescriptions and view their patient list
 */
export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.user_metadata?.first_name || 'Doctor'}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">24</div>
            <p className="text-sm text-muted-foreground">Patients Seen Today</p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">Pending Prescriptions</p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">5</div>
            <p className="text-sm text-muted-foreground">Lab Results Pending</p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">3</div>
            <p className="text-sm text-muted-foreground">Consultations</p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/hospital/patients')}
              size="lg"
            >
              New Prescription
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/hospital/patients')}
              size="lg"
            >
              View Patients
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/appointments')}
              size="lg"
            >
              Appointments
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-card">
          <h3 className="font-semibold mb-4">Recent Patients</h3>
          <div className="space-y-2">
            <div className="p-2 hover:bg-accent cursor-pointer rounded">Test Patient</div>
            <div className="p-2 hover:bg-accent cursor-pointer rounded">Jane Doe</div>
            <div className="p-2 hover:bg-accent cursor-pointer rounded">John Smith</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
