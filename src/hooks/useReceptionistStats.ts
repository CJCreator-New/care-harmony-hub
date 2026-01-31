import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface ReceptionistStats {
  todayAppointments: number;
  checkedIn: number;
  waitingInQueue: number;
  pendingRequests: number;
  completedToday: number;
  avgWaitTime: number | null;
  pendingInvoices: number;
  totalRevenue: number;
}

export function useReceptionistStats() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscriptions
  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('receptionist-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['receptionist-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['receptionist-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['receptionist-stats'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);

  return useQuery({
    queryKey: ['receptionist-stats', hospital?.id],
    queryFn: async (): Promise<ReceptionistStats> => {
      if (!hospital?.id) {
        return {
          todayAppointments: 0,
          checkedIn: 0,
          waitingInQueue: 0,
          pendingRequests: 0,
          completedToday: 0,
          avgWaitTime: null,
          pendingInvoices: 0,
          totalRevenue: 0,
        };
      }

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Fetch all data in parallel
      const [
        appointmentsResult,
        queueResult,
        requestsResult,
        invoicesResult,
        paymentsResult,
      ] = await Promise.all([
        // Today's appointments
        supabase
          .from('appointments')
          .select('id, status')
          .eq('hospital_id', hospital.id)
          .eq('scheduled_date', today.toISOString().split('T')[0]),
        
        // Queue entries for today
        supabase
          .from('patient_queue')
          .select('id, status, check_in_time, service_start_time, service_end_time')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfToday)
          .lte('created_at', endOfToday),
        
        // Pending appointment requests
        supabase
          .from('appointment_requests')
          .select('id')
          .eq('hospital_id', hospital.id)
          .eq('status', 'pending'),
        
        // Pending invoices
        supabase
          .from('invoices')
          .select('id, total, paid_amount')
          .eq('hospital_id', hospital.id)
          .in('status', ['pending', 'partial']),
        
        // Today's payments
        supabase
          .from('payments')
          .select('amount')
          .eq('hospital_id', hospital.id)
          .gte('payment_date', startOfToday)
          .lte('payment_date', endOfToday),
      ]);

      const appointments = appointmentsResult.data || [];
      const queue = queueResult.data || [];
      const requests = requestsResult.data || [];
      const invoices = invoicesResult.data || [];
      const payments = paymentsResult.data || [];

      // Calculate stats
      const todayAppointments = appointments.filter(
        (a) => a.status === 'scheduled'
      ).length;
      const checkedIn = appointments.filter(
        (a) => a.status === 'checked_in'
      ).length;
      const waitingInQueue = queue.filter((q) => q.status === 'waiting').length;
      const pendingRequests = requests.length;
      const completedToday = queue.filter((q) => q.status === 'completed').length;
      const pendingInvoices = invoices.length;

      // Calculate average wait time for completed services
      const completedWithTimes = queue.filter(
        (q) => q.status === 'completed' && q.check_in_time && q.service_start_time
      );
      let avgWaitTime: number | null = null;
      if (completedWithTimes.length > 0) {
        const totalWaitMs = completedWithTimes.reduce((sum, q) => {
          const checkIn = new Date(q.check_in_time!).getTime();
          const serviceStart = new Date(q.service_start_time!).getTime();
          return sum + (serviceStart - checkIn);
        }, 0);
        avgWaitTime = Math.round(totalWaitMs / completedWithTimes.length / 60000); // minutes
      }

      // Calculate total revenue today
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

      return {
        todayAppointments,
        checkedIn,
        waitingInQueue,
        pendingRequests,
        completedToday,
        avgWaitTime,
        pendingInvoices,
        totalRevenue,
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: 5000, // Refresh every 5 seconds as backup
  });
}

// Hook for pending appointment requests with patient details
export function usePendingAppointmentRequests() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['pending-appointment-requests', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('appointment_requests')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, phone),
          doctor:profiles!appointment_requests_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
    refetchInterval: 30000,
  });
}

// Hook for today's scheduled appointments that haven't checked in
export function useScheduledAppointments() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['scheduled-appointments-today', hospital?.id],
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
        .eq('scheduled_date', today)
        .eq('status', 'scheduled')
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
    refetchInterval: 30000,
  });
}
