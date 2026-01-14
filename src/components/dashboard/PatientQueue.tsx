import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, ArrowRight, AlertTriangle, Users, Play, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useActiveQueue, useQueueRealtime, QueueEntry } from '@/hooks/useQueue';
import { usePatientChecklists } from '@/hooks/useNurseWorkflow';
import { differenceInMinutes } from 'date-fns';

const priorityStyles = {
  emergency: 'destructive',
  urgent: 'warning',
  high: 'secondary',
  normal: 'outline',
  low: 'outline',
} as const;

const statusStyles = {
  waiting: 'bg-muted text-muted-foreground',
  called: 'bg-info/10 text-info',
  in_service: 'bg-success/10 text-success',
  completed: 'bg-muted text-muted-foreground',
};

const statusLabels = {
  waiting: 'Waiting',
  called: 'Called',
  in_service: 'In Service',
  completed: 'Completed',
};

export function PatientQueue() {
  const { data: queue = [], isLoading } = useActiveQueue();
  const { checklists = [] } = usePatientChecklists();

  // Enable realtime updates
  useQueueRealtime();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getWaitTime = (checkInTime: string) => {
    const minutes = differenceInMinutes(new Date(), new Date(checkInTime));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Check if patient has prep checklist completed
  const isPatientReady = (patientId: string) => {
    return checklists.some(c => c.patient_id === patientId && c.ready_for_doctor);
  };

  // Limit to first 5 entries for dashboard view
  const displayQueue = queue.slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold">Patient Queue</h3>
          <p className="text-sm text-muted-foreground">{queue.length} patients active</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/queue">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
          <p className="text-muted-foreground">Loading queue...</p>
        </div>
      ) : displayQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">No patients in queue</p>
          <p className="text-sm text-muted-foreground/70">Patients will appear here when checked in</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {displayQueue.map((entry: QueueEntry, index) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors',
                index === 0 && (entry.priority === 'emergency' || entry.priority === 'urgent') && 'bg-destructive/5'
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10 border">
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(entry.patient?.first_name || '', entry.patient?.last_name || '')}
                  </AvatarFallback>
                </Avatar>
                {isPatientReady(entry.patient_id) && (
                  <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 text-success bg-background rounded-full" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">#{entry.queue_number}</span>
                  <p className="font-medium truncate">
                    {entry.patient?.first_name} {entry.patient?.last_name}
                  </p>
                  {entry.priority === 'emergency' && (
                    <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{entry.patient?.mrn}</span>
                  <span>•</span>
                  <span>{entry.department || 'General'}</span>
                  {isPatientReady(entry.patient_id) && (
                    <>
                      <span>•</span>
                      <span className="text-success font-medium">Ready for Doctor</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{getWaitTime(entry.check_in_time)}</span>
                  </div>
                  {entry.priority && entry.priority !== 'normal' && (
                    <Badge variant={priorityStyles[entry.priority]} className="mt-1">
                      {entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1)}
                    </Badge>
                  )}
                </div>

                <div
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    statusStyles[entry.status]
                  )}
                >
                  {statusLabels[entry.status]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
