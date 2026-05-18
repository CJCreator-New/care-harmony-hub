import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { devLog } from '@/utils/sanitize';

export interface AdminStats {
  totalPatients: number;
  newPatientsThisMonth: number;
  patientGrowthLabel: string;
  todayAppointments: number;
  appointmentMetricLabel: string;
  appointmentMetricSubtitle: string;
  completedToday: number;
  cancelledToday: number;
  activeStaff: number;
  staffByRole: Record<string, number>;
  monthlyRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  avgWaitTime: number;
  pendingPrescriptions: number;
  pendingLabOrders: number;
  queueWaiting: number;
  queueInService: number;
  bedOccupancy: number;
  criticalLabOrders: number;
}

export interface StaffOverview {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline';
  todayPatients: number;
  lastActive: string | null;
}

export interface DepartmentPerformance {
  department: string;
  patientsToday: number;
  avgWaitTime: number;
  completionRate: number;
}

export function useAdminStats() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  // Set up real-time subscriptions like nurse dashboard
  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
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
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
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
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);

  return useQuery({
    queryKey: ['admin-stats', hospital?.id],
    queryFn: async (): Promise<AdminStats> => {
      if (!hospital?.id) {
        // Return default stats instead of throwing to prevent error boundary triggers
        return {
          totalPatients: 0,
          newPatientsThisMonth: 0,
          patientGrowthLabel: '+0 this month',
          todayAppointments: 0,
          appointmentMetricLabel: "Today's Appointments",
          appointmentMetricSubtitle: '0 completed, 0 cancelled',
          completedToday: 0,
          cancelledToday: 0,
          activeStaff: 0,
          staffByRole: {},
          monthlyRevenue: 0,
          pendingInvoices: 0,
          pendingAmount: 0,
          avgWaitTime: 15,
          pendingPrescriptions: 0,
          pendingLabOrders: 0,
          queueWaiting: 0,
          queueInService: 0,
          bedOccupancy: 0,
          criticalLabOrders: 0,
        };
      }

      // FIX BUG-DATA-SYNC-001: Query live data for critical KPIs first
      // Client-side timezone-aware queries ensure consistency across dashboard/appointments/queue modules
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const todayStart = `${today}T00:00:00`;

      // Fetch critical KPI data directly (not via stale RPC)
      const [
        { count: patientsCount },
        { count: newPatientsCount },
        { data: apptsData },
        { data: latestAppointmentRows },
        { data: queueData },
        { data: labsData },
        { data: staffProfiles },
        { data: staffRoles },
        { data: invoiceData },
        { data: pendingInvoicesData },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('hospital_id', hospital.id).eq('is_active', true),
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('hospital_id', hospital.id).gte('created_at', monthStart),
        supabase.from('appointments').select('id, status').eq('hospital_id', hospital.id).eq('scheduled_date', today),
        supabase.from('appointments').select('scheduled_date').eq('hospital_id', hospital.id).order('scheduled_date', { ascending: false }).limit(1),
        supabase.from('patient_queue').select('status').eq('hospital_id', hospital.id).gte('created_at', todayStart),
        supabase.from('lab_orders').select('status, is_critical').eq('hospital_id', hospital.id),
        supabase.from('profiles').select('id, user_id').eq('hospital_id', hospital.id).eq('is_staff', true),
        supabase.from('user_roles').select('user_id, role').eq('hospital_id', hospital.id),
        supabase.from('invoices').select('paid_amount').eq('hospital_id', hospital.id).gte('created_at', monthStart),
        supabase.from('invoices').select('id, total, paid_amount').eq('hospital_id', hospital.id).eq('status', 'pending'),
      ]);

      const staffUserIds = new Set((staffProfiles || []).map((profile: any) => profile.user_id).filter(Boolean));
      const liveStaffByRole = (staffRoles || []).reduce<Record<string, number>>((acc, role: any) => {
        if (!staffUserIds.has(role.user_id)) return acc;
        acc[role.role] = (acc[role.role] || 0) + 1;
        return acc;
      }, {});

      const liveMonthlyRevenue = (invoiceData || []).reduce(
        (sum: number, invoice: any) => sum + Number(invoice.paid_amount || 0),
        0,
      );
      const livePendingAmount = (pendingInvoicesData || []).reduce(
        (sum: number, invoice: any) => sum + Math.max(0, Number(invoice.total || 0) - Number(invoice.paid_amount || 0)),
        0,
      );

      let appointmentMetricLabel = "Today's Appointments";
      let appointmentMetricSubtitle = `${apptsData?.filter((a: any) => a.status === 'completed').length || 0} completed, ${apptsData?.filter((a: any) => a.status === 'cancelled').length || 0} cancelled`;
      let appointmentRows = apptsData || [];
      const latestAppointmentDate = latestAppointmentRows?.[0]?.scheduled_date as string | undefined;

      if (appointmentRows.length === 0 && latestAppointmentDate && latestAppointmentDate !== today) {
        const { data: fallbackAppointments } = await supabase
          .from('appointments')
          .select('id, status')
          .eq('hospital_id', hospital.id)
          .eq('scheduled_date', latestAppointmentDate);

        appointmentRows = fallbackAppointments || [];
        appointmentMetricLabel = 'Latest Scheduled Appointments';
        appointmentMetricSubtitle = `Showing ${format(parseISO(latestAppointmentDate), 'MMM d')} seeded activity`;
      }

      const patientGrowthLabel = (newPatientsCount || 0) > 0
        ? `+${newPatientsCount || 0} this month`
        : (patientsCount || 0) > 0
          ? 'Seeded from earlier months'
          : '+0 this month';

      // Build live stats object with correct counts
      const liveStats = {
        totalPatients: patientsCount || 0,
        newPatientsThisMonth: newPatientsCount || 0,
        patientGrowthLabel,
        todayAppointments: appointmentRows.length || 0,
        appointmentMetricLabel,
        appointmentMetricSubtitle,
        completedToday: appointmentRows.filter((a: any) => a.status === 'completed').length || 0,
        cancelledToday: appointmentRows.filter((a: any) => a.status === 'cancelled').length || 0,
        activeStaff: staffProfiles?.length || 0,
        staffByRole: liveStaffByRole,
        monthlyRevenue: liveMonthlyRevenue,
        pendingInvoices: pendingInvoicesData?.length || 0,
        pendingAmount: livePendingAmount,
        queueWaiting: queueData?.filter((q: any) => q.status === 'waiting').length || 0,
        queueInService: queueData?.filter((q: any) => q.status === 'in_service').length || 0,
        pendingLabOrders: labsData?.filter((l: any) => l.status === 'pending').length || 0,
        criticalLabOrders: labsData?.filter((l: any) => l.status === 'pending' && l.is_critical).length || 0,
      };

      // Fetch auxiliary data from RPC for additional stats (revenue, staff, etc.)
      // These are less critical and can tolerate slight stale-ness
      let rpcStats: any = {};
      try {
        const { data, error } = await supabase
          .rpc('get_dashboard_stats', { p_hospital_id: hospital.id });

        if (!error && data) {
          rpcStats = data;
        } else {
          devLog('get_dashboard_stats RPC failed, using minimal fallback. Code:', error?.code);
        }
      } catch (e) {
        devLog('RPC exception, using minimal fallback:', e);
      }

      // Merge: live-queried critical stats override RPC results for consistency
      return {
        totalPatients: liveStats.totalPatients,
        newPatientsThisMonth: liveStats.newPatientsThisMonth,
        patientGrowthLabel: liveStats.patientGrowthLabel,
        todayAppointments: liveStats.todayAppointments,
        appointmentMetricLabel: liveStats.appointmentMetricLabel,
        appointmentMetricSubtitle: liveStats.appointmentMetricSubtitle,
        completedToday: liveStats.completedToday,
        cancelledToday: liveStats.cancelledToday,
        activeStaff: liveStats.activeStaff,
        staffByRole: Object.keys(liveStats.staffByRole).length > 0 ? liveStats.staffByRole : (rpcStats.staffByRole || {}),
        monthlyRevenue: liveStats.monthlyRevenue,
        pendingInvoices: liveStats.pendingInvoices,
        pendingAmount: liveStats.pendingAmount,
        avgWaitTime: typeof rpcStats.avgWaitTime === 'number' ? rpcStats.avgWaitTime : 0,
        pendingPrescriptions: rpcStats.pendingPrescriptions || 0,
        pendingLabOrders: liveStats.pendingLabOrders,
        queueWaiting: liveStats.queueWaiting,
        queueInService: liveStats.queueInService,
        bedOccupancy: typeof rpcStats.bedOccupancy === 'number' ? rpcStats.bedOccupancy : 0,
        criticalLabOrders: liveStats.criticalLabOrders,
      };
    },
    enabled: !!hospital?.id,
    // OPTIMIZED: Increased stale time to reduce unnecessary refetches
    // Real-time subscriptions handle updates, polling is backup only
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // 30 seconds backup polling (reduced from 5 seconds)
    // OPTIMIZED: Keep previous data while fetching to prevent UI flicker
    placeholderData: (previousData) => previousData,
  });
}

