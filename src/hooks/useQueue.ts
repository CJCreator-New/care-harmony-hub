import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type QueueStatus = 'waiting' | 'called' | 'in_prep' | 'in_service' | 'completed';
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
  // ADR-0012: hybrid orchestration (doctor pull / nurse push)
  claimed_by_doctor_id: string | null;
  claimed_at: string | null;
  assigned_room: string | null;
  triage_acuity: 'red' | 'amber' | 'green' | null;
  emergency_bypass: boolean;
  bypass_rationale: string | null;
  routed_by: string | null;
  routed_at: string | null;
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
        .select(
          `
          *,
          patient:patients(id, first_name, last_name, mrn),
          assigned_staff:profiles!patient_queue_assigned_to_fkey(id, first_name, last_name)
        `
        )
        .eq('hospital_id', hospital.id)
        // ADR-0012 §3: emergency-pinned patients surface first, then acuity/priority.
        .order('emergency_bypass', { ascending: false })
        .order('priority', { ascending: false })
        .order('queue_number', { ascending: true });

      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      // Only get today's queue
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('created_at', `${today}T00:00:00`);

      // Limit to prevent unbounded queries
      query = query.limit(100);

      const { data, error } = await query;

      if (error) throw error;
      return data as QueueEntry[];
    },
    enabled: !!hospital?.id,
    staleTime: 30 * 1000, // 30 seconds - queue updates via realtime
  });
}

export function useActiveQueue() {
  return useQueue(['waiting', 'called', 'in_prep', 'in_service']);
}

export function useAddToQueue() {
  const queryClient = useQueryClient();
  const { hospital, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      patientId,
      appointmentId,
      priority = 'normal',
      department,
      notes,
    }: {
      patientId: string;
      appointmentId?: string;
      priority?: PriorityLevel;
      department?: string;
      notes?: string;
    }) => {
      if (!hospital?.id) throw new Error('No hospital context');

      // Check if patient already has an active queue entry today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingEntry } = await supabase
        .from('patient_queue')
        .select('id, status, queue_number')
        .eq('hospital_id', hospital.id)
        .eq('patient_id', patientId)
        .in('status', ['waiting', 'called', 'in_prep', 'in_service'])
        .gte('created_at', `${today}T00:00:00`)
        .maybeSingle();

      if (existingEntry) {
        // Patient already in queue, return existing entry
        toast.info(`Patient already in queue - #${existingEntry.queue_number}`);
        return existingEntry as QueueEntry;
      }

      // Get next queue number
      const { data: queueNumber, error: queueError } = await supabase.rpc('get_next_queue_number', {
        p_hospital_id: hospital.id,
      });

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
          notes: notes ?? null,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;

      // T-89: Audit marker — queue entry created during check-in
      void supabase.from('activity_logs').insert({
        user_id: user?.id ?? null,
        hospital_id: hospital?.id ?? null,
        action_type: 'checkin_queue_created',
        entity_type: 'patient_queue',
        entity_id: data.id,
        details: {
          patient_id: patientId,
          appointment_id: appointmentId ?? null,
          queue_number: data.queue_number,
          priority,
          department: department ?? null,
          workflow_event_emitted: true,
          timestamp: new Date().toISOString(),
        },
      });

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
      // Find appointment to mark it complete
      const { data: queueEntry } = await supabase
        .from('patient_queue')
        .select('appointment_id')
        .eq('id', queueEntryId)
        .single();

      if (queueEntry?.appointment_id) {
        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', queueEntry.appointment_id);
      }

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

function queueErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('QUEUE_ENTRY_ALREADY_CLAIMED')) {
    return 'Another clinician just claimed this patient.';
  }
  if (message.includes('QUEUE_ENTRY_NOT_CLAIMABLE')) {
    return 'This patient is no longer claimable — refresh the queue.';
  }
  if (message.includes('QUEUE_ENTRY_NOT_ROUTABLE')) {
    return 'This patient has already moved past the waiting queue.';
  }
  if (message.includes('BYPASS_RATIONALE_REQUIRED')) {
    return 'An emergency triage bypass needs a clinical rationale (at least 5 characters).';
  }
  if (message.includes('FORBIDDEN_ROLE')) {
    return 'Your role cannot perform this queue action.';
  }
  return message || 'Queue action failed';
}

/** On-duty doctors in the hospital, for the triage nurse routing selector. */
export function useAvailableDoctors() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['queue-doctors', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data: doctorRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('hospital_id', hospital.id)
        .eq('role', 'doctor');

      if (roleError) throw roleError;
      const doctorUserIds = (doctorRoles ?? []).map((entry) => entry.user_id);
      if (doctorUserIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, is_active')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .in('user_id', doctorUserIds)
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hospital?.id,
    staleTime: 60 * 1000,
  });
}

/** ADR-0012: atomic doctor self-claim of the next waiting patient. */
export function useClaimQueuePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      const { data, error } = await supabase.rpc('claim_queue_patient', {
        p_entry_id: queueEntryId,
      });

      if (error) throw error;
      return data as unknown as QueueEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success(`Patient #${entry.queue_number} claimed — ready for consultation`);
    },
    onError: (error: Error) => {
      toast.error(queueErrorMessage(error));
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

/** ADR-0012: triage nurse push — assign doctor, room, acuity and audited bypass. */
export function useRouteQueuePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      queueEntryId: string;
      doctorId: string;
      room?: string;
      acuity?: 'red' | 'amber' | 'green';
      emergencyBypass?: boolean;
      bypassRationale?: string;
    }) => {
      const { data, error } = await supabase.rpc('route_queue_patient', {
        p_entry_id: params.queueEntryId,
        p_doctor_id: params.doctorId,
        p_room: params.room ?? null,
        p_acuity: params.acuity ?? null,
        p_emergency_bypass: params.emergencyBypass ?? false,
        p_bypass_rationale: params.bypassRationale ?? null,
      });

      if (error) throw error;
      return data as unknown as QueueEntry;
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success(`Patient #${entry.queue_number} routed to the doctor`);
    },
    onError: (error: Error) => {
      toast.error(queueErrorMessage(error));
      queryClient.invalidateQueries({ queryKey: ['queue'] });
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
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);
}
