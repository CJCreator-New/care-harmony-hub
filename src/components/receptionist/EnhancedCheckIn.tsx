import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueue } from '@/hooks/useQueue';
import { useWorkflowNotifications } from '@/hooks/useWorkflowNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, UserCheck } from 'lucide-react';

export function EnhancedCheckIn() {
  const [searchTerm, setSearchTerm] = useState('');
  const { hospital } = useAuth();
  const { addToQueue } = useQueue();
  const { notifyPatientCheckedIn } = useWorkflowNotifications();

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients-search', searchTerm, hospital?.id],
    queryFn: async () => {
      if (!hospital?.id || !searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('patients')
        .select('id, mrn, first_name, last_name, phone, date_of_birth')
        .eq('hospital_id', hospital.id)
        .or(`mrn.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id && searchTerm.length >= 2,
  });

  const handleCheckIn = async (patient: any) => {
    try {
      const queueEntry = await addToQueue({
        patient_id: patient.id,
        priority: 'normal',
        status: 'waiting',
      });

      await notifyPatientCheckedIn(
        patient.id,
        `${patient.first_name} ${patient.last_name}`,
        queueEntry.queue_number
      );

      toast.success(`${patient.first_name} ${patient.last_name} checked in successfully`);
      setSearchTerm('');
    } catch (error) {
      toast.error('Check-in failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Check-In</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by MRN, Name, or Phone"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Searching...</div>}

        {patients && patients.length > 0 && (
          <div className="space-y-2">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    MRN: {patient.mrn} | Phone: {patient.phone}
                  </div>
                </div>
                <Button onClick={() => handleCheckIn(patient)} size="sm">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              </div>
            ))}
          </div>
        )}

        {searchTerm.length >= 2 && !isLoading && patients?.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No patients found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
