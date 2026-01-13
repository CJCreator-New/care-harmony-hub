import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Pill,
  TestTube2,
  Activity,
  Clock,
  ArrowRight,
  User,
  Heart,
} from 'lucide-react';
import {
  usePatientProfile,
  usePatientAppointments,
  usePatientPrescriptions,
  usePatientLabResults,
} from '@/hooks/usePatientPortal';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

const statusColors: Record<string, string> = {
  scheduled: 'bg-info/10 text-info border-info/20',
  completed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  dispensed: 'bg-success/10 text-success border-success/20',
};

export function PatientDashboard() {
  const { profile } = useAuth();
  const { profile: patientProfile, loading: profileLoading } = usePatientProfile();
  const { appointments = [], loading: appointmentsLoading } = usePatientAppointments();
  const { prescriptions = [], loading: prescriptionsLoading } = usePatientPrescriptions();
  const { labResults = [], loading: labLoading } = usePatientLabResults();

  const today = startOfDay(new Date());
  const upcomingAppointments = appointments.filter(
    (apt) => isAfter(parseISO(apt.scheduled_date), today) || 
             format(parseISO(apt.scheduled_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  ).slice(0, 3);

  const activePrescriptions = prescriptions.filter((p) => p.status === 'pending').slice(0, 3);
  const recentLabResults = labResults.filter((l) => l.status === 'completed').slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your health records and appointments
          </p>
        </div>
        {patientProfile && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">MRN: {patientProfile.mrn}</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
                <p className="text-xs text-muted-foreground">scheduled visits</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {prescriptionsLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activePrescriptions.length}</div>
                <p className="text-xs text-muted-foreground">to be dispensed</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Results</CardTitle>
            <TestTube2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {labLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <>
                <div className="text-2xl font-bold">{recentLabResults.length}</div>
                <p className="text-xs text-muted-foreground">recent results</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium text-success">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">All records up to date</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
              <CardDescription>Your scheduled visits</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/patient/appointments">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                        <span className="text-xs font-medium">
                          {format(parseISO(apt.scheduled_date), 'MMM')}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {format(parseISO(apt.scheduled_date), 'd')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{apt.appointment_type}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{apt.scheduled_time}</span>
                          {apt.doctor && (
                            <>
                              <span>•</span>
                              <span>Dr. {apt.doctor.first_name} {apt.doctor.last_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={statusColors[apt.status] || statusColors.scheduled}>
                      {apt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Prescriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active Prescriptions</CardTitle>
              <CardDescription>Medications prescribed to you</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/patient/prescriptions">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {prescriptionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activePrescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pill className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No active prescriptions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activePrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {format(parseISO(rx.created_at), 'MMM d, yyyy')}
                      </span>
                      <Badge className={statusColors[rx.status] || statusColors.pending}>
                        {rx.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {rx.items.slice(0, 2).map((item) => (
                        <p key={item.id} className="text-sm">
                          <span className="font-medium">{item.medication_name}</span>
                          <span className="text-muted-foreground"> - {item.dosage}, {item.frequency}</span>
                        </p>
                      ))}
                      {rx.items.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{rx.items.length - 2} more medications
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Lab Results */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Lab Results</CardTitle>
              <CardDescription>Your latest test results</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/patient/lab-results">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {labLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : recentLabResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No lab results available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recentLabResults.map((lab) => (
                  <div
                    key={lab.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {lab.test_category || 'General'}
                      </Badge>
                      <Badge className={statusColors[lab.status] || statusColors.completed}>
                        {lab.status}
                      </Badge>
                    </div>
                    <p className="font-medium">{lab.test_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lab.completed_at
                        ? format(parseISO(lab.completed_at), 'MMM d, yyyy')
                        : format(parseISO(lab.ordered_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
