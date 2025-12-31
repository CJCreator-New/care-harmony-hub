import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, Video, MapPin, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  duration: string;
  type: 'in-person' | 'video';
  reason: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientName: 'Alice Brown',
    time: '09:00 AM',
    duration: '30 min',
    type: 'in-person',
    reason: 'General Consultation',
    status: 'confirmed',
  },
  {
    id: '2',
    patientName: 'David Lee',
    time: '09:45 AM',
    duration: '45 min',
    type: 'video',
    reason: 'Follow-up Appointment',
    status: 'confirmed',
  },
  {
    id: '3',
    patientName: 'Maria Garcia',
    time: '10:30 AM',
    duration: '30 min',
    type: 'in-person',
    reason: 'Lab Results Review',
    status: 'pending',
  },
  {
    id: '4',
    patientName: 'James Wilson',
    time: '11:15 AM',
    duration: '60 min',
    type: 'in-person',
    reason: 'Initial Assessment',
    status: 'confirmed',
  },
];

const statusStyles = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'destructive',
} as const;

export function UpcomingAppointments() {
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
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Today's Appointments</h3>
            <p className="text-sm text-muted-foreground">
              {mockAppointments.length} scheduled
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          View Calendar
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="divide-y divide-border">
        {mockAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center w-16 p-2 bg-muted rounded-lg text-center">
              <span className="text-lg font-bold text-foreground">
                {appointment.time.split(' ')[0]}
              </span>
              <span className="text-xs text-muted-foreground">
                {appointment.time.split(' ')[1]}
              </span>
            </div>

            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="text-sm font-medium">
                {getInitials(appointment.patientName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{appointment.patientName}</p>
              <p className="text-sm text-muted-foreground truncate">
                {appointment.reason}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{appointment.duration}</span>
              </div>

              {appointment.type === 'video' ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-info/10 text-info">
                  <Video className="w-4 h-4" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                </div>
              )}

              <Badge variant={statusStyles[appointment.status]}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-muted/30 border-t border-border">
        <Button className="w-full" variant="outline">
          + Schedule New Appointment
        </Button>
      </div>
    </div>
  );
}
