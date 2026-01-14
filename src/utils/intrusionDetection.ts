import { supabase } from '@/integrations/supabase/client';

export interface IntrusionPattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionLogic: (logs: any[]) => IntrusionAlert[];
}

export interface IntrusionAlert {
  id: string;
  patternId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: string[];
  details: any;
  timestamp: Date;
  hospitalId: string;
}

export class IntrusionDetectionService {
  private static instance: IntrusionDetectionService;
  private patterns: IntrusionPattern[] = [];
  private alertCooldowns = new Map<string, Date>();

  private constructor() {
    this.initializePatterns();
  }

  static getInstance(): IntrusionDetectionService {
    if (!IntrusionDetectionService.instance) {
      IntrusionDetectionService.instance = new IntrusionDetectionService();
    }
    return IntrusionDetectionService.instance;
  }

  private initializePatterns(): void {
    // Brute force detection
    this.patterns.push({
      id: 'brute_force',
      name: 'Brute Force Attack',
      description: 'Multiple failed login attempts from the same IP address',
      severity: 'high',
      detectionLogic: (logs) => {
        const failedLogins = logs.filter(log => log.action === 'access_denied');
        const attemptsByIP = new Map<string, any[]>();

        failedLogins.forEach(log => {
          const ip = log.ip_address || 'unknown';
          if (!attemptsByIP.has(ip)) {
            attemptsByIP.set(ip, []);
          }
          attemptsByIP.get(ip)!.push(log);
        });

        const alerts: IntrusionAlert[] = [];
        attemptsByIP.forEach((attempts, ip) => {
          if (attempts.length >= 5) {
            const severity = attempts.length >= 10 ? 'critical' : 'high';
            alerts.push({
              id: `brute-force-${ip}-${Date.now()}`,
              patternId: 'brute_force',
              severity: severity as any,
              description: `${attempts.length} failed login attempts from IP ${ip}`,
              affectedUsers: [...new Set(attempts.map(a => a.user_id))],
              details: { ip, attempts: attempts.length, timestamps: attempts.map(a => a.created_at) },
              timestamp: new Date(),
              hospitalId: attempts[0]?.hospital_id || ''
            });
          }
        });

        return alerts;
      }
    });

    // Unusual location/time access
    this.patterns.push({
      id: 'unusual_access',
      name: 'Unusual Access Pattern',
      description: 'Access from unusual locations or times',
      severity: 'medium',
      detectionLogic: (logs) => {
        const alerts: IntrusionAlert[] = [];
        const now = new Date();

        logs.forEach(log => {
          const logTime = new Date(log.created_at);
          const hour = logTime.getHours();

          // After hours access to sensitive data
          if ((hour < 6 || hour >= 22) && ['patient', 'consultation', 'prescription'].includes(log.resource_type)) {
            alerts.push({
              id: `after-hours-${log.id}`,
              patternId: 'unusual_access',
              severity: 'medium',
              description: `After-hours access to ${log.resource_type} data`,
              affectedUsers: [log.user_id],
              details: { resourceType: log.resource_type, accessTime: logTime, hour },
              timestamp: now,
              hospitalId: log.hospital_id
            });
          }
        });

        return alerts;
      }
    });

    // Mass data access
    this.patterns.push({
      id: 'mass_access',
      name: 'Mass Data Access',
      description: 'Unusual volume of data access by a single user',
      severity: 'high',
      detectionLogic: (logs) => {
        const alerts: IntrusionAlert[] = [];
        const accessByUser = new Map<string, any[]>();

        logs.filter(log => log.action === 'access_granted').forEach(log => {
          if (!accessByUser.has(log.user_id)) {
            accessByUser.set(log.user_id, []);
          }
          accessByUser.get(log.user_id)!.push(log);
        });

        accessByUser.forEach((userLogs, userId) => {
          if (userLogs.length > 100) { // Threshold for mass access
            alerts.push({
              id: `mass-access-${userId}-${Date.now()}`,
              patternId: 'mass_access',
              severity: 'high',
              description: `Mass data access: ${userLogs.length} records accessed`,
              affectedUsers: [userId],
              details: {
                accessCount: userLogs.length,
                timeRange: {
                  start: userLogs[userLogs.length - 1]?.created_at,
                  end: userLogs[0]?.created_at
                },
                resourceTypes: [...new Set(userLogs.map(l => l.resource_type))]
              },
              timestamp: new Date(),
              hospitalId: userLogs[0]?.hospital_id || ''
            });
          }
        });

        return alerts;
      }
    });

    // Privilege escalation attempts
    this.patterns.push({
      id: 'privilege_escalation',
      name: 'Privilege Escalation',
      description: 'Attempts to access resources beyond user privileges',
      severity: 'critical',
      detectionLogic: (logs) => {
        const alerts: IntrusionAlert[] = [];

        logs.filter(log => log.action === 'access_denied' && log.details?.reason === 'insufficient_permissions').forEach(log => {
          alerts.push({
            id: `privilege-escalation-${log.id}`,
            patternId: 'privilege_escalation',
            severity: 'critical',
            description: `Privilege escalation attempt: ${log.user_id} tried to access ${log.resource_type}`,
            affectedUsers: [log.user_id],
            details: {
              resourceType: log.resource_type,
              resourceId: log.resource_id,
              attemptedAction: log.details?.action
            },
            timestamp: new Date(),
            hospitalId: log.hospital_id
          });
        });

        return alerts;
      }
    });
  }

  async analyzeLogs(hospitalId: string, timeRange: { start: Date; end: Date }): Promise<IntrusionAlert[]> {
    try {
      // Fetch recent audit logs
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      const allAlerts: IntrusionAlert[] = [];

      // Run each pattern detection
      for (const pattern of this.patterns) {
        const patternAlerts = pattern.detectionLogic(logs);
        allAlerts.push(...patternAlerts);
      }

      // Filter out alerts that are in cooldown
      const activeAlerts = allAlerts.filter(alert => {
        const cooldownKey = `${alert.patternId}-${alert.id}`;
        const lastAlert = this.alertCooldowns.get(cooldownKey);

        if (!lastAlert || (Date.now() - lastAlert.getTime()) > 3600000) { // 1 hour cooldown
          this.alertCooldowns.set(cooldownKey, new Date());
          return true;
        }

        return false;
      });

      // Store alerts in database
      if (activeAlerts.length > 0) {
        await this.storeAlerts(activeAlerts);
      }

      return activeAlerts;
    } catch (error) {
      console.error('Error in intrusion detection analysis:', error);
      return [];
    }
  }

  private async storeAlerts(alerts: IntrusionAlert[]): Promise<void> {
    try {
      const alertRecords = alerts.map(alert => ({
        type: alert.patternId,
        severity: alert.severity,
        message: alert.description,
        details: alert.details,
        timestamp: alert.timestamp.toISOString()
      }));

      const { error } = await supabase
        .from('security_alerts')
        .insert(alertRecords);

      if (error) throw error;
    } catch (error) {
      console.error('Error storing security alerts:', error);
    }
  }

  async getActiveAlerts(hospitalId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      return [];
    }
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }
}

export const intrusionDetection = IntrusionDetectionService.getInstance();