import fs from 'fs';

const filePath = 'src/components/dashboard/UpcomingAppointments.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Add import
content = content.replace("import { Link } from 'react-router-dom';", "import { Link } from 'react-router-dom';\nimport { useTodayAppointments } from '@/hooks/useAppointments';");

// Change component
const signature = `export const UpcomingAppointments = React.forwardRef<HTMLDivElement, UpcomingAppointmentsProps>(
  ({ appointments: propAppointments }, ref) => {
    const { data: dbAppointments = [], isLoading } = useTodayAppointments();

    const appointments: Appointment[] = propAppointments || dbAppointments.map((apt: any) => ({
      id: apt.id,
      patientName: apt.patient?.first_name ? \`\${apt.patient.first_name} \${apt.patient.last_name}\` : 'Unknown Patient',
      time: apt.scheduled_time?.slice(0, 5) || '12:00',
      duration: \`\${apt.duration_minutes || 30} min\`,
      type: apt.appointment_type === 'video' ? 'video' : 'in-person',
      reason: apt.reason_for_visit || 'General Consultation',
      status: (apt.status === 'scheduled' || apt.status === 'checked_in') ? 'confirmed' :
              apt.status === 'cancelled' ? 'cancelled' : 'pending'
    }));

    const getInitials = (name: string) => {`;

content = content.replace(/export const UpcomingAppointments = React\.forwardRef<HTMLDivElement, UpcomingAppointmentsProps>\(\r?\n\s*\(\{\s*appointments\s*=\s*\[\]\s*\}, ref\) => \{\r?\n\s*const getInitials = \(name: string\) => \{/, signature);

fs.writeFileSync(filePath, content);
console.log('Done!');