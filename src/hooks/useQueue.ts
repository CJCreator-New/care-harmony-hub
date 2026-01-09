import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type QueueStatus = 'waiting' | 'called' | 'in_service' | 'completed';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';

export interface QueueEntry {
  id: string;
  hospital_id: string;
  patient_id: string;
  appointment_id: string | null;
  queue_number: number;
  priority: PriorityLevel;
  status: QueueStatus;
  department: string | null;
  assigned_to: string | null;
  check_in_time: string;
  called_time: string | null;
  service_start_time: string | null;
  service_end_time: string | null;
  notes: string | null;
  created_at: string;
  // Joined data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
  assigned_staff?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function useQueue(status?: QueueStatus[]) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['queue', hospital?.id, status],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('patient_queue')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn),
          assigned_staff:profiles!patient_queue_assigned_to_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('priority', { ascending: false })
        .order('queue_number', { ascending: true });

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      // Only get today's queue
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('created_at', `${today}T00:00:00`);

      const { data, error } = await query;

      if (error) throw error;
      return data as QueueEntry[];
    },
    enabled: !!hospital?.id,
  });
}

export function useActiveQueue() {
  return useQueue(['waiting', 'called', 'in_service']);
}

export function useAddToQueue() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  return useMutation({
    mutationFn: async ({ patientId, appointmentId, priority = 'normal', department }: {
      patientId: string;
      appointmentId?: string;
      priority?: PriorityLevel;
      department?: string;
    }) => {
      if (!hospital?.id) throw new Error('No hospital context');

      // Check if patient already has an active queue entry today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingEntry } = await supabase
        .from('patient_queue')
        .select('id, status, queue_number')
        .eq('hospital_id', hospital.id)
        .eq('patient_id', patientId)
        .in('status', ['waiting', 'called', 'in_service'])
        .gte('created_at', `${today}T00:00:00`)
        .maybeSingle();

      if (existingEntry) {
        // Patient already in queue, return existing entry
        toast.info(`Patient already in queue - #${existingEntry.queue_number}`);
        return existingEntry as QueueEntry;
      }

      // Get next queue number
      const { data: queueNumber, error: queueError } = await supabase
        .rpc('get_next_queue_number', { p_hospital_id: hospital.id });

      if (queueError) throw queueError;

      const { data, error } = await supabase
        .from('patient_queue')
        .insert({
          hospital_id: hospital.id,
          patient_id: patientId,
          appointment_id: appointmentId,
          queue_number: queueNumber,
          priority: priority,
          department: department,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;
      return data as QueueEntry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success(`Patient added to queue - #${data.queue_number}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add to queue: ${error.message}`);
    },
  });
}

export function useUpdateQueueEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QueueEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('patient_queue')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QueueEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update queue: ${error.message}`);
    },
  });
}

export function useCallNextPatient() {
  const updateQueue = useUpdateQueueEntry();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      return updateQueue.mutateAsync({
        id: queueEntryId,
        status: 'called' as QueueStatus,
        called_time: new Date().toISOString(),
        assigned_to: profile?.id,
      });
    },
    onSuccess: (data) => {
      toast.success(`Calling patient #${data.queue_number}`);
    },
  });
}

export function useStartService() {
  const updateQueue = useUpdateQueueEntry();

  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      return updateQueue.mutateAsync({
        id: queueEntryId,
        status: 'in_service' as QueueStatus,
        service_start_time: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Service started');
    },
  });
}

export function useCompleteService() {
  const updateQueue = useUpdateQueueEntry();

  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      return updateQueue.mutateAsync({
        id: queueEntryId,
        status: 'completed' as QueueStatus,
        service_end_time: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Service completed');
    },
  });
}

export function useQueueRealtime() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['queue'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospital?.id, queryClient]);
}