export function useStaffOverview() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['staff-overview', hospital?.id],
    queryFn: async (): Promise<StaffOverview[]> => {
      if (!hospital?.id) return [];

      const today = format(new Date(), 'yyyy-MM-dd');

      // Get all staff with their roles
      const { data: staff, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name')
        .eq('hospital_id', hospital.id)
        .eq('is_staff', true);

      if (error) throw error;

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('hospital_id', hospital.id);

      const roleMap = new Map<string, string>();
      for (const ur of userRoles || []) {
        roleMap.set(ur.user_id, ur.role);
      }

      // Get today's consultations per doctor
      const { data: consultations } = await supabase
        .from('consultations')
        .select('doctor_id')
        .eq('hospital_id', hospital.id)
        .gte('created_at', today);

      const consultationCounts = new Map<string, number>();
      for (const c of consultations || []) {
        if (c.doctor_id) {
          consultationCounts.set(c.doctor_id, (consultationCounts.get(c.doctor_id) || 0) + 1);
        }
      }

      return (staff || []).map(s => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`,
        role: roleMap.get(s.user_id) || 'staff',
        status: 'online' as const,
          todayPatients: consultationCounts.get(s.id) || 0,
        lastActive: null,
      }));
    },
    enabled: !!hospital?.id,
  });
}

export function useDepartmentPerformance() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['department-performance', hospital?.id],
    queryFn: async (): Promise<DepartmentPerformance[]> => {
      if (!hospital?.id) return [];

      const today = format(new Date(), 'yyyy-MM-dd');

      // Get departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true);

      if (deptError) throw deptError;

      // Get today's queue entries by department
      const { data: queueEntries } = await supabase
        .from('patient_queue')
        .select('department, status, check_in_time, service_start_time, service_end_time')
        .eq('hospital_id', hospital.id)
        .gte('created_at', today);

      const deptStats = new Map<string, { total: number; completed: number; waitTimes: number[] }>();

      for (const entry of queueEntries || []) {
        const dept = entry.department || 'General';
        const existing = deptStats.get(dept) || { total: 0, completed: 0, waitTimes: [] };
        existing.total++;
        
        if (entry.status === 'completed') {
          existing.completed++;
        }

        if (entry.check_in_time && entry.service_start_time) {
          const waitTime = (new Date(entry.service_start_time).getTime() - new Date(entry.check_in_time).getTime()) / (1000 * 60);
          if (waitTime > 0 && waitTime < 300) {
            existing.waitTimes.push(waitTime);
          }
        }

        deptStats.set(dept, existing);
      }

      const result: DepartmentPerformance[] = [];

      for (const dept of departments || []) {
        const stats = deptStats.get(dept.name) || { total: 0, completed: 0, waitTimes: [] };
        const avgWait = stats.waitTimes.length > 0 
          ? Math.round(stats.waitTimes.reduce((a, b) => a + b, 0) / stats.waitTimes.length)
          : 0;
        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        result.push({
          department: dept.name,
          patientsToday: stats.total,
          avgWaitTime: avgWait,
          completionRate,
        });
      }

      if (!result.find(r => r.department === 'General')) {
        const generalStats = deptStats.get('General');
        if (generalStats && generalStats.total > 0) {
          const avgWait = generalStats.waitTimes.length > 0
            ? Math.round(generalStats.waitTimes.reduce((a, b) => a + b, 0) / generalStats.waitTimes.length)
            : 0;
          result.push({
            department: 'General',
            patientsToday: generalStats.total,
            avgWaitTime: avgWait,
            completionRate: generalStats.total > 0 ? Math.round((generalStats.completed / generalStats.total) * 100) : 0,
          });
        }
      }

      return result.sort((a, b) => b.patientsToday - a.patientsToday);
    },
    enabled: !!hospital?.id,
  });
}

export function useWeeklyAppointmentTrend() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['weekly-appointment-trend', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const weekStart = startOfWeek(new Date());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      // OPTIMIZED: Single query instead of 21 separate queries
      const { data, error } = await supabase
        .from('appointments')
        .select('scheduled_date, status', { count: 'exact' })
        .eq('hospital_id', hospital.id)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lt('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      // Aggregate results in JavaScript (much faster than 21 database queries)
      const dayStats = new Map<string, { scheduled: number; completed: number; cancelled: number }>();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayLabel = format(date, 'EEE');
        dayStats.set(dayLabel, { scheduled: 0, completed: 0, cancelled: 0 });
      }

      for (const appointment of data || []) {
        const dayLabel = format(new Date(appointment.scheduled_date), 'EEE');
        const stats = dayStats.get(dayLabel);
        if (stats) {
          stats.scheduled++;
          if (appointment.status === 'completed') stats.completed++;
          if (appointment.status === 'cancelled') stats.cancelled++;
        }
      }

      return Array.from(dayStats.entries()).map(([day, stats]) => ({
        day,
        ...stats
      }));
    },
    enabled: !!hospital?.id,
  });
}
