import { supabase } from '@/lib/supabase';

export interface Report {
  id: string;
  name: string;
  type: string;
  hospital_id: string;
  created_by: string;
  created_at: string;
  data: Record<string, unknown>;
  format: 'pdf' | 'csv' | 'excel' | 'json';
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  filters: Record<string, unknown>;
}

export interface ScheduledReport {
  id: string;
  report_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  next_run: string;
  enabled: boolean;
}

class ReportingEngine {
  private static instance: ReportingEngine;

  private constructor() {}

  static getInstance(): ReportingEngine {
    if (!ReportingEngine.instance) {
      ReportingEngine.instance = new ReportingEngine();
    }
    return ReportingEngine.instance;
  }

  async generateReport(
    hospitalId: string,
    userId: string,
    type: string,
    filters: Record<string, unknown>,
    format: 'pdf' | 'csv' | 'excel' | 'json' = 'pdf'
  ): Promise<Report | null> {
    try {
      const data = await this.collectReportData(hospitalId, type, filters);

      const { data: report, error } = await supabase.from('reports').insert({
        name: `${type}_${new Date().toISOString().split('T')[0]}`,
        type,
        hospital_id: hospitalId,
        created_by: userId,
        created_at: new Date().toISOString(),
        data,
        format,
      });

      if (error) throw error;
      return report?.[0] as Report;
    } catch (error) {
      console.error('Report generation failed:', error);
      return null;
    }
  }

  private async collectReportData(
    hospitalId: string,
    type: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};

    switch (type) {
      case 'patient_census':
        data.census = await this.getPatientCensus(hospitalId, filters);
        data.demographics = await this.getPatientDemographics(hospitalId, filters);
        break;
      case 'clinical_performance':
        data.consultations = await this.getConsultationMetrics(hospitalId, filters);
        data.procedures = await this.getProcedureMetrics(hospitalId, filters);
        data.outcomes = await this.getOutcomeMetrics(hospitalId, filters);
        break;
      case 'financial':
        data.revenue = await this.getRevenueMetrics(hospitalId, filters);
        data.expenses = await this.getExpenseMetrics(hospitalId, filters);
        data.profitability = await this.getProfitabilityMetrics(hospitalId, filters);
        break;
      case 'operational':
        data.bed_utilization = await this.getBedUtilization(hospitalId, filters);
        data.staff_performance = await this.getStaffPerformance(hospitalId, filters);
        data.equipment_usage = await this.getEquipmentUsage(hospitalId, filters);
        break;
      case 'compliance':
        data.audit_logs = await this.getAuditLogs(hospitalId, filters);
        data.policy_violations = await this.getPolicyViolations(hospitalId, filters);
        data.certifications = await this.getCertificationStatus(hospitalId, filters);
        break;
    }

