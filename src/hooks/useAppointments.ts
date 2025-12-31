import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PriorityLevel = 'low' | 'normal' | 'high' | 'urgent' | 'emergency';

export interface Appointment {
  id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: AppointmentStatus;
  priority: PriorityLevel;
  reason_for_visit: string | null;
  notes: string | null;
  check_in_time: string | null;
  start_time: string | null;
  end_time: string | null;
  queue_number: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    phone: string | null;
  };
  doctor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface AppointmentInsert {
  patient_id: string;
  doctor_id?: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes?: number;
  appointment_type: string;
  priority?: PriorityLevel;
  reason_for_visit?: string;
  notes?: string;
}

export function useAppointments(date?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['appointments', hospital?.id, date],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, phone),
          doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (date) {
        query = query.eq('scheduled_date', date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!hospital?.id,
  });
}

export function useTodayAppointments() {
  const today = new Date().toISOString().split('T')[0];
  return useAppointments(today);
}

export function useUpcomingAppointments(limit: number = 10) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['appointments', 'upcoming', hospital?.id, limit],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, phone),
          doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .gte('scheduled_date', today)
        .in('status', ['scheduled', 'checked_in'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!hospital?.id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (appointmentData: AppointmentInsert) => {
      if (!hospital?.id) throw new Error('No hospital context');

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          hospital_id: hospital.id,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule appointment: ${error.message}`);
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update appointment: ${error.message}`);
    },
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!hospital?.id) throw new Error('No hospital context');

      // Get next queue number
      const { data: queueNumber, error: queueError } = await supabase
        .rpc('get_next_queue_number', { p_hospital_id: hospital.id });

      if (queueError) throw queueError;

      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'checked_in' as AppointmentStatus,
          check_in_time: new Date().toISOString(),
          queue_number: queueNumber,
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(`Patient checked in - Queue #${data.queue_number}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to check in: ${error.message}`);
    },
  });
}

export function useAppointmentsRealtime() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospital?.id, queryClient]);
}
