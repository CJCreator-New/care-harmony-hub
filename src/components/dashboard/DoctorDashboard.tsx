import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { PatientQueue } from './PatientQueue';
import { UpcomingAppointments } from './UpcomingAppointments';
import { RecentActivity } from './RecentActivity';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Calendar,
  Stethoscope,
  Clock,
  FileText,
  TestTube2,
  Video,
  Play,
  MessageSquare,
  Pill,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  Smartphone,
  BarChart,
  LayoutDashboard,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffPerformanceMetrics } from "@/components/analytics/StaffPerformanceMetrics";
import { useUnreadMessagesCount } from '@/hooks/useSecureMessaging';
import { useDoctorStats } from '@/hooks/useDoctorStats';
import { usePatientsReadyForDoctor } from '@/lib/hooks/patients';
import { StartConsultationModal } from '@/components/consultations/StartConsultationModal';
import { EnhancedTaskManagement } from '@/components/workflow/EnhancedTaskManagement';
import { differenceInMinutes } from 'date-fns';
import { useAudit } from '@/hooks/useAudit';
import { getGreeting } from '@/lib/utils/datetime';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPageTransition, DashboardSection } from './DashboardPageTransition';

export function DoctorDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: unreadCount } = useUnreadMessagesCount();
  const { data: stats, isLoading: statsLoading } = useDoctorStats();
  const { data: patientsReady = [], isLoading: readyLoading } = usePatientsReadyForDoctor();
  const [stableStats, setStableStats] = useState({
    todaysPatients: 0,
    completedConsultations: 0,
    pendingLabs: 0,
    readyForConsult: 0,
  });
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const { logActivity } = useAudit();

  useEffect(() => {
    if (stats) {
      setStableStats((prev) => ({
        ...prev,
        todaysPatients: stats.todaysPatients ?? prev.todaysPatients,
        completedConsultations: stats.completedConsultations ?? prev.completedConsultations,
        pendingLabs: stats.pendingLabs ?? prev.pendingLabs,
      }));
    }
  }, [stats]);

  useEffect(() => {
    if (!readyLoading) {
      setStableStats((prev) => ({ ...prev, readyForConsult: patientsReady.length }));
    }
  }, [patientsReady.length, readyLoading]);

  const handleStartConsultation = (patientId: string) => {
    logActivity({
      actionType: 'START_CONSULTATION',
      entityType: 'patients',
      entityId: patientId,
      severity: 'info'
    });
    navigate(`/consultations?patientId=${patientId}`);
  };

  return (
    <DashboardPageTransition className="space-y-8">
      <DashboardSection>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, Dr. {profile?.first_name || 'Doctor'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Your patient schedule and consultations for today.
            </p>
          </div>
          <Badge variant="doctor" className="w-fit text-sm py-1.5 px-4">
            Doctor
          </Badge>
        </div>
      </div>
      </DashboardSection>

      <DashboardSection>
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Clinical Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <BarChart className="h-4 w-4" />
            My Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setShowConsultationModal(true)}>
              <Play className="h-4 w-4 mr-2" />
              Start Consultation
            </Button>
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
            <Button variant="outline" asChild>
              <Link to="/consultations/mobile">
                <Smartphone className="h-4 w-4 mr-2" />
                Quick Notes
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/patients">
                <Users className="h-4 w-4 mr-2" />
                View Patients
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/telemedicine">
                <Video className="h-4 w-4 mr-2" />
                Telemedicine
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/messages">
                <MessageSquare className="h-4 w-4 mr-2" />
                {`Messages${unreadCount ? ` (${unreadCount})` : ''}`}
              </Link>
            </Button>
          </div>

      {/* Stats Grid */}
      {statsLoading && stableStats.todaysPatients === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Today's Patients"
            value={String(stableStats.todaysPatients)}
            subtitle="Scheduled"
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Ready for Consult"
            value={String(stableStats.readyForConsult)}
            subtitle="Awaiting you"
            icon={UserCheck}
            variant="success"
          />
          <StatsCard
            title="Consultations"
            value={String(stableStats.completedConsultations)}
            subtitle="Completed today"
            icon={Stethoscope}
            variant="info"
          />
          <StatsCard
            title="Pending Labs"
            value={String(stableStats.pendingLabs)}
            subtitle="Awaiting results"
            icon={TestTube2}
            variant="warning"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Task Management */}
          <EnhancedTaskManagement />
          {/* Patients Ready for Consultation */}
          {patientsReady.length > 0 && (
            <Card className="border-success/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-success" />
                  Patients Ready for Consultation
                  <Badge variant="success" className="ml-2">{patientsReady.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-3">
                    {patientsReady.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-success/5 border-success/20"
                      >
                        <div className="flex items-center gap-4">
                          {entry.queue_entry && (
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10 text-success font-bold text-lg">
                              #{entry.queue_entry.queue_number}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {entry.patient.first_name} {entry.patient.last_name}
                              </p>
                              {entry.queue_entry?.priority === 'urgent' || entry.queue_entry?.priority === 'emergency' ? (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {entry.queue_entry.priority}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              MRN: {entry.patient.mrn} • {entry.queue_entry?.department || 'General'}
                            </p>
                            {entry.patient.allergies && entry.patient.allergies.length > 0 && (
                              <p className="text-xs text-destructive mt-1">
                                ⚠️ Allergies: {entry.patient.allergies.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm text-muted-foreground">
                            {entry.queue_entry && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {differenceInMinutes(new Date(), new Date(entry.queue_entry.check_in_time))}m wait
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleStartConsultation(entry.patient.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          <PatientQueue />
          <UpcomingAppointments />
        </div>
        <div className="space-y-6">
          {/* Pending Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link 
                to="/laboratory" 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TestTube2 className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="font-medium text-sm">Lab Results to Review</p>
                    <p className="text-xs text-muted-foreground">
                      {statsLoading ? '...' : `${stats?.pendingLabReviews || 0} pending`}
                    </p>
                  </div>
                </div>
                {(stats?.pendingLabReviews || 0) > 0 && (
                  <Badge variant="secondary">{stats?.pendingLabReviews}</Badge>
                )}
              </Link>
              <Link 
                to="/consultations" 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Pill className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">Prescriptions Pending</p>
                    <p className="text-xs text-muted-foreground">
                      {statsLoading ? '...' : `${stats?.pendingPrescriptions || 0} pending`}
                    </p>
                  </div>
                </div>
                {(stats?.pendingPrescriptions || 0) > 0 && (
                  <Badge variant="secondary">{stats?.pendingPrescriptions}</Badge>
                )}
              </Link>
              <Link 
                to="/consultations" 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="font-medium text-sm">Follow-up Notes</p>
                    <p className="text-xs text-muted-foreground">
                      {statsLoading ? '...' : `${stats?.pendingFollowUps || 0} due`}
                    </p>
                  </div>
                </div>
                {(stats?.pendingFollowUps || 0) > 0 && (
                  <Badge variant="secondary">{stats?.pendingFollowUps}</Badge>
                )}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
      </TabsContent>

      <TabsContent value="performance">
        <StaffPerformanceMetrics role="doctor" />
      </TabsContent>
      </Tabs>
      </DashboardSection>

      {/* Start Consultation Modal */}
      <StartConsultationModal 
        open={showConsultationModal} 
        onOpenChange={setShowConsultationModal} 
      />
    </DashboardPageTransition>
  );
}
