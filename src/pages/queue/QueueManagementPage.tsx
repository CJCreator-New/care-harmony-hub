import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/dashboard/StatsCard';
import {
  Users,
  Clock,
  UserCheck,
  Bell,
  Play,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useActiveQueue, useCallNextPatient, useStartService, useCompleteService, useQueueRealtime, QueueEntry } from '@/hooks/useQueue';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';

export default function QueueManagementPage() {
  const { data: queue = [], isLoading } = useActiveQueue();
  const callNext = useCallNextPatient();
  const startService = useStartService();
  const completeService = useCompleteService();
  
  // Enable realtime updates
  useQueueRealtime();

  // Force re-render every minute for wait times
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const waitingPatients = queue.filter(q => q.status === 'waiting');
  const calledPatients = queue.filter(q => q.status === 'called');
  const inServicePatients = queue.filter(q => q.status === 'in_service');

  const getWaitTime = (checkInTime: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(checkInTime));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const avgWaitTime = waitingPatients.length > 0
    ? Math.round(
        waitingPatients.reduce((acc, p) => acc + differenceInMinutes(new Date(), new Date(p.check_in_time)), 0) / waitingPatients.length
      )
    : 0;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'emergency':
        return <Badge variant="destructive">Emergency</Badge>;
      case 'urgent':
        return <Badge variant="warning">Urgent</Badge>;
      case 'high':
        return <Badge variant="secondary">High</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline">Waiting</Badge>;
      case 'called':
        return <Badge variant="info">Called</Badge>;
      case 'in_service':
        return <Badge variant="success">In Service</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleCallNext = (id: string) => {
    callNext.mutate(id);
  };

  const handleStartService = (id: string) => {
    startService.mutate(id);
  };

  const handleComplete = (id: string) => {
    completeService.mutate(id);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground">Real-time patient queue and service tracking</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Waiting"
            value={waitingPatients.length}
            subtitle="In queue"
            icon={Users}
            variant="warning"
          />
          <StatsCard
            title="Called"
            value={calledPatients.length}
            subtitle="Ready for service"
            icon={Bell}
            variant="info"
          />
          <StatsCard
            title="In Service"
            value={inServicePatients.length}
            subtitle="Being attended"
            icon={UserCheck}
            variant="success"
          />
          <StatsCard
            title="Avg Wait Time"
            value={`${avgWaitTime}m`}
            subtitle="Current average"
            icon={Clock}
            variant="default"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Waiting Queue */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Waiting Queue
              </CardTitle>
              <Badge variant="outline">{waitingPatients.length} waiting</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : waitingPatients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No patients waiting</p>
                  <p className="text-sm">New patients will appear here when checked in</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {waitingPatients.map((entry: QueueEntry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        entry.priority === 'emergency' || entry.priority === 'urgent'
                          ? 'border-destructive/50 bg-destructive/5'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                          #{entry.queue_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {entry.patient?.first_name} {entry.patient?.last_name}
                            </p>
                            {getPriorityBadge(entry.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entry.patient?.mrn} • {entry.department || 'General'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getWaitTime(entry.check_in_time)}
                          </p>
                          <p className="text-xs text-muted-foreground">waiting</p>
                        </div>
                        <Button size="sm" onClick={() => handleCallNext(entry.id)}>
                          <Bell className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Patients */}
          <div className="space-y-6">
            {/* Called Patients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-info" />
                  Called
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calledPatients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No patients called
                  </p>
                ) : (
                  <div className="space-y-3">
                    {calledPatients.map((entry: QueueEntry) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-info/5 border-info/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-lg">#{entry.queue_number}</span>
                          {getStatusBadge(entry.status)}
                        </div>
                        <p className="font-medium">
                          {entry.patient?.first_name} {entry.patient?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Called {formatDistanceToNow(new Date(entry.called_time!), { addSuffix: true })}
                        </p>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleStartService(entry.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start Service
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* In Service */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-success" />
                  In Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inServicePatients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No patients in service
                  </p>
                ) : (
                  <div className="space-y-3">
                    {inServicePatients.map((entry: QueueEntry) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-success/5 border-success/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-lg">#{entry.queue_number}</span>
                          {getStatusBadge(entry.status)}
                        </div>
                        <p className="font-medium">
                          {entry.patient?.first_name} {entry.patient?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Started {formatDistanceToNow(new Date(entry.service_start_time!), { addSuffix: true })}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleComplete(entry.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
