import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, Clock, Video, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  duration: string;
  type: 'in-person' | 'video';
  reason: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface UpcomingAppointmentsProps {
  appointments?: Appointment[];
}

const statusStyles = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'destructive',
} as const;

export const UpcomingAppointments = React.forwardRef<HTMLDivElement, UpcomingAppointmentsProps>(
  ({ appointments = [] }, ref) => {
    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase();
    };

    return (
      <div ref={ref} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold">Today's Appointments</h3>
              <p className="text-sm text-muted-foreground">
                {appointments.length} scheduled
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/appointments">
              View Calendar
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No appointments today</p>
            <p className="text-sm text-muted-foreground/70">Schedule appointments to see them here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center w-16 p-2 bg-muted rounded-lg text-center">
                  <span className="text-lg font-bold text-foreground">
                    {appointment.time.split(' ')[0] || ''}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {appointment.time.split(' ')[1] || ''}
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
        )}

        <div className="p-4 bg-muted/30 border-t border-border">
          <Button className="w-full" variant="outline" asChild>
            <Link to="/appointments">+ Schedule New Appointment</Link>
          </Button>
        </div>
      </div>
    );
  }
);
UpcomingAppointments.displayName = "UpcomingAppointments";
