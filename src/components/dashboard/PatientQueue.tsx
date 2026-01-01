import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, ArrowRight, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface QueuePatient {
  id: string;
  name: string;
  mrn: string;
  waitTime: string;
  priority: 'emergency' | 'urgent' | 'normal' | 'low';
  reason: string;
  status: 'waiting' | 'in-progress' | 'ready';
}

interface PatientQueueProps {
  patients?: QueuePatient[];
}

const statusStyles = {
  waiting: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-info/10 text-info',
  ready: 'bg-success/10 text-success',
};

const statusLabels = {
  waiting: 'Waiting',
  'in-progress': 'In Progress',
  ready: 'Ready',
};

export function PatientQueue({ patients = [] }: PatientQueueProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold">Patient Queue</h3>
          <p className="text-sm text-muted-foreground">{patients.length} patients waiting</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/queue">
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">No patients in queue</p>
          <p className="text-sm text-muted-foreground/70">Patients will appear here when checked in</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {patients.map((patient, index) => (
            <div
              key={patient.id}
              className={cn(
                'flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors',
                index === 0 && patient.priority === 'emergency' && 'bg-destructive/5'
              )}
            >
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className="text-sm font-medium">
                  {getInitials(patient.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{patient.name}</p>
                  {patient.priority === 'emergency' && (
                    <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{patient.mrn}</span>
                  <span>•</span>
                  <span>{patient.reason}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{patient.waitTime}</span>
                  </div>
                  <Badge variant={patient.priority} className="mt-1">
                    {patient.priority.charAt(0).toUpperCase() + patient.priority.slice(1)}
                  </Badge>
                </div>

                <div
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    statusStyles[patient.status]
                  )}
                >
                  {statusLabels[patient.status]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
