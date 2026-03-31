import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export interface DashboardMetrics {
  todayAppointments: number;
  todayAppointmentsCompleted: number;
  todayAppointmentsCancelled: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  pendingLabOrders: number;
  activePrescriptions: number;
  queueWaiting: number;
  queueInService: number;
  queueTotal: number;
  pendingBillings: number;
  fetchedAt: Date;
}

export function useDashboardMetrics() {
  const { hospital, user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-metrics', hospital?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!hospital?.id) throw new Error('Hospital context required');

      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const monthStart = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)).toISOString();

      const [
        appointmentsResult,
        appointmentsCompletedResult,
        appointmentsCancelledResult,
        patientsResult,
        newPatientsResult,
        labOrdersResult,
        prescriptionsResult,
        queueResult,
        billingResult,
      ] = await Promise.all([
        supabase.from('appointments').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id)
          .gte('appointment_date', todayStart)
          .lte('appointment_date', todayEnd),
        supabase.from('appointments').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id).eq('status', 'completed')
          .gte('appointment_date', todayStart).lte('appointment_date', todayEnd),
        supabase.from('appointments').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id).eq('status', 'cancelled')
          .gte('appointment_date', todayStart).lte('appointment_date', todayEnd),
        supabase.from('patients').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id),
        supabase.from('patients').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id).gte('created_at', monthStart),
        supabase.from('lab_orders').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id).in('status', ['pending', 'in_progress']),
        supabase.from('prescriptions').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id).eq('status', 'active'),
        supabase.from('patient_queue').select('id, status', { count: 'exact' })
          .eq('hospital_id', hospital.id).in('status', ['waiting', 'in_service', 'completed']),
        supabase.from('billing').select('id', { count: 'exact' })
          .eq('hospital_id', hospital.id).eq('status', 'pending'),
      ]);

      const queueData = queueResult.data || [];
      const queueWaiting = queueData.filter(q => q.status === 'waiting').length;
      const queueInService = queueData.filter(q => q.status.includes('in_service')).length;

      return {
        todayAppointments: appointmentsResult.count || 0,
        todayAppointmentsCompleted: appointmentsCompletedResult.count || 0,
        todayAppointmentsCancelled: appointmentsCancelledResult.count || 0,
        totalPatients: patientsResult.count || 0,
        newPatientsThisMonth: newPatientsResult.count || 0,
        pendingLabOrders: labOrdersResult.count || 0,
        activePrescriptions: prescriptionsResult.count || 0,
        queueWaiting,
        queueInService,
        queueTotal: queueData.length,
        pendingBillings: billingResult.count || 0,
        fetchedAt: new Date(),
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
