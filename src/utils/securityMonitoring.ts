import { intrusionDetection } from './intrusionDetection';
import { supabase } from '@/integrations/supabase/client';

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  startMonitoring(intervalMinutes: number = 15): void {
    if (this.isRunning) return;

    this.isRunning = true;
    // Only log in development/test environments
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Starting security monitoring with ${intervalMinutes} minute intervals`);
    }

    this.monitoringInterval = setInterval(async () => {
      await this.runSecurityChecks();
    }, intervalMinutes * 60 * 1000);

    // Run initial check
    this.runSecurityChecks();
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Security monitoring stopped');
    }
  }

  private async runSecurityChecks(): Promise<void> {
    try {
      // Only log in development/test environments
      const log = process.env.NODE_ENV === 'production' ? () => {} : console.log;
      log('Running automated security checks...');

      // Get all active hospitals
      const { data: hospitals, error } = await supabase
        .from('hospitals')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;

      const now = new Date();
      const timeRange = {
        start: new Date(now.getTime() - 60 * 60 * 1000), // Last hour
        end: now
      };

      let totalAlerts = 0;

      // Run intrusion detection for each hospital
      for (const hospital of hospitals || []) {
        try {
          const alerts = await intrusionDetection.analyzeLogs(hospital.id, timeRange);
          totalAlerts += alerts.length;

          if (alerts.length > 0) {
            log(`Security alerts detected for ${hospital.name}: ${alerts.length}`);
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`Error checking hospital ${hospital.id}:`, error);
          }
        }
      }

      if (totalAlerts > 0) {
        log(`Security monitoring completed: ${totalAlerts} alerts generated`);
      }

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error in security monitoring:', error);
      }
    }
  }

  async runHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    details: any;
  }> {
    try {
      // Check database connectivity
      const { error: dbError } = await supabase
        .from('audit_logs')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (dbError) {
        return {
          status: 'critical',
          message: 'Database connectivity failed',
          details: { error: dbError.message }
        };
      }

      // Check for recent alerts
      const { data: recentAlerts, error: alertsError } = await supabase
        .from('security_alerts')
        .select('severity')
        .eq('acknowledged', false)
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (alertsError) {
        return {
          status: 'warning',
          message: 'Could not check security alerts',
          details: { error: alertsError.message }
        };
      }

      const criticalAlerts = recentAlerts?.filter(alert => alert.severity === 'critical') || [];
      const highAlerts = recentAlerts?.filter(alert => alert.severity === 'high') || [];

      if (criticalAlerts.length > 0) {
        return {
          status: 'critical',
          message: `${criticalAlerts.length} critical security alerts detected`,
          details: { criticalAlerts: criticalAlerts.length, totalAlerts: recentAlerts?.length }
        };
      }

      if (highAlerts.length > 0) {
        return {
          status: 'warning',
          message: `${highAlerts.length} high-priority security alerts detected`,
          details: { highAlerts: highAlerts.length, totalAlerts: recentAlerts?.length }
        };
      }

      return {
        status: 'healthy',
        message: 'Security monitoring is healthy',
        details: { totalAlerts: recentAlerts?.length || 0 }
      };

    } catch (error) {
      return {
        status: 'critical',
        message: 'Security monitoring health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  isMonitoringActive(): boolean {
    return this.isRunning;
  }
}

export const securityMonitoring = SecurityMonitoringService.getInstance();