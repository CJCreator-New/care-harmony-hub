import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueuePatient {
  id: string;
  name: string;
  mrn: string;
  waitTime: string;
  priority: 'emergency' | 'urgent' | 'normal' | 'low';
  reason: string;
  status: 'waiting' | 'in-progress' | 'ready';
}

const mockQueue: QueuePatient[] = [
  {
    id: '1',
    name: 'John Smith',
    mrn: 'MRN-001234',
    waitTime: '5 min',
    priority: 'emergency',
    reason: 'Chest pain',
    status: 'waiting',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    mrn: 'MRN-001235',
    waitTime: '12 min',
    priority: 'urgent',
    reason: 'Severe headache',
    status: 'waiting',
  },
  {
    id: '3',
    name: 'Michael Chen',
    mrn: 'MRN-001236',
    waitTime: '18 min',
    priority: 'normal',
    reason: 'Follow-up visit',
    status: 'in-progress',
  },
  {
    id: '4',
    name: 'Emily Davis',
    mrn: 'MRN-001237',
    waitTime: '25 min',
    priority: 'normal',
    reason: 'Annual checkup',
    status: 'waiting',
  },
  {
    id: '5',
    name: 'Robert Wilson',
    mrn: 'MRN-001238',
    waitTime: '32 min',
    priority: 'low',
    reason: 'Prescription refill',
    status: 'ready',
  },
];

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

export function PatientQueue() {
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
          <p className="text-sm text-muted-foreground">{mockQueue.length} patients waiting</p>
        </div>
        <Button variant="outline" size="sm">
          View All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="divide-y divide-border">
        {mockQueue.map((patient, index) => (
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
    </div>
  );
}