    return data;
  }

  private async getPatientCensus(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('patients')
      .select('id, status, admission_date')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    return {
      total: data.length,
      active: data.filter((p) => p.status === 'active').length,
      discharged: data.filter((p) => p.status === 'discharged').length,
      avg_stay: this.calculateAverageStay(data),
    };
  }

  private async getPatientDemographics(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('patients')
      .select('age, gender, blood_group')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    const demographics: Record<string, number> = {};
    data.forEach((p) => {
      const key = `${p.gender || 'unknown'}_${Math.floor((p.age || 0) / 10) * 10}s`;
      demographics[key] = (demographics[key] || 0) + 1;
    });

    return demographics;
  }

  private async getConsultationMetrics(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('consultations')
      .select('id, department, status, duration')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    const metrics: Record<string, Record<string, number>> = {};
    data.forEach((c) => {
      if (!metrics[c.department]) {
        metrics[c.department] = { total: 0, completed: 0, avg_duration: 0 };
      }
      metrics[c.department].total += 1;
      if (c.status === 'completed') metrics[c.department].completed += 1;
      metrics[c.department].avg_duration += c.duration || 0;
    });

    Object.keys(metrics).forEach((dept) => {
      metrics[dept].avg_duration = Math.round(metrics[dept].avg_duration / metrics[dept].total);
    });

    return metrics;
  }

  private async getProcedureMetrics(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('procedures')
      .select('id, type, status, duration, cost')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    return {
      total: data.length,
      completed: data.filter((p) => p.status === 'completed').length,
      avg_duration: Math.round(data.reduce((sum, p) => sum + (p.duration || 0), 0) / data.length),
      total_cost: data.reduce((sum, p) => sum + (p.cost || 0), 0),
    };
  }

  private async getOutcomeMetrics(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('patient_outcomes')
      .select('outcome_type, count')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    const outcomes: Record<string, number> = {};
    data.forEach((o) => {
      outcomes[o.outcome_type] = (outcomes[o.outcome_type] || 0) + (o.count || 0);
    });

    return outcomes;
  }

  private async getRevenueMetrics(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('billing')
      .select('total_amount, status, payment_method')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    return {
      total_revenue: data.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      paid: data.filter((b) => b.status === 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0),
      pending: data.filter((b) => b.status === 'pending').reduce((sum, b) => sum + (b.total_amount || 0), 0),
      by_method: this.groupByPaymentMethod(data),
    };
  }

  private async getExpenseMetrics(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    const expenses: Record<string, number> = {};
    data.forEach((e) => {
      expenses[e.category] = (expenses[e.category] || 0) + (e.amount || 0);
    });

    return expenses;
  }

  private async getProfitabilityMetrics(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const revenue = await this.getRevenueMetrics(hospitalId, filters);
    const expenses = await this.getExpenseMetrics(hospitalId, filters);

    const totalExpenses = Object.values(expenses as Record<string, number>).reduce((a, b) => a + b, 0);
    const totalRevenue = (revenue.total_revenue as number) || 0;

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      profit_margin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
    };
  }

  private async getBedUtilization(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('beds')
      .select('ward, status')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    const utilization: Record<string, Record<string, number>> = {};
    data.forEach((b) => {
      if (!utilization[b.ward]) {
        utilization[b.ward] = { total: 0, occupied: 0 };
      }
      utilization[b.ward].total += 1;
      if (b.status === 'occupied') utilization[b.ward].occupied += 1;
    });

    Object.keys(utilization).forEach((ward) => {
      const rate = Math.round((utilization[ward].occupied / utilization[ward].total) * 100);
      utilization[ward].occupancy_rate = rate;
    });

    return utilization;
  }

  private async getStaffPerformance(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('staff')
      .select('id, department, performance_rating')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    const performance: Record<string, Record<string, number>> = {};
    data.forEach((s) => {
      if (!performance[s.department]) {
        performance[s.department] = { count: 0, avg_rating: 0 };
      }
      performance[s.department].count += 1;
      performance[s.department].avg_rating += s.performance_rating || 0;
    });

    Object.keys(performance).forEach((dept) => {
      performance[dept].avg_rating = Math.round(performance[dept].avg_rating / performance[dept].count * 100) / 100;
    });

    return performance;
  }

  private async getEquipmentUsage(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('equipment')
      .select('name, usage_hours, maintenance_status')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    return {
      total_equipment: data.length,
      avg_usage_hours: Math.round(data.reduce((sum, e) => sum + (e.usage_hours || 0), 0) / data.length),
      needs_maintenance: data.filter((e) => e.maintenance_status === 'needed').length,
    };
  }

  private async getAuditLogs(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('audit_logs')
      .select('action, user_id, timestamp')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    return {
      total_actions: data.length,
      by_action: this.groupByAction(data),
      by_user: this.groupByUser(data),
    };
  }

  private async getPolicyViolations(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('policy_violations')
      .select('violation_type, severity, resolved')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    return {
      total: data.length,
      unresolved: data.filter((v) => !v.resolved).length,
      by_severity: this.groupBySeverity(data),
    };
  }

  private async getCertificationStatus(
    hospitalId: string,
    filters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const { data } = await supabase
      .from('certifications')
      .select('name, expiry_date, status')
      .eq('hospital_id', hospitalId);

    if (!data) return {};

    return {
      total: data.length,
      active: data.filter((c) => c.status === 'active').length,
      expiring_soon: data.filter((c) => {
        const expiry = new Date(c.expiry_date);
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        return expiry <= soon;
      }).length,
    };
  }

  async createTemplate(
    name: string,
    description: string,
    sections: string[],
    filters: Record<string, unknown>
  ): Promise<ReportTemplate | null> {
    const { data, error } = await supabase.from('report_templates').insert({
      name,
      description,
      sections,
      filters,
    });

    if (error) return null;
    return data?.[0] as ReportTemplate;
  }

  async scheduleReport(
    reportId: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    recipients: string[]
  ): Promise<ScheduledReport | null> {
    const nextRun = this.calculateNextRun(frequency);

    const { data, error } = await supabase.from('scheduled_reports').insert({
      report_id: reportId,
      frequency,
      recipients,
      next_run: nextRun,
      enabled: true,
    });

    if (error) return null;
    return data?.[0] as ScheduledReport;
  }

  private calculateNextRun(frequency: string): string {
    const next = new Date();
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    return next.toISOString();
  }

  private calculateAverageStay(data: Array<Record<string, unknown>>): number {
    const stays = data
      .filter((p) => p.admission_date)
      .map((p) => {
        const admission = new Date(p.admission_date as string).getTime();
        const now = new Date().getTime();
        return (now - admission) / (1000 * 60 * 60 * 24);
      });

    return stays.length > 0 ? Math.round(stays.reduce((a, b) => a + b) / stays.length) : 0;
  }

  private groupByPaymentMethod(data: Array<Record<string, unknown>>): Record<string, number> {
    const grouped: Record<string, number> = {};
    data.forEach((b) => {
      const method = (b.payment_method as string) || 'unknown';
      grouped[method] = (grouped[method] || 0) + ((b.total_amount as number) || 0);
    });
    return grouped;
  }

  private groupByAction(data: Array<Record<string, unknown>>): Record<string, number> {
    const grouped: Record<string, number> = {};
    data.forEach((log) => {
      const action = (log.action as string) || 'unknown';
      grouped[action] = (grouped[action] || 0) + 1;
    });
    return grouped;
  }

  private groupByUser(data: Array<Record<string, unknown>>): Record<string, number> {
    const grouped: Record<string, number> = {};
    data.forEach((log) => {
      const user = (log.user_id as string) || 'unknown';
      grouped[user] = (grouped[user] || 0) + 1;
    });
    return grouped;
  }

  private groupBySeverity(data: Array<Record<string, unknown>>): Record<string, number> {
    const grouped: Record<string, number> = {};
    data.forEach((v) => {
      const severity = (v.severity as string) || 'unknown';
      grouped[severity] = (grouped[severity] || 0) + 1;
    });
    return grouped;
  }
}

export const reportingEngine = ReportingEngine.getInstance();
