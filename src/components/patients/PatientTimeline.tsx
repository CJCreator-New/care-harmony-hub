import { format, parseISO } from 'date-fns';
import { 
  Stethoscope, 
  Pill, 
  FlaskConical, 
  Activity, 
  Calendar,
  ChevronRight,
  FileText,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'consultation' | 'prescription' | 'lab' | 'vitals';
  title: string;
  description: string;
  status?: string;
  meta?: any;
}

interface Props {
  patientId: string;
  events?: TimelineEvent[]; // Optional: can be fetched inside or passed down
}

export function PatientTimeline({ patientId, events = [] }: Props) {
  // Mock data if no events passed
  const displayEvents = events.length > 0 ? events : [
    {
      id: '1',
      date: '2024-05-20T10:30:00Z',
      type: 'consultation',
      title: 'General Consultation',
      description: 'Dr. Sarah Wilson - Routine checkup for seasonal allergies.',
      status: 'completed'
    },
    {
      id: '2',
      date: '2024-05-20T10:45:00Z',
      type: 'prescription',
      title: 'Prescription Issued',
      description: 'Cetirizine 10mg - 1 tab daily for 30 days.',
      status: 'dispensed'
    },
    {
      id: '3',
      date: '2024-05-15T09:00:00Z',
      type: 'vitals',
      title: 'Vital Signs Recorded',
      description: 'BP: 120/80 mmHg, Pulse: 72 bpm, Temp: 98.6°F',
    },
    {
      id: '4',
      date: '2024-05-10T14:20:00Z',
      type: 'lab',
      title: 'Complete Blood Count (CBC)',
      description: 'Laboratory Order #L-902-X. Results pending verification.',
      status: 'pending'
    },
  ] as TimelineEvent[];

  const getIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Stethoscope className="h-4 w-4 text-blue-500" />;
      case 'prescription': return <Pill className="h-4 w-4 text-green-500" />;
      case 'lab': return <FlaskConical className="h-4 w-4 text-purple-500" />;
      case 'vitals': return <Activity className="h-4 w-4 text-orange-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'consultation': return 'bg-blue-500/10 border-blue-200';
      case 'prescription': return 'bg-green-500/10 border-green-200';
      case 'lab': return 'bg-purple-500/10 border-purple-200';
      case 'vitals': return 'bg-orange-500/10 border-orange-200';
      default: return 'bg-gray-500/10 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Clinical Timeline
        </CardTitle>
        <CardDescription>Historical view of patient interactions and clinical events.</CardDescription>
      </CardHeader>
      <CardContent className="relative">
        {/* Timeline Vertical Line */}
        <div className="absolute left-9 top-0 bottom-0 w-px bg-border ml-[2px]" />

        <div className="space-y-8 relative">
          {displayEvents.map((event, index) => (
            <div key={event.id} className="flex gap-4 group">
              {/* Date Column */}
              <div className="w-16 pt-1 flex flex-col items-end shrink-0">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {format(parseISO(event.date), 'MMM d')}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {format(parseISO(event.date), 'HH:mm')}
                </span>
              </div>

              {/* Icon / Dot */}
              <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 shadow-sm ${getColorClass(event.type)}`}>
                {getIcon(event.type)}
              </div>

              {/* Content Card */}
              <div className="flex-1 pb-4">
                <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {event.title}
                    </h4>
                    {event.status && (
                      <Badge variant={event.status === 'pending' ? 'warning' : 'secondary'} className="text-[9px] h-4 px-1.5 font-normal">
                        {event.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View Details</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-4 opacity-10" />
            <p className="text-sm">No historical clinical data available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
