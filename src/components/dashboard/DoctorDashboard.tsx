import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from './StatsCard';
import { PatientQueue } from './PatientQueue';
import { UpcomingAppointments } from './UpcomingAppointments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { useUnreadMessagesCount } from '@/hooks/useSecureMessaging';
import { useDoctorStats } from '@/hooks/useDoctorStats';
import { StartConsultationModal } from '@/components/consultations/StartConsultationModal';

export function DoctorDashboard() {
  const { profile } = useAuth();
  const { data: unreadCount } = useUnreadMessagesCount();
  const { data: stats, isLoading: statsLoading } = useDoctorStats();
  const [showConsultationModal, setShowConsultationModal] = useState(false);

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
              {getGreeting()}, Dr. {profile?.last_name || 'Doctor'}!
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

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={() => setShowConsultationModal(true)}>
          <Play className="h-4 w-4 mr-2" />
          Start Consultation
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
            Messages
            {unreadCount && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
            )}
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Today's Patients"
          value={statsLoading ? '--' : String(stats?.todaysPatients || 0)}
          subtitle="Scheduled"
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Consultations"
          value={statsLoading ? '--' : String(stats?.completedConsultations || 0)}
          subtitle="Completed today"
          icon={Stethoscope}
          variant="success"
        />
        <StatsCard
          title="Pending Labs"
          value={statsLoading ? '--' : String(stats?.pendingLabs || 0)}
          subtitle="Awaiting results"
          icon={TestTube2}
          variant="warning"
        />
        <StatsCard
          title="Avg. Duration"
          value={statsLoading ? '--' : `${stats?.avgConsultationDuration || 0}m`}
          subtitle="Per consultation"
          icon={Clock}
          variant="info"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                to="/pharmacy" 
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

      {/* Start Consultation Modal */}
      <StartConsultationModal 
        open={showConsultationModal} 
        onOpenChange={setShowConsultationModal} 
      />
    </>
  );
}
