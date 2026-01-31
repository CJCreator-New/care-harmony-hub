import { supabase } from '@/lib/supabase';

export interface AnalyticsMetric {
  id: string;
  metric: string;
  value: number;
  timestamp: string;
  hospital_id: string;
}

export interface DashboardData {
  totalPatients: number;
  activeAppointments: number;
  revenue: number;
  occupancyRate: number;
  avgWaitTime: number;
  staffUtilization: number;
  trends: Record<string, number[]>;
}

class AnalyticsEngine {
  private static instance: AnalyticsEngine;

  private constructor() {}

  static getInstance(): AnalyticsEngine {
    if (!AnalyticsEngine.instance) {
      AnalyticsEngine.instance = new AnalyticsEngine();
    }
    return AnalyticsEngine.instance;
  }

  async getDashboardMetrics(hospitalId: string, days: number = 30): Promise<DashboardData> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [patients, appointments, revenue, occupancy, waitTime, staff] = await Promise.all([
      this.getTotalPatients(hospitalId),
      this.getActiveAppointments(hospitalId),
      this.getRevenue(hospitalId, startDate),
      this.getOccupancyRate(hospitalId),
      this.getAverageWaitTime(hospitalId),
      this.getStaffUtilization(hospitalId),
    ]);

    const trends = await this.getTrends(hospitalId, days);

