import { startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface OperationalKpis {
  todayAppointments: number;
  scheduledAppointments: number;
  checkedIn: number;
  waitingInQueue: number;
  queueInService: number;
  completedToday: number;
  avgWaitTime: number | null;
  pendingLabOrders: number;
  criticalLabOrders: number;
}

const ACTIVE_QUEUE_STATUSES = ['waiting', 'called', 'in_prep', 'in_service'] as const;
const WAITING_QUEUE_STATUSES = ['waiting', 'called', 'in_prep'] as const;

export async function fetchOperationalKpis(hospitalId: string): Promise<OperationalKpis> {
  const today = new Date();
  const todayDate = today.toISOString().split('T')[0];
  const startOfToday = startOfDay(today).toISOString();
  const endOfToday = endOfDay(today).toISOString();

  const [appointmentsResult, queueResult, labsResult] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, status')
      .eq('hospital_id', hospitalId)
      .eq('scheduled_date', todayDate),
    supabase
      .from('patient_queue')
      .select('id, status, check_in_time, service_start_time')
      .eq('hospital_id', hospitalId)
      .gte('created_at', startOfToday)
      .lte('created_at', endOfToday),
    supabase
      .from('lab_orders')
      .select('status, is_critical')
      .eq('hospital_id', hospitalId),
  ]);

  if (appointmentsResult.error) throw appointmentsResult.error;
  if (queueResult.error) throw queueResult.error;
  if (labsResult.error) throw labsResult.error;

  const appointments = appointmentsResult.data || [];
  const queue = queueResult.data || [];
  const labs = labsResult.data || [];

  const scheduledAppointments = appointments.filter((a) => a.status === 'scheduled').length;
  const checkedIn = queue.filter((q) => ACTIVE_QUEUE_STATUSES.includes(q.status as (typeof ACTIVE_QUEUE_STATUSES)[number])).length;
  const waitingInQueue = queue.filter((q) => WAITING_QUEUE_STATUSES.includes(q.status as (typeof WAITING_QUEUE_STATUSES)[number])).length;
  const queueInService = queue.filter((q) => q.status === 'in_service').length;
  const completedToday = queue.filter((q) => q.status === 'completed').length;

  const completedWithTimes = queue.filter(
    (q) => q.status === 'completed' && q.check_in_time && q.service_start_time
  );

  let avgWaitTime: number | null = null;
  if (completedWithTimes.length > 0) {
    const totalWaitMs = completedWithTimes.reduce((sum, q) => {
      const checkIn = new Date(q.check_in_time!).getTime();
      const serviceStart = new Date(q.service_start_time!).getTime();
      return sum + Math.max(0, serviceStart - checkIn);
    }, 0);
    avgWaitTime = Math.round(totalWaitMs / completedWithTimes.length / 60000);
  }

  const pendingLabOrders = labs.filter((l) => l.status === 'pending').length;
  const criticalLabOrders = labs.filter((l) => l.status === 'pending' && l.is_critical).length;

  return {
    todayAppointments: appointments.length,
    scheduledAppointments,
    checkedIn,
    waitingInQueue,
    queueInService,
    completedToday,
    avgWaitTime,
    pendingLabOrders,
    criticalLabOrders,
  };
}