import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, startOfWeek } from 'date-fns';

export interface AdminStats {
  totalPatients: number;
  newPatientsThisMonth: number;
  todayAppointments: number;
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

  return useQuery({
    queryKey: ['admin-stats', hospital?.id],
    queryFn: async (): Promise<AdminStats> => {
      if (!hospital?.id) {
        throw new Error('No hospital ID');
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      const [
        patientsResult,
        newPatientsResult,
        todayApptResult,
        completedResult,
        cancelledResult,
        staffResult,
        userRolesResult,
        revenueResult,
        pendingInvoicesResult,
        prescriptionsResult,
        labOrdersResult,
        criticalLabsResult,
        queueResult,
        resourcesResult,
      ] = await Promise.all([
        // Total patients
        supabase.from('patients').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).eq('is_active', true),
        // New patients this month
        supabase.from('patients').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).gte('created_at', monthStart),
        // Today's appointments
        supabase.from('appointments').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).eq('scheduled_date', today),
        // Completed today
        supabase.from('appointments').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).eq('scheduled_date', today).eq('status', 'completed'),
        // Cancelled today
        supabase.from('appointments').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).eq('scheduled_date', today).eq('status', 'cancelled'),
        // Staff count
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).eq('is_staff', true),
        // User roles for breakdown
        supabase.from('user_roles').select('role')
          .eq('hospital_id', hospital.id),
        // Monthly revenue (paid amount)
        supabase.from('invoices').select('paid_amount')
          .eq('hospital_id', hospital.id).gte('created_at', monthStart),
        // Pending invoices
        supabase.from('invoices').select('total')
          .eq('hospital_id', hospital.id).eq('status', 'pending'),
        // Pending prescriptions
        supabase.from('prescriptions').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).eq('status', 'pending'),
        // Pending lab orders
        supabase.from('lab_orders').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).in('status', ['pending', 'in_progress']),
        // Critical lab orders
        supabase.from('lab_orders').select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id).eq('is_critical', true).neq('status', 'completed'),
        // Queue status
        supabase.from('patient_queue').select('status')
          .eq('hospital_id', hospital.id).in('status', ['waiting', 'called', 'in_service']),
        // Resources (beds)
        supabase.from('hospital_resources').select('id, status, resource_type')
          .eq('hospital_id', hospital.id).eq('resource_type', 'bed'),
      ]);

      // Calculate staff by role
      const staffByRole: Record<string, number> = {};
      for (const ur of userRolesResult.data || []) {
        const role = ur.role || 'unknown';
        staffByRole[role] = (staffByRole[role] || 0) + 1;
      }

      // Calculate revenue
      const monthlyRevenue = revenueResult.data?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;
      
      // Calculate pending amount
      const pendingAmount = pendingInvoicesResult.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      // Queue counts
      const queueWaiting = queueResult.data?.filter(q => q.status === 'waiting' || q.status === 'called').length || 0;
      const queueInService = queueResult.data?.filter(q => q.status === 'in_service').length || 0;

      // Bed occupancy
      const totalBeds = resourcesResult.data?.length || 0;
      const occupiedBeds = resourcesResult.data?.filter(r => r.status === 'occupied').length || 0;
      const bedOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

      return {
        totalPatients: patientsResult.count || 0,
        newPatientsThisMonth: newPatientsResult.count || 0,
        todayAppointments: todayApptResult.count || 0,
        completedToday: completedResult.count || 0,
        cancelledToday: cancelledResult.count || 0,
        activeStaff: staffResult.count || 0,
        staffByRole,
        monthlyRevenue,
        pendingInvoices: pendingInvoicesResult.data?.length || 0,
        pendingAmount,
        avgWaitTime: 15,
        pendingPrescriptions: prescriptionsResult.count || 0,
        pendingLabOrders: labOrdersResult.count || 0,
        queueWaiting,
        queueInService,
        bedOccupancy,
        criticalLabOrders: criticalLabsResult.count || 0,
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: 30000,
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
        .select('id, first_name, last_name')
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
        role: roleMap.get(s.id) || 'staff',
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

      const result: Array<{ day: string; scheduled: number; completed: number; cancelled: number }> = [];
      const weekStart = startOfWeek(new Date());

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayLabel = format(date, 'EEE');

        const [scheduled, completed, cancelled] = await Promise.all([
          supabase.from('appointments').select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id).eq('scheduled_date', dateStr),
          supabase.from('appointments').select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id).eq('scheduled_date', dateStr).eq('status', 'completed'),
          supabase.from('appointments').select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id).eq('scheduled_date', dateStr).eq('status', 'cancelled'),
        ]);

        result.push({
          day: dayLabel,
          scheduled: scheduled.count || 0,
          completed: completed.count || 0,
          cancelled: cancelled.count || 0,
        });
      }

      return result;
    },
    enabled: !!hospital?.id,
  });
}
