import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Bell,
  Check,
  X,
  Phone,
  User,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useActiveQueue } from '@/hooks/useQueue';
import {
  useReceptionistStats,
  usePendingAppointmentRequests,
  useScheduledAppointments,
} from '@/hooks/useReceptionistStats';
import { useUpdateAppointmentRequest } from '@/hooks/useAppointmentRequests';
import { PatientCheckInModal } from '@/components/receptionist/PatientCheckInModal';
import { PatientCheckOutModal } from '@/components/receptionist/PatientCheckOutModal';
import { WalkInRegistrationModal } from '@/components/receptionist/WalkInRegistrationModal';
import { format, parseISO } from 'date-fns';

export function ReceptionistDashboard() {
  const { profile } = useAuth();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useReceptionistStats();
  const { data: pendingRequests = [], isLoading: requestsLoading } = usePendingAppointmentRequests();
  const { data: scheduledAppointments = [] } = useScheduledAppointments();
  const { data: queue = [] } = useActiveQueue();
  const updateRequest = useUpdateAppointmentRequest();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleApproveRequest = (requestId: string) => {
    if (!profile?.id) return;
    updateRequest.mutate({
      id: requestId,
      status: 'approved',
      reviewed_by: profile.id,
    });
  };

  const handleRejectRequest = (requestId: string) => {
    if (!profile?.id) return;
    updateRequest.mutate({
      id: requestId,
      status: 'rejected',
      reviewed_by: profile.id,
    });
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
      case 'emergency':
        return <Badge variant="destructive">{priority}</Badge>;
      case 'high':
        return <Badge variant="warning">{priority}</Badge>;
      default:
        return <Badge variant="secondary">normal</Badge>;
    }
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
        <Button variant="outline" asChild>
          <Link to="/receptionist/smart-scheduler">
            <Sparkles className="h-4 w-4 mr-2" />
            Smart Scheduler
          </Link>
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
          value={statsLoading ? '...' : stats?.todayAppointments || 0}
          subtitle="Scheduled"
          icon={Calendar}
          variant="primary"
        />
        <StatsCard
          title="Checked In"
          value={statsLoading ? '...' : stats?.checkedIn || 0}
          subtitle="Waiting for doctor"
          icon={CheckSquare}
          variant="success"
        />
        <StatsCard
          title="In Queue"
          value={statsLoading ? '...' : stats?.waitingInQueue || 0}
          subtitle={stats?.avgWaitTime ? `~${stats.avgWaitTime} min avg wait` : 'Waiting'}
          icon={Users}
          variant="info"
        />
        <StatsCard
          title="Pending Requests"
          value={statsLoading ? '...' : stats?.pendingRequests || 0}
          subtitle="Awaiting review"
          icon={Bell}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Scheduled Appointments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Appointment Requests */}
          {pendingRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-warning" />
                  Pending Appointment Requests
                  <Badge variant="warning" className="ml-2">{pendingRequests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {request.patient?.first_name} {request.patient?.last_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>MRN: {request.patient?.mrn}</span>
                              <span>•</span>
                              <span>{request.appointment_type}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(parseISO(request.preferred_date), 'MMM d, yyyy')}</span>
                              {request.preferred_time && (
                                <>
                                  <Clock className="h-3 w-3 ml-2" />
                                  <span>{request.preferred_time}</span>
                                </>
                              )}
                            </div>
                            {request.reason_for_visit && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {request.reason_for_visit}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={updateRequest.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={updateRequest.isPending}
                          >
                            {updateRequest.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Today's Scheduled Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Scheduled Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scheduledAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No scheduled appointments remaining</p>
                </div>
              ) : (
                <ScrollArea className="h-[320px]">
                  <div className="space-y-3">
                    {scheduledAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-lg font-bold text-primary">{apt.scheduled_time}</p>
                          </div>
                          <div>
                            <p className="font-medium">
                              {apt.patient?.first_name} {apt.patient?.last_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>MRN: {apt.patient?.mrn}</span>
                              {apt.doctor && (
                                <>
                                  <span>•</span>
                                  <span>Dr. {apt.doctor.last_name}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {apt.appointment_type}
                              </Badge>
                              {apt.priority && apt.priority !== 'normal' && getPriorityBadge(apt.priority)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {apt.patient?.phone && (
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => setCheckInOpen(true)}
                          >
                            Check In
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions & Queue */}
        <div className="space-y-6">
          {/* Quick Actions */}
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
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link to="/patients">
                  <FileText className="h-4 w-4 mr-2" />
                  Register New Patient
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Queue Status */}
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

          {/* Today's Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Patients Served</span>
                  <span className="font-medium">{stats?.completedToday || 0}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Revenue Collected</span>
                  <span className="font-medium text-success">
                    ${(stats?.totalRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pending Invoices</span>
                  <span className="font-medium text-warning">{stats?.pendingInvoices || 0}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link to="/billing">View Billing</Link>
                </Button>
              </div>
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
