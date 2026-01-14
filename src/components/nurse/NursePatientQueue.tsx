import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Clock, 
  Search, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PatientPrepModal } from './PatientPrepModal';
import { format, differenceInMinutes } from 'date-fns';

export function NursePatientQueue() {
  const { hospital } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // Fetch patients in queue assigned to nurses
  const { data: queuePatients, isLoading, refetch } = useQuery({
    queryKey: ['nurse-queue', hospital?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_queue')
        .select(`
          *,
          patient:patients(*),
          appointment:appointments(*)
        `)
        .eq('hospital_id', hospital?.id)
        .in('status', ['waiting', 'called', 'in_prep'])
        .order('queue_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch prep status for patients
  const { data: prepStatuses } = useQuery({
    queryKey: ['prep-statuses', hospital?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_prep_status')
        .select('*')
        .eq('status', 'ready_for_doctor');

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
    refetchInterval: 10000
  });

  const filteredPatients = queuePatients?.filter(entry =>
    entry.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isPrepCompleted = (queueId: string) => {
    return prepStatuses?.some(status => status.queue_entry_id === queueId);
  };

  const getStatusBadge = (entry: any) => {
    if (isPrepCompleted(entry.id)) {
      return <Badge className="bg-success">Ready for Doctor</Badge>;
    }
    if (entry.status === 'in_prep') {
      return <Badge className="bg-blue-500">In Prep</Badge>;
    }
    if (entry.status === 'called') {
      return <Badge className="bg-orange-500">Called</Badge>;
    }
    return <Badge variant="secondary">Waiting</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'emergency') {
      return <Badge variant="destructive">Emergency</Badge>;
    }
    if (priority === 'urgent') {
      return <Badge className="bg-orange-500">Urgent</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Patient Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or MRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Queue List */}
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredPatients && filteredPatients.length > 0 ? (
              <div className="space-y-3">
                {filteredPatients.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      isPrepCompleted(entry.id)
                        ? 'bg-success/5 border-success/20'
                        : 'bg-card hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-lg">#{entry.queue_number}</span>
                          <span className="font-medium">
                            {entry.patient?.first_name} {entry.patient?.last_name}
                          </span>
                          {getStatusBadge(entry)}
                          {getPriorityBadge(entry.priority)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>MRN: {entry.patient?.mrn}</span>
                          <span>
                            {new Date().getFullYear() - new Date(entry.patient?.date_of_birth).getFullYear()} yrs
                          </span>
                          <span className="capitalize">{entry.patient?.gender}</span>
                        </div>

                        {entry.appointment?.reason_for_visit && (
                          <p className="text-sm text-muted-foreground">
                            Reason: {entry.appointment.reason_for_visit}
                          </p>
                        )}

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Waiting {differenceInMinutes(new Date(), new Date(entry.check_in_time))} min
                          {entry.check_in_time && (
                            <> • Checked in at {format(new Date(entry.check_in_time), 'h:mm a')}</>
                          )}
                        </div>

                        {entry.patient?.allergies && entry.patient.allergies.length > 0 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600">
                              Allergies: {entry.patient.allergies.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {isPrepCompleted(entry.id) ? (
                          <Button disabled className="bg-success">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Completed
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setSelectedPatient(entry)}
                            className="bg-primary"
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            Start Prep
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No patients in queue</p>
                <p className="text-sm text-muted-foreground">
                  Patients will appear here after check-in
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Patient Prep Modal */}
      {selectedPatient && (
        <PatientPrepModal
          patient={selectedPatient.patient}
          queueEntry={selectedPatient}
          open={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onComplete={() => {
            refetch();
            setSelectedPatient(null);
          }}
        />
      )}
    </div>
  );
}