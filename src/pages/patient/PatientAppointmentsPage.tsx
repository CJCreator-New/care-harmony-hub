import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, User, Plus } from 'lucide-react';
import { usePatientAppointments } from '@/hooks/usePatientPortal';
import { usePatientAppointmentRequests } from '@/hooks/useAppointmentRequests';
import { RequestAppointmentModal } from '@/components/patient/RequestAppointmentModal';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

const statusColors: Record<string, string> = {
  scheduled: 'bg-info/10 text-info border-info/20',
  checked_in: 'bg-warning/10 text-warning border-warning/20',
  in_progress: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-muted text-muted-foreground border-muted',
};

const requestStatusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  scheduled: 'bg-info/10 text-info border-info/20',
};

export default function PatientAppointmentsPage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { data: appointments = [], isLoading } = usePatientAppointments();
  const { data: requests = [], isLoading: requestsLoading } = usePatientAppointmentRequests();
  
  const today = startOfDay(new Date());
  const upcomingAppointments = appointments.filter(
    (apt) => isAfter(parseISO(apt.scheduled_date), today) || 
             format(parseISO(apt.scheduled_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  );
  const pastAppointments = appointments.filter(
    (apt) => isBefore(parseISO(apt.scheduled_date), today) &&
             format(parseISO(apt.scheduled_date), 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')
  );
  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const AppointmentCard = ({ appointment }: { appointment: typeof appointments[0] }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center h-14 w-14 rounded-lg bg-primary/10 text-primary shrink-0">
              <span className="text-xs font-medium">
                {format(parseISO(appointment.scheduled_date), 'MMM')}
              </span>
              <span className="text-xl font-bold leading-none">
                {format(parseISO(appointment.scheduled_date), 'd')}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{appointment.appointment_type}</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {appointment.scheduled_time}
                </span>
                {appointment.doctor && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}
                  </span>
                )}
              </div>
              {appointment.reason_for_visit && (
                <p className="text-sm text-muted-foreground mt-2">
                  <span className="font-medium">Reason:</span> {appointment.reason_for_visit}
                </p>
              )}
            </div>
          </div>
          <Badge className={statusColors[appointment.status] || statusColors.scheduled}>
            {appointment.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
            <p className="text-muted-foreground">View and manage your scheduled visits</p>
          </div>
          <Button onClick={() => setIsRequestModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request Appointment
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No upcoming appointments</h3>
                  <p className="text-muted-foreground text-center">
                    You don't have any scheduled appointments at this time.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No appointment requests</h3>
                  <p className="text-muted-foreground text-center">
                    Request an appointment and it will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <Card key={req.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center justify-center h-14 w-14 rounded-lg bg-primary/10 text-primary shrink-0">
                            <span className="text-xs font-medium">
                              {format(parseISO(req.preferred_date), 'MMM')}
                            </span>
                            <span className="text-xl font-bold leading-none">
                              {format(parseISO(req.preferred_date), 'd')}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{req.appointment_type}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {req.preferred_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {req.preferred_time}
                                </span>
                              )}
                            </div>
                            {req.reason_for_visit && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <span className="font-medium">Reason:</span> {req.reason_for_visit}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={requestStatusColors[req.status] || requestStatusColors.pending}>
                          {req.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : pastAppointments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No past appointments</h3>
                  <p className="text-muted-foreground text-center">
                    Your appointment history will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <RequestAppointmentModal
          open={isRequestModalOpen}
          onOpenChange={setIsRequestModalOpen}
        />
      </div>
    </DashboardLayout>
  );
}
