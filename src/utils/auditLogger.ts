/**
 * Audit Logging System
 * Tracks all user actions for compliance and security
 */

import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  user_id: string;
  hospital_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure';
  error_message?: string;
  created_at: string;
}

class AuditLogger {
  /**
   * Log user action
   */
  async logAction(
    userId: string,
    hospitalId: string,
    actionType: string,
    entityType: string,
    entityId: string,
    details?: Record<string, unknown>,
    status: 'success' | 'failure' = 'success',
    errorMessage?: string
  ): Promise<AuditLog> {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        hospital_id: hospitalId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details: details || {},
        ip_address: this.getClientIP(),
        user_agent: navigator.userAgent,
        status,
        error_message: errorMessage,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Log patient access
   */
  async logPatientAccess(
    userId: string,
    hospitalId: string,
    patientId: string,
    accessType: 'view' | 'edit' | 'delete'
  ): Promise<AuditLog> {
    return this.logAction(
      userId,
      hospitalId,
      `patient_${accessType}`,
      'patient',
      patientId,
      { access_type: accessType }
    );
  }

  /**
   * Log data export
   */
  async logDataExport(
    userId: string,
    hospitalId: string,
    dataType: string,
    recordCount: number,
    format: string
  ): Promise<AuditLog> {
    return this.logAction(
      userId,
      hospitalId,
      'data_export',
      'export',
      `${dataType}_${Date.now()}`,
      {
        data_type: dataType,
        record_count: recordCount,
        format,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    userId: string,
    hospitalId: string,
    eventType: 'login' | 'logout' | 'failed_login' | 'password_change',
    success: boolean,
    errorMessage?: string
  ): Promise<AuditLog> {
    return this.logAction(
      userId,
      hospitalId,
      eventType,
      'authentication',
      userId,
      { event_type: eventType },
      success ? 'success' : 'failure',
      errorMessage
    );
  }

  /**
   * Log permission change
   */
  async logPermissionChange(
    userId: string,
    hospitalId: string,
    targetUserId: string,
    oldRole: string,
    newRole: string
  ): Promise<AuditLog> {
    return this.logAction(
      userId,
      hospitalId,
      'permission_change',
      'user',
      targetUserId,
      {
        old_role: oldRole,
        new_role: newRole,
        changed_by: userId,
      }
    );
  }

  /**
   * Log configuration change
   */
  async logConfigChange(
    userId: string,
    hospitalId: string,
    configKey: string,
    oldValue: unknown,
    newValue: unknown
  ): Promise<AuditLog> {
    return this.logAction(
      userId,
      hospitalId,
      'config_change',
      'configuration',
      configKey,
      {
        config_key: configKey,
        old_value: oldValue,
        new_value: newValue,
      }
    );
  }

  /**
   * Get audit logs for user
   */
  async getUserAuditLogs(userId: string, limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get audit logs for entity
   */
  async getEntityAuditLogs(entityType: string, entityId: string, limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get audit logs for hospital
   */
  async getHospitalAuditLogs(hospitalId: string, limit = 1000): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get failed actions
   */
  async getFailedActions(hospitalId: string, limit = 100): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'failure')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get client IP address
   */
  private getClientIP(): string {
    // In production, this would come from server headers
    // For now, return a placeholder
    return 'client-ip';
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(
    hospitalId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    topUsers: Array<{ userId: string; actionCount: number }>;
  }> {
    const logs = await this.getHospitalAuditLogs(hospitalId, 10000);

    const filtered = logs.filter(log => {
      const logDate = new Date(log.created_at);
      return logDate >= new Date(startDate) && logDate <= new Date(endDate);
    });

    const actionsByType: Record<string, number> = {};
    const userActions: Record<string, number> = {};

    filtered.forEach(log => {
      actionsByType[log.action_type] = (actionsByType[log.action_type] || 0) + 1;
      userActions[log.user_id] = (userActions[log.user_id] || 0) + 1;
    });

    const topUsers = Object.entries(userActions)
      .map(([userId, count]) => ({ userId, actionCount: count }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    return {
      totalActions: filtered.length,
      successfulActions: filtered.filter(l => l.status === 'success').length,
      failedActions: filtered.filter(l => l.status === 'failure').length,
      actionsByType,
      topUsers,
    };
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
