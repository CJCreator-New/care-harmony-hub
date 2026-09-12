/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * Production Supabase Adapter
 *
 * Interacts with `public.lab_critical_alerts` and `public.lab_alert_escalations` tables.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ILabEscalationAuditLogger,
  ILabEscalationNotifier,
  ILabEscalationRepository,
} from '../ports';
import {
  EscalationLevel,
  LabAlertAuditEntry,
  LabAlertEscalationQueueItem,
  LabCriticalAlert,
} from '../types';

export class SupabaseLabEscalationAdapter
  implements ILabEscalationRepository, ILabEscalationAuditLogger, ILabEscalationNotifier
{
  async getAlertById(alertId: string): Promise<LabCriticalAlert | null> {
    const { data, error } = await supabase
      .from('lab_critical_alerts' as any)
      .select('*')
      .eq('id', alertId)
      .maybeSingle();

    if (error) throw error;
    return (data as unknown as LabCriticalAlert) ?? null;
  }

  async getActiveAlerts(
    hospitalId: string,
    doctorId?: string
  ): Promise<readonly LabCriticalAlert[]> {
    let query = supabase
      .from('lab_critical_alerts' as any)
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (doctorId) {
      query = query.or(`primary_doctor_id.eq.${doctorId},on_call_id.eq.${doctorId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as LabCriticalAlert[];
  }

  async saveAlert(alert: LabCriticalAlert): Promise<LabCriticalAlert> {
    const { data, error } = await supabase
      .from('lab_critical_alerts' as any)
      .upsert(alert)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as LabCriticalAlert;
  }

  async getPendingEscalations(
    hospitalId: string,
    asOfTime?: string
  ): Promise<readonly LabAlertEscalationQueueItem[]> {
    const cutoff = asOfTime || new Date().toISOString();
    const { data, error } = await supabase
      .from('lab_alert_escalations' as any)
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending')
      .lte('scheduled_for', cutoff)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as LabAlertEscalationQueueItem[];
  }

  async saveEscalationItem(
    item: LabAlertEscalationQueueItem
  ): Promise<LabAlertEscalationQueueItem> {
    const { data, error } = await supabase
      .from('lab_alert_escalations' as any)
      .upsert(item)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as LabAlertEscalationQueueItem;
  }

  async saveEscalationItems(
    items: readonly LabAlertEscalationQueueItem[]
  ): Promise<readonly LabAlertEscalationQueueItem[]> {
    const { data, error } = await supabase
      .from('lab_alert_escalations' as any)
      .upsert(items as any[])
      .select();

    if (error) throw error;
    return (data || []) as unknown as LabAlertEscalationQueueItem[];
  }

  async cancelPendingEscalationsForAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('lab_alert_escalations' as any)
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('alert_id', alertId)
      .eq('status', 'pending');

    if (error) throw error;
  }

  async getAuditHistory(alertId: string): Promise<readonly LabAlertAuditEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs' as any)
      .select('*')
      .eq('resource_type', 'lab_critical_alert')
      .eq('resource_id', alertId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      alert_id: alertId,
      hospital_id: row.hospital_id,
      actor_id: row.user_id,
      action: row.action,
      details: row.details,
      created_at: row.created_at,
    })) as LabAlertAuditEntry[];
  }

  async logAction(entry: Omit<LabAlertAuditEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      await supabase.from('audit_logs' as any).insert([
        {
          action: entry.action,
          resource_type: 'lab_critical_alert',
          resource_id: entry.alert_id,
          hospital_id: entry.hospital_id,
          user_id: entry.actor_id,
          details: entry.details,
        },
      ]);
    } catch {
      // Degrade gracefully if audit log table trigger restricts writes
    }
  }

  async dispatchNotification(
    level: EscalationLevel,
    alert: LabCriticalAlert,
    targetUserId?: string | null
  ): Promise<void> {
    try {
      const channel = supabase.channel(`hospital-lab-alerts:${alert.hospital_id}`);
      await channel.send({
        type: 'broadcast',
        event: 'critical_lab_escalation',
        payload: {
          alertId: alert.id,
          testName: alert.test_name,
          resultValue: alert.result_value,
          severity: alert.severity,
          escalationLevel: level,
          targetUserId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('[SupabaseLabEscalationAdapter] Broadcast failed:', err);
    }
  }
}
