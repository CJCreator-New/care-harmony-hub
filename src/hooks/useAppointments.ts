import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { APPOINTMENT_COLUMNS } from '@/lib/queryColumns';
import { createClinicalSpan, recordClinicalMetric } from '@/utils/telemetry';
import { getCorrelationId } from '@/utils/correlationId';
import { captureException } from '@/utils/errorTracking';

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
          ${APPOINTMENT_COLUMNS.list},
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
      return data as unknown as Appointment[];
    },
    enabled: !!hospital?.id,
    staleTime: 60 * 1000, // 1 minute - appointments updated via realtime
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
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();
  const { logActivity } = useActivityLog();

  return useMutation({
    mutationFn: async (appointmentData: AppointmentInsert) => {
      if (!hospital?.id) throw new Error('No hospital context');

      const span = createClinicalSpan('appointment.create', {
        'hospital.id': hospital.id,
        'patient.id': appointmentData.patient_id,
        'appointment.type': appointmentData.appointment_type,
      });

      try {
        const { data, error } = await supabase
          .from('appointments')
          .insert({
            ...appointmentData,
            hospital_id: hospital.id,
            created_by: profile?.id,
          })
          .select(`
            *,
            patient:patients(id, first_name, last_name, mrn, phone)
          `)
          .single();

        if (error) throw error;
        return data as unknown as Appointment;
      } catch (error) {
        span.recordException(error as Error);
        captureException(error as Error, {
          operationType: 'appointment_create',
          entityType: 'appointment',
          severity: 'high',
        });
        throw error;
      } finally {
        span.end();
      }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      const duration = Date.now() - (data.created_at ? new Date(data.created_at).getTime() : 0);
      recordClinicalMetric('appointment.create.latency', duration, {
        'hospital.id': hospital?.id || 'unknown',
        'status': 'success',
      });
      
      // Log activity
      await logActivity({
        actionType: 'appointment_create',
        entityType: 'appointment',
        entityId: data.id,
        details: {
          patient_name: `${(data.patient as any)?.first_name || ''} ${(data.patient as any)?.last_name || ''}`.trim(),
          patient_mrn: (data.patient as any)?.mrn,
          scheduled_date: data.scheduled_date,
          scheduled_time: data.scheduled_time,
          appointment_type: data.appointment_type,
          correlation_id: getCorrelationId(hospital?.id),
        }
      });
      
      toast.success('Appointment scheduled successfully');
    },
    onError: (error: Error) => {
      recordClinicalMetric('appointment.create.latency', 0, {
        'hospital.id': hospital?.id || 'unknown',
        'status': 'error',
      });
      toast.error(`Failed to schedule appointment: ${error.message}`);
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();
  const { logActivity } = useActivityLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const span = createClinicalSpan('appointment.update', {
        'hospital.id': hospital?.id,
        'appointment.id': id,
        'status': updates.status,
      });

      try {
        const { data, error } = await supabase
          .from('appointments')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            patient:patients(id, first_name, last_name, mrn, phone)
          `)
          .single();

        if (error) throw error;
        return data as unknown as Appointment;
      } catch (error) {
        span.recordException(error as Error);
        captureException(error as Error, {
          operationType: 'appointment_update',
          entityType: 'appointment',
          entityId: id,
          severity: 'medium',
        });
        throw error;
      } finally {
        span.end();
      }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      recordClinicalMetric('appointment.update.latency', 0, {
        'hospital.id': hospital?.id || 'unknown',
        'status': 'success',
      });
      
      // Log activity
      await logActivity({
        actionType: 'appointment_update',
        entityType: 'appointment',
        entityId: data.id,
        details: {
          patient_name: `${(data.patient as any)?.first_name || ''} ${(data.patient as any)?.last_name || ''}`.trim(),
          status: data.status,
          updated_fields: Object.keys(data),
          correlation_id: getCorrelationId(hospital?.id),
        }
      });
      
      toast.success('Appointment updated');
    },
    onError: (error: Error) => {
      recordClinicalMetric('appointment.update.latency', 0, {
        'hospital.id': hospital?.id || 'unknown',
        'status': 'error',
      });
      toast.error(`Failed to update appointment: ${error.message}`);
    },
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const span = createClinicalSpan('appointment.checkin', {
        'hospital.id': hospital?.id,
        'appointment.id': appointmentId,
      });

      try {
        if (!hospital?.id) throw new Error('No hospital context');

        // Get the appointment first to get patient info
        const { data: appointment, error: aptError } = await supabase
          .from('appointments')
          .select(`
            patient_id, 
            priority, 
            doctor_id,
            patient:patients(first_name, last_name)
          `)
          .eq('id', appointmentId)
          .single();

        if (aptError) throw aptError;

        // Get next queue number
        const { data: queueNumber, error: queueError } = await supabase
          .rpc('get_next_queue_number', { p_hospital_id: hospital.id });

        if (queueError) throw queueError;

        // Update appointment status
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

        // Add patient to the queue
        const { error: queueInsertError } = await supabase
          .from('patient_queue')
          .insert({
            hospital_id: hospital.id,
            patient_id: appointment.patient_id,
            appointment_id: appointmentId,
            queue_number: queueNumber,
            priority: appointment.priority || 'normal',
            status: 'waiting',
            assigned_to: appointment.doctor_id,
          });

        if (queueInsertError) throw queueInsertError;

        // Record metrics
        recordClinicalMetric('appointment.checkin.latency', 0, {
          'hospital.id': hospital.id,
          'status': 'success',
        });

        // Return with patient name for notifications
        return {
          ...data,
          patientName: `${(appointment.patient as any)?.first_name || ''} ${(appointment.patient as any)?.last_name || ''}`.trim(),
        } as Appointment & { patientName: string };
      } catch (error) {
        span.recordException(error as Error);
        captureException(error as Error, {
          operationType: 'appointment_checkin',
          entityType: 'appointment',
          entityId: appointmentId,
          severity: 'high',
        });
        throw error;
      } finally {
        span.end();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      recordClinicalMetric('appointment.checkin.latency', 0, {
        'hospital.id': hospital?.id || 'unknown',
        'status': 'success',
      });
      toast.success(`Patient checked in - Queue #${data.queue_number}`);
    },
    onError: (error: Error) => {
      recordClinicalMetric('appointment.checkin.latency', 0, {
        'hospital.id': hospital?.id || 'unknown',
        'status': 'error',
      });
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
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);
}
