import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueue } from '@/hooks/useQueue';
import { useWorkflowOrchestrator } from '@/hooks/useWorkflowOrchestrator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, UserCheck, AlertCircle, DollarSign, UserPlus, AlertTriangle } from 'lucide-react';

export function EnhancedCheckIn() {
  const [searchTerm, setSearchTerm] = useState('');
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({ firstName: '', lastName: '', phone: '', dob: '' });
  const { hospital } = useAuth();
  const { addToQueue } = useQueue();
  const { triggerWorkflow } = useWorkflowOrchestrator();

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients-search', searchTerm, hospital?.id],
    queryFn: async () => {
      if (!hospital?.id || !searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('patients')
        .select(`
          id, mrn, first_name, last_name, phone, date_of_birth,
          insurance_provider, insurance_policy_number, insurance_status,
          outstanding_balance
        `)
        .eq('hospital_id', hospital.id)
        .or(`mrn.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id && searchTerm.length >= 2,
  });

  const createWalkInMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          hospital_id: hospital?.id,
          first_name: walkInData.firstName,
          last_name: walkInData.lastName,
          phone: walkInData.phone,
          date_of_birth: walkInData.dob,
          mrn: `WI-${Date.now()}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (patient) => {
      await handleCheckIn(patient);
      setWalkInOpen(false);
      setWalkInData({ firstName: '', lastName: '', phone: '', dob: '' });
    },
  });

  const handleCheckIn = async (patient: any, priority: 'normal' | 'urgent' = 'normal') => {
    try {
      const queueEntry = await addToQueue({
        patient_id: patient.id,
        priority,
        status: 'waiting',
      });

      await triggerWorkflow({
        type: 'patient_check_in',
        patientId: patient.id,
        priority: priority === 'urgent' ? 'urgent' : 'normal',
        data: {
          patientName: `${patient.first_name} ${patient.last_name}`,
          queueNumber: queueEntry.queue_number,
          mrn: patient.mrn
        }
      });

      toast.success(`${patient.first_name} ${patient.last_name} checked in successfully`);
      setSearchTerm('');
    } catch (error) {
      toast.error('Check-in failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Patient Check-In</CardTitle>
          <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Walk-In
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Walk-In Patient</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={walkInData.firstName} onChange={(e) => setWalkInData({...walkInData, firstName: e.target.value})} />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={walkInData.lastName} onChange={(e) => setWalkInData({...walkInData, lastName: e.target.value})} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={walkInData.phone} onChange={(e) => setWalkInData({...walkInData, phone: e.target.value})} />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={walkInData.dob} onChange={(e) => setWalkInData({...walkInData, dob: e.target.value})} />
                </div>
                <Button onClick={() => createWalkInMutation.mutate()} disabled={createWalkInMutation.isPending} className="w-full">
                  Register & Check In
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {patient.first_name} {patient.last_name}
                    </div>
                    {patient.outstanding_balance > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-1" />
                        ${patient.outstanding_balance}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    MRN: {patient.mrn} | Phone: {patient.phone}
                  </div>
                  {patient.insurance_provider && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={patient.insurance_status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {patient.insurance_provider}
                      </Badge>
                      {patient.insurance_status !== 'active' && (
                        <span className="text-xs text-amber-600 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Verify Insurance
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleCheckIn(patient, 'urgent')} size="sm" variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Urgent
                  </Button>
                  <Button onClick={() => handleCheckIn(patient)} size="sm">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                </div>
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
