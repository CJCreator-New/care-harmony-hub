import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, differenceInMinutes } from 'date-fns';

export interface StaffPerformanceMetrics {
  staffId: string;
  staffName: string;
  role: string;
  patientsSeenToday: number;
  patientsSeenThisMonth: number;
  appointmentsCompletedToday: number;
  appointmentsCompletedThisMonth: number;
  consultationsCompletedToday: number;
  consultationsCompletedThisMonth: number;
  averageConsultationTime: number; // in minutes
  prescriptionsWritten: number;
  labOrdersCreated: number;
}

export interface StaffPerformanceSnapshot {
  metrics: StaffPerformanceMetrics[];
  referenceDate: string;
  isCurrentDateReference: boolean;
}

export function useStaffPerformance() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['staff-performance', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) {
        return {
          metrics: [],
          referenceDate: format(new Date(), 'yyyy-MM-dd'),
          isCurrentDateReference: true,
        } as StaffPerformanceSnapshot;
      }

      // Get all staff members
      const { data: staffMembers, error: staffError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name')
        .eq('hospital_id', hospital.id)
        .eq('is_staff', true);

      if (staffError) throw staffError;

      // Get user roles separately
      const staffUserIds = staffMembers?.map(s => s.user_id) || [];
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('hospital_id', hospital.id)
        .in('user_id', staffUserIds);

      const [latestAppointment, latestConsultation, latestPrescription, latestLabOrder] = await Promise.all([
        supabase.from('appointments').select('scheduled_date').eq('hospital_id', hospital.id).order('scheduled_date', { ascending: false }).limit(1),
        supabase.from('consultations').select('created_at').eq('hospital_id', hospital.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('prescriptions').select('created_at').eq('hospital_id', hospital.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('lab_orders').select('created_at').eq('hospital_id', hospital.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const referenceCandidates = [
        latestAppointment.data?.[0]?.scheduled_date,
        latestConsultation.data?.[0]?.created_at ? format(new Date(latestConsultation.data[0].created_at), 'yyyy-MM-dd') : null,
        latestPrescription.data?.[0]?.created_at ? format(new Date(latestPrescription.data[0].created_at), 'yyyy-MM-dd') : null,
        latestLabOrder.data?.[0]?.created_at ? format(new Date(latestLabOrder.data[0].created_at), 'yyyy-MM-dd') : null,
      ].filter(Boolean) as string[];

      const referenceDate = [...referenceCandidates].sort().slice(-1)[0] || format(new Date(), 'yyyy-MM-dd');
      const referencePoint = new Date(`${referenceDate}T12:00:00`);
      const monthStart = format(startOfMonth(referencePoint), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(referencePoint), 'yyyy-MM-dd');
      const isCurrentDateReference = referenceDate === format(new Date(), 'yyyy-MM-dd');

      // Get appointments data
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('hospital_id', hospital.id)
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd);

      // Get consultations data
      const { data: consultations } = await supabase
        .from('consultations')
        .select('*')
        .eq('hospital_id', hospital.id)
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`);

      // Get prescriptions data
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('hospital_id', hospital.id)
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`);

      // Get lab orders data
      const { data: labOrders } = await supabase
        .from('lab_orders')
        .select('*')
        .eq('hospital_id', hospital.id)
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`);

      // Calculate metrics for each staff member
      const metrics: StaffPerformanceMetrics[] = staffMembers?.map(staff => {
        const staffRoles = userRoles?.filter(r => r.user_id === staff.user_id) || [];
        const primaryRole = staffRoles[0]?.role || 'unknown';

        // Filter data for this staff member
        const staffAppointments = appointments?.filter(
          a => a.doctor_id === staff.id || a.created_by === staff.id
        ) || [];
        
        const staffConsultations = consultations?.filter(
          c => c.doctor_id === staff.id || c.nurse_id === staff.id
        ) || [];

        const staffPrescriptions = prescriptions?.filter(
          p => p.prescribed_by === staff.id
        ) || [];

        const staffLabOrders = labOrders?.filter(
          l => l.ordered_by === staff.id
        ) || [];

        // Calculate today's metrics
        const todayAppointments = staffAppointments.filter(
          a => a.scheduled_date === referenceDate && a.status === 'completed'
        );
        const todayConsultations = staffConsultations.filter(
          c => c.completed_at && format(new Date(c.completed_at), 'yyyy-MM-dd') === referenceDate
        );

        // Calculate average consultation time
        const completedConsultations = staffConsultations.filter(
          c => c.started_at && c.completed_at
        );
        const avgTime = completedConsultations.length > 0
          ? completedConsultations.reduce((acc, c) => {
              const duration = differenceInMinutes(
                new Date(c.completed_at!),
                new Date(c.started_at!)
              );
              return acc + duration;
            }, 0) / completedConsultations.length
          : 0;

        // Unique patients seen (from consultations)
        const uniquePatientsToday = new Set(
          todayConsultations.map(c => c.patient_id)
        ).size;
        const uniquePatientsMonth = new Set(
          staffConsultations.filter(c => c.status === 'completed').map(c => c.patient_id)
        ).size;

        return {
          staffId: staff.id,
          staffName: `${staff.first_name} ${staff.last_name}`,
          role: primaryRole,
          patientsSeenToday: uniquePatientsToday,
          patientsSeenThisMonth: uniquePatientsMonth,
          appointmentsCompletedToday: todayAppointments.length,
          appointmentsCompletedThisMonth: staffAppointments.filter(a => a.status === 'completed').length,
          consultationsCompletedToday: todayConsultations.length,
          consultationsCompletedThisMonth: staffConsultations.filter(c => c.status === 'completed').length,
          averageConsultationTime: Math.round(avgTime),
          prescriptionsWritten: staffPrescriptions.length,
          labOrdersCreated: staffLabOrders.length,
        };
      }) || [];

      // Filter out staff without clinical roles
      return {
        metrics: metrics.filter(m =>
          ['doctor', 'nurse', 'pharmacist', 'lab_technician', 'receptionist'].includes(m.role)
        ),
        referenceDate,
        isCurrentDateReference,
      } as StaffPerformanceSnapshot;
    },
    enabled: !!hospital?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - expensive compute
  });
}
