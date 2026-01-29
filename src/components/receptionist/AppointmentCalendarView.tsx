import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_date: string;
  scheduled_time: string;
  appointment_type: string;
  status: string;
  priority?: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
  doctor?: {
    first_name: string;
    last_name: string;
  };
}

interface AppointmentCalendarViewProps {
  onNewAppointment?: () => void;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function AppointmentCalendarView({ onNewAppointment, onAppointmentClick }: AppointmentCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);

  const { data: appointments = [] } = useAppointments();

  // Extract unique doctors from appointments
  const doctors = Array.from(
    new Map(
      appointments
        .filter(apt => apt.doctor)
        .map(apt => [apt.doctor!.id, apt.doctor!])
    ).values()
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt =>
      isSameDay(new Date(apt.scheduled_date), date) && apt.status === 'scheduled'
    );
  };

  const getAppointmentsForDoctor = (doctorId: string, date: Date) => {
    return appointments.filter(apt =>
      apt.doctor_id === doctorId &&
      isSameDay(new Date(apt.scheduled_date), date) &&
      apt.status === 'scheduled'
    );
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    onAppointmentClick?.(appointment);
  };

  const handleDragStart = (appointment: Appointment) => {
    setDraggedAppointment(appointment);
  };

  const handleDrop = (date: Date, doctorId?: string) => {
    if (!draggedAppointment) return;

    // Here you would implement the rescheduling logic
    console.log('Rescheduling appointment:', draggedAppointment.id, 'to:', format(date, 'yyyy-MM-dd'), 'with doctor:', doctorId);
    setDraggedAppointment(null);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const AppointmentCard = ({ appointment, compact = false }: { appointment: Appointment; compact?: boolean }) => (
    <div
      className={`p-2 bg-primary/10 border border-primary/20 rounded text-xs cursor-pointer hover:bg-primary/20 transition-colors ${
        compact ? 'mb-1' : 'mb-2'
      }`}
      onClick={() => handleAppointmentClick(appointment)}
      draggable
      onDragStart={() => handleDragStart(appointment)}
    >
      <div className="font-medium truncate">
        {appointment.patient?.first_name} {appointment.patient?.last_name}
      </div>
      <div className="text-muted-foreground">
        {appointment.scheduled_time} - {appointment.appointment_type}
      </div>
      {appointment.priority && appointment.priority !== 'normal' && (
        <Badge variant="destructive" className="text-xs mt-1">
          {appointment.priority}
        </Badge>
      )}
    </div>
  );

  const renderMonthView = () => (
    <div className="grid grid-cols-7 gap-1">
      {/* Header */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
          {day}
        </div>
      ))}

      {/* Days */}
      {calendarDays.map(day => {
        const dayAppointments = getAppointmentsForDate(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={day.toISOString()}
            className={`min-h-[120px] p-2 border border-border/50 ${
              isCurrentMonth ? 'bg-background' : 'bg-muted/20'
            } ${isToday ? 'bg-primary/5 border-primary/30' : ''}`}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(day);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? '' : 'text-muted-foreground'}`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayAppointments.slice(0, 3).map(apt => (
                <AppointmentCard key={apt.id} appointment={apt} compact />
              ))}
              {dayAppointments.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{dayAppointments.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        {doctors.map(doctor => (
          <Card key={doctor.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Dr. {doctor.last_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const dayAppointments = getAppointmentsForDoctor(doctor.id, day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[80px] p-2 border rounded ${
                        isToday ? 'bg-primary/5 border-primary/30' : 'border-border/50'
                      }`}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(day, doctor.id);
                      }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <div className="text-xs font-medium mb-1">
                        {format(day, 'EEE d')}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.map(apt => (
                          <AppointmentCard key={apt.id} appointment={apt} compact />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={onNewAppointment}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Patient</label>
                  <p>{selectedAppointment.patient?.first_name} {selectedAppointment.patient?.last_name}</p>
                  <p className="text-sm text-muted-foreground">MRN: {selectedAppointment.patient?.mrn}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Doctor</label>
                  <p>Dr. {selectedAppointment.doctor?.last_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Date & Time</label>
                  <p>{format(new Date(selectedAppointment.scheduled_date), 'PPP')}</p>
                  <p>{selectedAppointment.scheduled_time}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p>{selectedAppointment.appointment_type}</p>
                  {selectedAppointment.priority && (
                    <Badge variant="destructive" className="mt-1">
                      {selectedAppointment.priority}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Reschedule</Button>
                <Button variant="outline">Cancel</Button>
                <Button>Edit</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}