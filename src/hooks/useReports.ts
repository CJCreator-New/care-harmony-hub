import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, format } from 'date-fns';

export interface DailySummary {
  date: string;
  consultations: number;
  prescriptions: number;
  revenue: number;
  patients_seen: number;
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  total_consultations: number;
  total_prescriptions: number;
  total_revenue: number;
  total_patients: number;
  daily_breakdown: DailySummary[];
}

export interface ReportStats {
  today: {
    consultations: number;
    prescriptions: number;
    revenue: number;
    patients: number;
  };
  week: {
    consultations: number;
    prescriptions: number;
    revenue: number;
    patients: number;
  };
  month: {
    consultations: number;
    prescriptions: number;
    revenue: number;
    patients: number;
  };
}

export function useReportStats() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['report-stats', hospital?.id],
    queryFn: async (): Promise<ReportStats> => {
      if (!hospital?.id) throw new Error('No hospital context');

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();
      const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }).toISOString();
      const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 }).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // Today's stats
      const [todayConsultations, todayPrescriptions, todayRevenue, todayPatients] = await Promise.all([
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfToday)
          .lte('created_at', endOfToday),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfToday)
          .lte('created_at', endOfToday),
        supabase
          .from('invoices')
          .select('paid_amount')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfToday)
          .lte('created_at', endOfToday),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .eq('status', 'completed')
          .gte('scheduled_date', format(today, 'yyyy-MM-dd'))
          .lte('scheduled_date', format(today, 'yyyy-MM-dd')),
      ]);

      // Week stats
      const [weekConsultations, weekPrescriptions, weekRevenue, weekPatients] = await Promise.all([
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfThisWeek)
          .lte('created_at', endOfThisWeek),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfThisWeek)
          .lte('created_at', endOfThisWeek),
        supabase
          .from('invoices')
          .select('paid_amount')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfThisWeek)
          .lte('created_at', endOfThisWeek),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .eq('status', 'completed')
          .gte('scheduled_date', format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
          .lte('scheduled_date', format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')),
      ]);

      // Month stats
      const [monthConsultations, monthPrescriptions, monthRevenue, monthPatients] = await Promise.all([
        supabase
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth),
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth),
        supabase
          .from('invoices')
          .select('paid_amount')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('hospital_id', hospital.id)
          .eq('status', 'completed')
          .gte('scheduled_date', format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'))
          .lte('scheduled_date', format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd')),
      ]);

      const sumRevenue = (data: { paid_amount: number }[] | null) =>
        data?.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0) || 0;

      return {
        today: {
          consultations: todayConsultations.count || 0,
          prescriptions: todayPrescriptions.count || 0,
          revenue: sumRevenue(todayRevenue.data),
          patients: todayPatients.count || 0,
        },
        week: {
          consultations: weekConsultations.count || 0,
          prescriptions: weekPrescriptions.count || 0,
          revenue: sumRevenue(weekRevenue.data),
          patients: weekPatients.count || 0,
        },
        month: {
          consultations: monthConsultations.count || 0,
          prescriptions: monthPrescriptions.count || 0,
          revenue: sumRevenue(monthRevenue.data),
          patients: monthPatients.count || 0,
        },
      };
    },
    enabled: !!hospital?.id,
  });
}

export function useDailyBreakdown(days: number = 7) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['daily-breakdown', hospital?.id, days],
    queryFn: async (): Promise<DailySummary[]> => {
      if (!hospital?.id) throw new Error('No hospital context');

      const summaries: DailySummary[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const startOfDate = startOfDay(date).toISOString();
        const endOfDate = endOfDay(date).toISOString();

        const [consultations, prescriptions, revenue, patients] = await Promise.all([
          supabase
            .from('consultations')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id)
            .gte('created_at', startOfDate)
            .lte('created_at', endOfDate),
          supabase
            .from('prescriptions')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id)
            .gte('created_at', startOfDate)
            .lte('created_at', endOfDate),
          supabase
            .from('invoices')
            .select('paid_amount')
            .eq('hospital_id', hospital.id)
            .gte('created_at', startOfDate)
            .lte('created_at', endOfDate),
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id)
            .eq('status', 'completed')
            .eq('scheduled_date', dateStr),
        ]);

        summaries.push({
          date: dateStr,
          consultations: consultations.count || 0,
          prescriptions: prescriptions.count || 0,
          revenue: revenue.data?.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0) || 0,
          patients_seen: patients.count || 0,
        });
      }

      return summaries;
    },
    enabled: !!hospital?.id,
  });
}
