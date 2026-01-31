import { supabase } from '@/lib/supabase';

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  ip_address?: string;
  description: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  resolved: boolean;
}

export interface ThreatIndicator {
  type: string;
  threshold: number;
  window_ms: number;
  action: 'alert' | 'block' | 'log';
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventLog: SecurityEvent[] = [];
  private threatIndicators: Map<string, ThreatIndicator> = new Map();
  private suspiciousPatterns: Map<string, number> = new Map();

  private constructor() {
    this.initializeThreatIndicators();
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  private initializeThreatIndicators(): void {
    this.threatIndicators.set('failed_login', {
      type: 'failed_login',
      threshold: 5,
      window_ms: 300000,
      action: 'block',
    });

    this.threatIndicators.set('rapid_requests', {
      type: 'rapid_requests',
      threshold: 100,
      window_ms: 60000,
      action: 'alert',
    });

    this.threatIndicators.set('data_export', {
      type: 'data_export',
      threshold: 10,
      window_ms: 3600000,
      action: 'alert',
    });

    this.threatIndicators.set('permission_escalation', {
      type: 'permission_escalation',
      threshold: 3,
      window_ms: 600000,
      action: 'block',
    });

    this.threatIndicators.set('sql_injection_attempt', {
      type: 'sql_injection_attempt',
      threshold: 1,
      window_ms: 60000,
      action: 'block',
    });
  }

  async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<SecurityEvent | null> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      event_type: eventType,
      severity,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      ip_address: metadata.ip_address as string,
      description,
      metadata,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.eventLog.push(event);

    try {
      const { data, error } = await supabase.from('security_events').insert(event);
      if (error) throw error;
      return data?.[0] as SecurityEvent;
    } catch (error) {
      console.error('Failed to log security event:', error);
      return event;
    }
  }

  async detectThreat(
    threatType: string,
    userId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<{ detected: boolean; action: string }> {
    const indicator = this.threatIndicators.get(threatType);
    if (!indicator) return { detected: false, action: 'none' };

    const key = `${threatType}:${userId}`;
    const count = (this.suspiciousPatterns.get(key) || 0) + 1;
    this.suspiciousPatterns.set(key, count);

    const detected = count >= indicator.threshold;

    if (detected) {
      await this.logSecurityEvent(threatType, 'high', `Threat detected: ${threatType}`, {
        ...metadata,
        count,
        threshold: indicator.threshold,
      });
    }

    setTimeout(() => {
      this.suspiciousPatterns.delete(key);
    }, indicator.window_ms);

    return { detected, action: detected ? indicator.action : 'none' };
  }

  async checkForSQLInjection(input: string): Promise<boolean> {
    const sqlPatterns = [
      /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(-{2}|\/\*|\*\/|;)/,
      /(xp_|sp_)/i,
    ];

    const isSuspicious = sqlPatterns.some((pattern) => pattern.test(input));

    if (isSuspicious) {
      await this.logSecurityEvent('sql_injection_attempt', 'critical', 'Potential SQL injection detected', {
        input: input.substring(0, 100),
      });
    }

    return isSuspicious;
  }

  async checkForXSS(input: string): Promise<boolean> {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
    ];

    const isSuspicious = xssPatterns.some((pattern) => pattern.test(input));

    if (isSuspicious) {
      await this.logSecurityEvent('xss_attempt', 'high', 'Potential XSS attack detected', {
        input: input.substring(0, 100),
      });
    }

    return isSuspicious;
  }

  async getSecurityEvents(
    hospitalId: string,
    severity?: string,
    limit: number = 100
  ): Promise<SecurityEvent[]> {
    let query = supabase.from('security_events').select('*').eq('hospital_id', hospitalId);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query.order('timestamp', { ascending: false }).limit(limit);

    if (error) {
      console.error('Failed to fetch security events:', error);
      return [];
    }

    return (data || []) as SecurityEvent[];
  }

  async generateSecurityReport(hospitalId: string, days: number = 30): Promise<Record<string, unknown>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: events, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('hospital_id', hospitalId)
      .gte('timestamp', startDate.toISOString());

    if (error || !events) {
      return { error: 'Failed to generate report' };
    }

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    let criticalCount = 0;

    events.forEach((event: Record<string, unknown>) => {
      const type = event.event_type as string;
      const severity = event.severity as string;

      eventsByType[type] = (eventsByType[type] || 0) + 1;
      eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1;

      if (severity === 'critical') criticalCount += 1;
    });

    return {
      period: { start: startDate.toISOString(), end: new Date().toISOString() },
      total_events: events.length,
      critical_events: criticalCount,
      events_by_type: eventsByType,
      events_by_severity: eventsBySeverity,
      average_events_per_day: Math.round(events.length / days),
      risk_level: criticalCount > 5 ? 'high' : criticalCount > 0 ? 'medium' : 'low',
    };
  }

  async resolveSecurityEvent(eventId: string): Promise<boolean> {
    const { error } = await supabase
      .from('security_events')
      .update({ resolved: true })
      .eq('id', eventId);

    return !error;
  }

  getRecentEvents(limit: number = 10): SecurityEvent[] {
    return this.eventLog.slice(-limit);
  }

  clearOldEvents(olderThanMs: number = 86400000): void {
    const cutoff = Date.now() - olderThanMs;
    this.eventLog = this.eventLog.filter((event) => new Date(event.timestamp).getTime() > cutoff);
  }
}

export const securityMonitor = SecurityMonitor.getInstance();
