import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { useDoctorQueue } from '@/hooks/useDoctorStats';
import { useTodayAppointments } from '@/hooks/useAppointments';
import { useCreateConsultation } from '@/hooks/useConsultations';
import { usePatients } from '@/hooks/usePatients';
import { usePatientsReadyForDoctor } from '@/hooks/usePatientsReadyForDoctor';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, differenceInYears, differenceInMinutes } from 'date-fns';

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
  const createConsultation = useCreateConsultation();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleStartConsultation = async (patientId: string, appointmentId?: string | null) => {
    if (!profile?.id || !hospital?.id) return;

    setStartingId(patientId);
    try {
      const result = await createConsultation.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId || null,
      });

      toast.success('Consultation started');
      onOpenChange(false);
      navigate(`/consultations/${result.id}`);
    } catch (error) {
      toast.error('Failed to start consultation');
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

  // Filter patients for search
  const filteredPatients = patients?.filter(
    (patient) =>
      patient.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Start Consultation
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ready" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ready" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Ready ({patientsReady.length})
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Queue ({queuePatients?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Checked-In ({readyAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
          </TabsList>

          {/* Patients Ready from Nurse Prep */}
          <TabsContent value="ready" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {readyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : patientsReady.length > 0 ? (
                <div className="space-y-3">
                  {patientsReady.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-success/20 bg-success/5 hover:bg-success/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {entry.queue_entry && (
                            <span className="font-bold text-success">#{entry.queue_entry.queue_number}</span>
                          )}
                          <span className="font-medium">
                            {entry.patient?.first_name} {entry.patient?.last_name}
                          </span>
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Prep Complete
                          </Badge>
                          {(entry.queue_entry?.priority === 'urgent' || entry.queue_entry?.priority === 'emergency') && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {entry.queue_entry.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>MRN: {entry.patient?.mrn}</span>
                          <span>{getAge(entry.patient?.date_of_birth || '')} yrs</span>
                          <span className="capitalize">{entry.patient?.gender}</span>
                        </div>
                        {entry.patient?.allergies && entry.patient.allergies.length > 0 && (
                          <p className="text-xs text-destructive">
                            ⚠️ Allergies: {entry.patient.allergies.join(', ')}
                          </p>
                        )}
                        {entry.queue_entry && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Waiting {differenceInMinutes(new Date(), new Date(entry.queue_entry.check_in_time))} min
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleStartConsultation(entry.patient_id, entry.appointment_id)}
                        disabled={startingId === entry.patient_id}
                        className="bg-success hover:bg-success/90"
                      >
                        {startingId === entry.patient_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No patients ready for consultation</p>
                  <p className="text-sm text-muted-foreground">
                    Patients will appear here after nurse prep is complete
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="queue" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {queueLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : queuePatients && queuePatients.length > 0 ? (
                <div className="space-y-3">
                  {queuePatients.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            #{entry.queue_number} - {entry.patient?.first_name} {entry.patient?.last_name}
                          </span>
                          {getPriorityBadge(entry.priority)}
                          {getStatusBadge(entry.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>MRN: {entry.patient?.mrn}</span>
                          <span>{getAge(entry.patient?.date_of_birth)} yrs</span>
                          <span className="capitalize">{entry.patient?.gender}</span>
                        </div>
                        {entry.appointment?.reason_for_visit && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {entry.appointment.reason_for_visit}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Waiting since {format(new Date(entry.check_in_time), 'h:mm a')}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStartConsultation(entry.patient_id, entry.appointment_id)}
                        disabled={startingId === entry.patient_id}
                      >
                        {startingId === entry.patient_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No patients in your queue</p>
                  <p className="text-sm text-muted-foreground">
                    Check appointments or search for a patient
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="appointments" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {appointmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : readyAppointments.length > 0 ? (
                <div className="space-y-3">
                  {readyAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {apt.patient?.first_name} {apt.patient?.last_name}
                          </span>
                          <Badge variant="outline">{apt.appointment_type}</Badge>
                          {apt.priority === 'urgent' && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>MRN: {apt.patient?.mrn}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.scheduled_time}
                          </span>
                        </div>
                        {apt.reason_for_visit && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {apt.reason_for_visit}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleStartConsultation(apt.patient_id, apt.id)}
                        disabled={startingId === apt.patient_id}
                      >
                        {startingId === apt.patient_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No checked-in appointments</p>
                  <p className="text-sm text-muted-foreground">
                    Patients will appear here after check-in
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or MRN..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[350px] pr-4">
                {patientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : searchTerm && filteredPatients.length > 0 ? (
                  <div className="space-y-3">
                    {filteredPatients.slice(0, 10).map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="font-medium">
                            {patient.first_name} {patient.last_name}
                          </span>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>MRN: {patient.mrn}</span>
                            <span>{getAge(patient.date_of_birth)} yrs</span>
                            <span className="capitalize">{patient.gender}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleStartConsultation(patient.id)}
                          disabled={startingId === patient.id}
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
                    ))}
                  </div>
                ) : searchTerm ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No patients found</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Enter a name or MRN to search</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
