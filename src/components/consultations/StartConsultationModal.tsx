import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, 
  Clock, 
  Play, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
  Loader2,
  UserCheck,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useDoctorQueue } from '@/hooks/useDoctorStats';
import { useTodayAppointments } from '@/hooks/useAppointments';
import { useGetOrCreateConsultation } from '@/hooks/useConsultations';
import { usePatients } from '@/hooks/usePatients';
import { usePatientsReadyForDoctor } from '@/hooks/usePatientsReadyForDoctor';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInYears, differenceInMinutes } from 'date-fns';
import { QuickConsultationModal } from './QuickConsultationModal';

interface StartConsultationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartConsultationModal({ open, onOpenChange }: StartConsultationModalProps) {
  const navigate = useNavigate();
  const { profile, hospital } = useAuth();
  const { data: queuePatients, isLoading: queueLoading } = useDoctorQueue();
  const { data: appointments, isLoading: appointmentsLoading } = useTodayAppointments();
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: patientsReady = [], isLoading: readyLoading } = usePatientsReadyForDoctor();
  const getOrCreateConsultation = useGetOrCreateConsultation();
  const [startingId, setStartingId] = useState<string | null>(null);

  // Keyboard shortcut for opening modal (Ctrl+Shift+N)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'N' && !open) {
        event.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickConsultation, setQuickConsultation] = useState<any>(null);

  const handleStartConsultation = async (patientId: string) => {
    if (!profile?.id || !hospital?.id) return;

    setStartingId(patientId);
    try {
      const result = await getOrCreateConsultation.mutateAsync(patientId);
      onOpenChange(false);
      navigate(`/consultations/${result.id}`);
    } catch (error) {
      console.error('Failed to start consultation:', error);
    } finally {
      setStartingId(null);
    }
  };

  const handleQuickConsultation = async (patientId: string) => {
    if (!profile?.id || !hospital?.id) return;

    setStartingId(patientId);
    try {
      const result = await getOrCreateConsultation.mutateAsync(patientId);
      setQuickConsultation(result);
    } catch (error) {
      console.error('Failed to start consultation:', error);
    } finally {
      setStartingId(null);
    }
  };

  const getAge = (dob: string) => {
    return differenceInYears(new Date(), new Date(dob));
  };

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="secondary">Waiting</Badge>;
      case 'called':
        return <Badge className="bg-blue-500 text-white">Called</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500 text-white">In Progress</Badge>;
      case 'checked_in':
        return <Badge variant="secondary">Checked In</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter appointments for this doctor that are checked in but not yet in consultation
  const readyAppointments = appointments?.filter(
    apt => apt.doctor_id === profile?.id && 
           apt.status === 'checked_in'
  ) || [];

  // Create unified patient list with intelligent ranking
  const unifiedPatients = React.useMemo(() => {
    const patientMap = new Map();

    // Add patients ready for doctor (highest priority)
    patientsReady.forEach((entry) => {
      if (entry.patient) {
        const priority = entry.queue_entry?.priority === 'emergency' ? 100 :
                        entry.queue_entry?.priority === 'urgent' ? 90 : 80;
        const waitTime = entry.queue_entry ? differenceInMinutes(new Date(), new Date(entry.queue_entry.created_at)) : 0;
        const score = priority + Math.min(waitTime / 10, 10); // Cap wait time bonus at 10 points

        patientMap.set(entry.patient.id, {
          ...entry.patient,
          source: 'ready',
          priority: entry.queue_entry?.priority || 'normal',
          queueNumber: entry.queue_entry?.queue_number,
          waitTime,
          score,
          prepComplete: true,
          allergies: entry.patient.allergies || []
        });
      }
    });

    // Add queue patients
    queuePatients?.forEach((entry) => {
      if (entry.patient && !patientMap.has(entry.patient.id)) {
        const priority = entry.priority === 'emergency' ? 70 :
                        entry.priority === 'urgent' ? 60 : 50;
        const waitTime = differenceInMinutes(new Date(), new Date(entry.created_at));
        const score = priority + Math.min(waitTime / 10, 10);

        patientMap.set(entry.patient.id, {
          ...entry.patient,
          source: 'queue',
          priority: entry.priority || 'normal',
          queueNumber: entry.queue_number,
          waitTime,
          score,
          prepComplete: false,
          allergies: entry.patient.allergies || []
        });
      }
    });

    // Add checked-in appointments
    readyAppointments.forEach((apt) => {
      if (apt.patient && !patientMap.has(apt.patient.id)) {
        const waitTime = differenceInMinutes(new Date(), new Date(apt.created_at));
        const score = 40 + Math.min(waitTime / 10, 10);

        patientMap.set(apt.patient.id, {
          ...apt.patient,
          source: 'appointment',
          priority: 'normal',
          waitTime,
          score,
          prepComplete: false,
          allergies: apt.patient.allergies || []
        });
      }
    });

    // Add remaining patients (lowest priority)
    patients?.forEach((patient) => {
      if (!patientMap.has(patient.id)) {
        patientMap.set(patient.id, {
          ...patient,
          source: 'search',
          priority: 'normal',
          waitTime: 0,
          score: 10,
          prepComplete: false,
          allergies: patient.allergies || []
        });
      }
    });

    // Convert to array and sort by score (descending)
    return Array.from(patientMap.values())
      .sort((a, b) => b.score - a.score);
  }, [patientsReady, queuePatients, readyAppointments, patients]);

  // Filter unified patients by search term
  const filteredUnifiedPatients = React.useMemo(() => {
    if (!searchTerm) return unifiedPatients.slice(0, 20); // Show top 20 when no search

    return unifiedPatients.filter((patient) =>
      patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20); // Limit to 20 results
  }, [unifiedPatients, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Start Consultation
          </DialogTitle>
        </DialogHeader>

        {/* Unified Search Input */}
        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients by name or MRN..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {/* Unified Patient List */}
          <ScrollArea className="h-[400px] pr-4">
            {readyLoading || appointmentsLoading || patientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredUnifiedPatients.length > 0 ? (
              <div className="space-y-3">
                {filteredUnifiedPatients.map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onStartConsultation={handleStartConsultation}
                    startingId={startingId}
                  />
                ))}
              </div>
            ) : searchTerm ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No patients found matching "{searchTerm}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No patients available for consultation</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Quick Consultation Modal */}
        {quickConsultation && (
          <QuickConsultationModal
            open={!!quickConsultation}
            onOpenChange={(open) => {
              if (!open) {
                setQuickConsultation(null);
                onOpenChange(false);
              }
            }}
            consultation={quickConsultation}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Patient Card Component for unified display
interface PatientCardProps {
  patient: any;
  onStartConsultation: (patientId: string) => void;
  startingId: string | null;
}

function PatientCard({ patient, onStartConsultation, startingId }: PatientCardProps) {
  const getSourceBadge = () => {
    switch (patient.source) {
      case 'ready':
        return <Badge variant="default" className="bg-success text-success-foreground">Ready</Badge>;
      case 'queue':
        return <Badge variant="secondary">Queue</Badge>;
      case 'appointment':
        return <Badge variant="outline">Appointment</Badge>;
      default:
        return null;
    }
  };

  const getPriorityBadge = () => {
    if (patient.priority === 'emergency') {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Emergency
      </Badge>;
    }
    if (patient.priority === 'urgent') {
      return <Badge variant="destructive">Urgent</Badge>;
    }
    return null;
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
      patient.source === 'ready' ? 'border-success/20 bg-success/5 hover:bg-success/10' :
      patient.prepComplete ? 'border-success/20 bg-success/5 hover:bg-success/10' :
      'bg-card hover:bg-accent/50'
    }`}>
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          {patient.queueNumber && (
            <span className="font-bold text-success">#{patient.queueNumber}</span>
          )}
          <span className="font-medium">
            {patient.first_name} {patient.last_name}
          </span>
          {getSourceBadge()}
          {getPriorityBadge()}
          {patient.prepComplete && (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Prep Complete
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>MRN: {patient.mrn}</span>
          <span>{getAge(patient.date_of_birth)} yrs</span>
          <span className="capitalize">{patient.gender}</span>
          {patient.waitTime > 0 && (
            <span>Wait: {Math.floor(patient.waitTime / 60)}h {patient.waitTime % 60}m</span>
          )}
        </div>
        {patient.allergies && patient.allergies.length > 0 && (
          <p className="text-xs text-destructive">
            ⚠️ Allergies: {patient.allergies.join(', ')}
          </p>
        )}
      </div>
      <Button
        onClick={() => onStartConsultation(patient.id)}
        disabled={startingId === patient.id}
        className="ml-4"
      >
        {startingId === patient.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Start
          </>
        )}
      </Button>
    </div>
  );
}
