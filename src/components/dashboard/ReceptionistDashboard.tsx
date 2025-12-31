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
} from 'lucide-react';

export function ReceptionistDashboard() {
  const { profile } = useAuth();

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
          <Badge variant="receptionist" className="w-fit text-sm py-1.5 px-4">
            Receptionist
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button asChild>
          <Link to="/patients">
            <UserPlus className="h-4 w-4 mr-2" />
            Register Patient
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/appointments">
            <Calendar className="h-4 w-4 mr-2" />
            New Appointment
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Process Payment
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Today's Appointments"
          value="--"
          subtitle="Scheduled"
          icon={Calendar}
          variant="primary"
        />
        <StatsCard
          title="Checked In"
          value="--"
          subtitle="Waiting"
          icon={CheckSquare}
          variant="success"
        />
        <StatsCard
          title="Walk-ins Today"
          value="--"
          subtitle="Registered"
          icon={Users}
          variant="info"
        />
        <StatsCard
          title="Payments Processed"
          value="--"
          subtitle="Today"
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
              <Button className="w-full justify-start" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Walk-in Registration
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Generate Invoice
              </Button>
            </CardContent>
          </Card>

          {/* Pending Payments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-warning" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending payments</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