    return {
      totalPatients: patients,
      activeAppointments: appointments,
      revenue,
      occupancyRate: occupancy,
      avgWaitTime: waitTime,
      staffUtilization: staff,
      trends,
    };
  }

  private async getTotalPatients(hospitalId: string): Promise<number> {
    const { count } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId);
    return count || 0;
  }

  private async getActiveAppointments(hospitalId: string): Promise<number> {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('status', 'scheduled')
      .gte('appointment_date', new Date().toISOString());
    return count || 0;
  }

  private async getRevenue(hospitalId: string, startDate: Date): Promise<number> {
    const { data } = await supabase
      .from('billing')
      .select('total_amount')
      .eq('hospital_id', hospitalId)
      .gte('created_at', startDate.toISOString())
      .eq('status', 'paid');

    return data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0;
  }

  private async getOccupancyRate(hospitalId: string): Promise<number> {
    const { data: beds } = await supabase
      .from('beds')
      .select('status')
      .eq('hospital_id', hospitalId);

    if (!beds || beds.length === 0) return 0;
    const occupied = beds.filter((b) => b.status === 'occupied').length;
    return Math.round((occupied / beds.length) * 100);
  }

  private async getAverageWaitTime(hospitalId: string): Promise<number> {
    const { data } = await supabase
      .from('appointments')
      .select('check_in_time, appointment_date')
      .eq('hospital_id', hospitalId)
      .eq('status', 'completed')
      .limit(100);

    if (!data || data.length === 0) return 0;

    const waitTimes = data
      .filter((a) => a.check_in_time && a.appointment_date)
      .map((a) => {
        const checkIn = new Date(a.check_in_time).getTime();
        const scheduled = new Date(a.appointment_date).getTime();
        return Math.max(0, (checkIn - scheduled) / 60000);
      });

    return waitTimes.length > 0 ? Math.round(waitTimes.reduce((a, b) => a + b) / waitTimes.length) : 0;
  }

  private async getStaffUtilization(hospitalId: string): Promise<number> {
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active');

    const { count: activeShifts } = await supabase
      .from('staff_shifts')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('status', 'active');

    if (!staff || staff.length === 0) return 0;
    return Math.round(((activeShifts || 0) / staff.length) * 100);
  }

  private async getTrends(hospitalId: string, days: number): Promise<Record<string, number[]>> {
    const trends: Record<string, number[]> = {
      patients: [],
      appointments: [],
      revenue: [],
      occupancy: [],
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const [patients, appointments, revenue, occupancy] = await Promise.all([
        this.getPatientsByDate(hospitalId, dateStr),
        this.getAppointmentsByDate(hospitalId, dateStr),
        this.getRevenueByDate(hospitalId, dateStr),
        this.getOccupancyByDate(hospitalId, dateStr),
      ]);

      trends.patients.push(patients);
      trends.appointments.push(appointments);
      trends.revenue.push(revenue);
      trends.occupancy.push(occupancy);
    }

    return trends;
  }

  private async getPatientsByDate(hospitalId: string, date: string): Promise<number> {
    const { count } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59`);
    return count || 0;
  }

  private async getAppointmentsByDate(hospitalId: string, date: string): Promise<number> {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .gte('appointment_date', `${date}T00:00:00`)
      .lt('appointment_date', `${date}T23:59:59`);
    return count || 0;
  }

  private async getRevenueByDate(hospitalId: string, date: string): Promise<number> {
    const { data } = await supabase
      .from('billing')
      .select('total_amount')
      .eq('hospital_id', hospitalId)
      .eq('status', 'paid')
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59`);

    return data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0;
  }

  private async getOccupancyByDate(hospitalId: string, date: string): Promise<number> {
    const { data } = await supabase
      .from('bed_history')
      .select('status')
      .eq('hospital_id', hospitalId)
      .gte('timestamp', `${date}T00:00:00`)
      .lt('timestamp', `${date}T23:59:59`);

    if (!data || data.length === 0) return 0;
    const occupied = data.filter((b) => b.status === 'occupied').length;
    return Math.round((occupied / data.length) * 100);
  }

  async getCustomReport(
    hospitalId: string,
    metrics: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, unknown>> {
    const report: Record<string, unknown> = {
      hospital_id: hospitalId,
      generated_at: new Date().toISOString(),
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
    };

    for (const metric of metrics) {
      switch (metric) {
        case 'patient_demographics':
          report.patient_demographics = await this.getPatientDemographics(hospitalId, startDate, endDate);
          break;
        case 'department_performance':
          report.department_performance = await this.getDepartmentPerformance(hospitalId, startDate, endDate);
          break;
        case 'financial_summary':
          report.financial_summary = await this.getFinancialSummary(hospitalId, startDate, endDate);
          break;
      }
    }

    return report;
  }

  private async getPatientDemographics(
    hospitalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('patients')
      .select('age, gender')
      .eq('hospital_id', hospitalId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!data) return {};

    const demographics: Record<string, number> = {};
    data.forEach((p) => {
      const key = `${p.gender || 'unknown'}_${Math.floor((p.age || 0) / 10) * 10}s`;
      demographics[key] = (demographics[key] || 0) + 1;
    });

    return demographics;
  }

  private async getDepartmentPerformance(
    hospitalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('consultations')
      .select('department, status')
      .eq('hospital_id', hospitalId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!data) return {};

    const performance: Record<string, Record<string, number>> = {};
    data.forEach((c) => {
      if (!performance[c.department]) {
        performance[c.department] = { total: 0, completed: 0, pending: 0 };
      }
      performance[c.department].total += 1;
      if (c.status === 'completed') performance[c.department].completed += 1;
      if (c.status === 'pending') performance[c.department].pending += 1;
    });

    return performance;
  }

  private async getFinancialSummary(
    hospitalId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('billing')
      .select('total_amount, status, payment_method')
      .eq('hospital_id', hospitalId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (!data) return {};

    const summary = {
      total_revenue: 0,
      paid: 0,
      pending: 0,
      by_method: {} as Record<string, number>,
    };

    data.forEach((b) => {
      summary.total_revenue += b.total_amount || 0;
      if (b.status === 'paid') summary.paid += b.total_amount || 0;
      if (b.status === 'pending') summary.pending += b.total_amount || 0;
      const method = b.payment_method || 'unknown';
      summary.by_method[method] = (summary.by_method[method] || 0) + (b.total_amount || 0);
    });

    return summary;
  }
}

export const analyticsEngine = AnalyticsEngine.getInstance();
