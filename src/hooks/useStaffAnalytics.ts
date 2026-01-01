import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export interface StaffPerformanceMetric {
  staff_id: string;
  staff_name: string;
  role: string;
  consultations_completed: number;
  prescriptions_written: number;
  lab_orders_processed: number;
  patients_seen: number;
  average_consultation_time: number;
}

export interface DepartmentMetric {
  department: string;
  appointments_count: number;
  consultations_count: number;
  revenue: number;
}

export function useStaffPerformanceMetrics() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['staff-performance-metrics', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Get doctors with their consultation counts
      const { data: consultations, error: consultError } = await supabase
        .from('consultations')
        .select(`
          doctor_id,
          doctor:profiles!doctor_id(id, first_name, last_name),
          status,
          started_at,
          completed_at
        `)
        .eq('hospital_id', hospital.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (consultError) throw consultError;

      // Get prescriptions by doctor
      const { data: prescriptions, error: prescError } = await supabase
        .from('prescriptions')
        .select(`
          prescribed_by,
          doctor:profiles!prescribed_by(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (prescError) throw prescError;

      // Get lab orders processed by lab techs
      const { data: labOrders, error: labError } = await supabase
        .from('lab_orders')
        .select(`
          processed_by,
          status
        `)
        .eq('hospital_id', hospital.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');

      if (labError) throw labError;

      // Aggregate metrics by staff
      const staffMetrics = new Map<string, StaffPerformanceMetric>();

      // Process consultations
      for (const c of consultations || []) {
        if (!c.doctor_id || !c.doctor) continue;
        
        const existing = staffMetrics.get(c.doctor_id) || {
          staff_id: c.doctor_id,
          staff_name: `Dr. ${c.doctor.first_name} ${c.doctor.last_name}`,
          role: 'doctor',
          consultations_completed: 0,
          prescriptions_written: 0,
          lab_orders_processed: 0,
          patients_seen: 0,
          average_consultation_time: 0,
        };

        if (c.status === 'completed') {
          existing.consultations_completed++;
          existing.patients_seen++;

          // Calculate consultation time if we have both timestamps
          if (c.started_at && c.completed_at) {
            const duration = new Date(c.completed_at).getTime() - new Date(c.started_at).getTime();
            const minutes = duration / (1000 * 60);
            existing.average_consultation_time = 
              (existing.average_consultation_time * (existing.consultations_completed - 1) + minutes) / 
              existing.consultations_completed;
          }
        }

        staffMetrics.set(c.doctor_id, existing);
      }

      // Process prescriptions
      for (const p of prescriptions || []) {
        if (!p.prescribed_by || !p.doctor) continue;
        
        const existing = staffMetrics.get(p.prescribed_by) || {
          staff_id: p.prescribed_by,
          staff_name: `Dr. ${p.doctor.first_name} ${p.doctor.last_name}`,
          role: 'doctor',
          consultations_completed: 0,
          prescriptions_written: 0,
          lab_orders_processed: 0,
          patients_seen: 0,
          average_consultation_time: 0,
        };

        existing.prescriptions_written++;
        staffMetrics.set(p.prescribed_by, existing);
      }

      return Array.from(staffMetrics.values()).sort((a, b) => 
        b.consultations_completed - a.consultations_completed
      );
    },
    enabled: !!hospital?.id,
  });
}

export function useMonthlyTrends() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['monthly-trends', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const months: Array<{
        month: string;
        appointments: number;
        consultations: number;
        revenue: number;
        patients: number;
      }> = [];

      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(date), 'yyyy-MM-dd');
        const monthLabel = format(date, 'MMM yyyy');

        // Get appointments count
        const { count: appointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        // Get consultations count
        const { count: consultationsCount } = await supabase
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('status', 'completed');

        // Get revenue
        const { data: invoices } = await supabase
          .from('invoices')
          .select('paid_amount')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const revenue = invoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;

        // Get unique patients
        const { data: uniquePatients } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('hospital_id', hospital.id)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        const uniquePatientCount = new Set(uniquePatients?.map(p => p.patient_id)).size;

        months.push({
          month: monthLabel,
          appointments: appointmentsCount || 0,
          consultations: consultationsCount || 0,
          revenue,
          patients: uniquePatientCount,
        });
      }

      return months;
    },
    enabled: !!hospital?.id,
  });
}

export function useAppointmentTypeBreakdown() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['appointment-type-breakdown', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_type')
        .eq('hospital_id', hospital.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (error) throw error;

      const breakdown = new Map<string, number>();
      for (const apt of data || []) {
        const type = apt.appointment_type || 'Other';
        breakdown.set(type, (breakdown.get(type) || 0) + 1);
      }

      return Array.from(breakdown.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    },
    enabled: !!hospital?.id,
  });
}
