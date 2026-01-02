import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { UpcomingAppointments } from './UpcomingAppointments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Calendar,
  Clock,
  CreditCard,
  UserPlus,
  CheckSquare,
  DollarSign,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useTodayAppointments } from '@/hooks/useAppointments';
import { useActiveQueue } from '@/hooks/useQueue';
import { useInvoiceStats } from '@/hooks/useBilling';
import { PatientCheckInModal } from '@/components/receptionist/PatientCheckInModal';
import { PatientCheckOutModal } from '@/components/receptionist/PatientCheckOutModal';
import { WalkInRegistrationModal } from '@/components/receptionist/WalkInRegistrationModal';

export function ReceptionistDashboard() {
  const { profile } = useAuth();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const { data: todayAppointments = [] } = useTodayAppointments();
  const { data: queue = [] } = useActiveQueue();
  const { data: invoiceStats } = useInvoiceStats();

  const scheduledCount = todayAppointments.filter(a => a.status === 'scheduled').length;
  const checkedInCount = todayAppointments.filter(a => a.status === 'checked_in').length;
  const waitingCount = queue.filter(q => q.status === 'waiting').length;

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
              {getGreeting()}, {profile?.first_name || 'Receptionist'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Appointments, check-ins, and billing overview.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit text-sm py-1.5 px-4">
            Receptionist
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => setCheckInOpen(true)}>
          <LogIn className="h-4 w-4 mr-2" />
          Check-In Patient
        </Button>
        <Button variant="outline" onClick={() => setCheckOutOpen(true)}>
          <LogOut className="h-4 w-4 mr-2" />
          Check-Out Patient
        </Button>
        <Button variant="outline" onClick={() => setWalkInOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Walk-In Registration
        </Button>
        <Button variant="outline" asChild>
          <Link to="/appointments">
            <Calendar className="h-4 w-4 mr-2" />
            New Appointment
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Today's Appointments"
          value={scheduledCount}
          subtitle="Scheduled"
          icon={Calendar}
          variant="primary"
        />
        <StatsCard
          title="Checked In"
          value={checkedInCount}
          subtitle="Waiting"
          icon={CheckSquare}
          variant="success"
        />
        <StatsCard
          title="In Queue"
          value={waitingCount}
          subtitle="Waiting"
          icon={Users}
          variant="info"
        />
        <StatsCard
          title="Pending Invoices"
          value={invoiceStats?.pending || 0}
          subtitle={`$${(invoiceStats?.totalOutstanding || 0).toLocaleString()} outstanding`}
          icon={DollarSign}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingAppointments />
        </div>
        <div className="space-y-6">
          {/* Quick Check-in */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" onClick={() => setWalkInOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Walk-in Registration
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/appointments">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/billing">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/queue">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Queue
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Queue Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Queue Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queue.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No patients in queue</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Waiting</span>
                    <Badge variant="warning">{queue.filter(q => q.status === 'waiting').length}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Called</span>
                    <Badge variant="info">{queue.filter(q => q.status === 'called').length}</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">In Service</span>
                    <Badge variant="success">{queue.filter(q => q.status === 'in_service').length}</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                    <Link to="/queue">View Full Queue</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <PatientCheckInModal open={checkInOpen} onOpenChange={setCheckInOpen} />
      <PatientCheckOutModal open={checkOutOpen} onOpenChange={setCheckOutOpen} />
      <WalkInRegistrationModal open={walkInOpen} onOpenChange={setWalkInOpen} />
    </>
  );
}
