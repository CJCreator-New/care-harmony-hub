import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, format, addDays, differenceInCalendarDays, subYears } from 'date-fns';

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

export function useDailyBreakdown(range?: { start: Date; end: Date }) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['daily-breakdown', hospital?.id, range?.start?.toISOString(), range?.end?.toISOString()],
    queryFn: async (): Promise<DailySummary[]> => {
      if (!hospital?.id) throw new Error('No hospital context');

      const startDate = range?.start ? startOfDay(range.start) : startOfDay(subDays(new Date(), 6));
      const endDate = range?.end ? endOfDay(range.end) : endOfDay(new Date());
      const dayCount = Math.min(365, differenceInCalendarDays(endDate, startDate) + 1);

      const [consultations, prescriptions, invoices, appointments] = await Promise.all([
        supabase
          .from('consultations')
          .select('created_at')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('prescriptions')
          .select('created_at')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('invoices')
          .select('created_at, paid_amount')
          .eq('hospital_id', hospital.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString()),
        supabase
          .from('appointments')
          .select('scheduled_date')
          .eq('hospital_id', hospital.id)
          .eq('status', 'completed')
          .gte('scheduled_date', format(startDate, 'yyyy-MM-dd'))
          .lte('scheduled_date', format(endDate, 'yyyy-MM-dd')),
      ]);

      if (consultations.error) throw consultations.error;
      if (prescriptions.error) throw prescriptions.error;
      if (invoices.error) throw invoices.error;
      if (appointments.error) throw appointments.error;

      const countByDate = (items: Array<{ created_at?: string; scheduled_date?: string }>, key: 'created_at' | 'scheduled_date') => {
        const counts = new Map<string, number>();
        for (const item of items || []) {
          const dateKey = key === 'created_at' ? format(new Date(item.created_at || ''), 'yyyy-MM-dd') : item.scheduled_date || '';
          if (!dateKey) continue;
          counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
        }
        return counts;
      };

      const revenueByDate = new Map<string, number>();
      for (const inv of invoices.data || []) {
        const dateKey = format(new Date(inv.created_at || ''), 'yyyy-MM-dd');
        revenueByDate.set(dateKey, (revenueByDate.get(dateKey) || 0) + Number(inv.paid_amount || 0));
      }

      const consultCounts = countByDate(consultations.data || [], 'created_at');
      const prescriptionCounts = countByDate(prescriptions.data || [], 'created_at');
      const patientCounts = countByDate(appointments.data || [], 'scheduled_date');

      const summaries: DailySummary[] = [];
      for (let i = 0; i < dayCount; i++) {
        const date = addDays(startDate, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        summaries.push({
          date: dateStr,
          consultations: consultCounts.get(dateStr) || 0,
          prescriptions: prescriptionCounts.get(dateStr) || 0,
          revenue: revenueByDate.get(dateStr) || 0,
          patients_seen: patientCounts.get(dateStr) || 0,
        });
      }

      return summaries;
    },
    enabled: !!hospital?.id,
  });
}

export function useYearOverYearMetrics(range?: { start: Date; end: Date }) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['yoy-metrics', hospital?.id, range?.start?.toISOString(), range?.end?.toISOString()],
    queryFn: async () => {
      if (!hospital?.id || !range?.start || !range?.end) return null;

      const currentStart = startOfDay(range.start);
      const currentEnd = endOfDay(range.end);
      const previousStart = subYears(currentStart, 1);
      const previousEnd = subYears(currentEnd, 1);

      const [currentInvoices, previousInvoices, currentAppointments, previousAppointments, currentQualityData, previousQualityData] =
        await Promise.all([
          supabase
            .from('invoices')
            .select('paid_amount')
            .eq('hospital_id', hospital.id)
            .gte('created_at', currentStart.toISOString())
            .lte('created_at', currentEnd.toISOString()),
          supabase
            .from('invoices')
            .select('paid_amount')
            .eq('hospital_id', hospital.id)
            .gte('created_at', previousStart.toISOString())
            .lte('created_at', previousEnd.toISOString()),
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id)
            .eq('status', 'completed')
            .gte('scheduled_date', format(currentStart, 'yyyy-MM-dd'))
            .lte('scheduled_date', format(currentEnd, 'yyyy-MM-dd')),
          supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('hospital_id', hospital.id)
            .eq('status', 'completed')
            .gte('scheduled_date', format(previousStart, 'yyyy-MM-dd'))
            .lte('scheduled_date', format(previousEnd, 'yyyy-MM-dd')),
          supabase
            .from('patient_quality_compliance')
            .select('compliance_status')
            .eq('hospital_id', hospital.id)
            .gte('compliance_date', format(currentStart, 'yyyy-MM-dd'))
            .lte('compliance_date', format(currentEnd, 'yyyy-MM-dd')),
          supabase
            .from('patient_quality_compliance')
            .select('compliance_status')
            .eq('hospital_id', hospital.id)
            .gte('compliance_date', format(previousStart, 'yyyy-MM-dd'))
            .lte('compliance_date', format(previousEnd, 'yyyy-MM-dd')),
        ]);

      if (currentInvoices.error) throw currentInvoices.error;
      if (previousInvoices.error) throw previousInvoices.error;
      if (currentAppointments.error) throw currentAppointments.error;
      if (previousAppointments.error) throw previousAppointments.error;
      if (currentQualityData.error) throw currentQualityData.error;
      if (previousQualityData.error) throw previousQualityData.error;

      const sumRevenue = (data: { paid_amount: number }[] | null) =>
        data?.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0) || 0;

      const complianceRate = (data: { compliance_status: string }[] | null) => {
        if (!data || data.length === 0) return 0;
        const compliant = data.filter((row) => row.compliance_status === 'compliant').length;
        return (compliant / data.length) * 100;
      };

      const currentRevenue = sumRevenue(currentInvoices.data);
      const previousRevenue = sumRevenue(previousInvoices.data);
      const currentPatients = currentAppointments.count || 0;
      const previousPatients = previousAppointments.count || 0;
      const currentQuality = complianceRate(currentQualityData.data);
      const previousQuality = complianceRate(previousQualityData.data);

      const change = (current: number, previous: number) =>
        previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;

      return {
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          changePercent: change(currentRevenue, previousRevenue),
        },
        patients: {
          current: currentPatients,
          previous: previousPatients,
          changePercent: change(currentPatients, previousPatients),
        },
        quality: {
          current: currentQuality,
          previous: previousQuality,
          changePercent: change(currentQuality, previousQuality),
        },
      };
    },
    enabled: !!hospital?.id && !!range?.start && !!range?.end,
  });
}
