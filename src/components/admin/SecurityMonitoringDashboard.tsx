import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Eye, Lock, Smartphone, Clock } from 'lucide-react';
import { securityMonitoring } from '@/utils/securityMonitoring';
import { intrusionDetection } from '@/utils/intrusionDetection';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SecurityEvent {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  hospital_id?: string;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  activeDevices: number;
  failedLogins: number;
  suspiciousActivities: number;
  intrusionAlerts: number;
}

interface IntrusionAlert {
  id: string;
  patternId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: string[];
  details: any;
  timestamp: Date;
  hospitalId: string;
}

export function SecurityMonitoringDashboard() {
  const { user, hospital } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const hospitalId = hospital?.id;

  // Fetch security events
  const { data: securityEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['security-events', hospitalId, selectedTimeframe],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (selectedTimeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('hospital_id', hospitalId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SecurityEvent[];
    },
    enabled: !!hospitalId,
  });

  // Security system health check
  const { data: healthStatus, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['security-health'],
    queryFn: async () => {
      return await securityMonitoring.runHealthCheck();
    },
    refetchInterval: 300000, // Check every 5 minutes
  });
  const { data: intrusionAlerts, isLoading: intrusionLoading } = useQuery({
    queryKey: ['intrusion-alerts', hospitalId, selectedTimeframe],
    queryFn: async () => {
      if (!hospitalId) return [];

      const now = new Date();
      let startDate: Date;

      switch (selectedTimeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Run intrusion detection analysis
      const alerts = await intrusionDetection.analyzeLogs(hospitalId, {
        start: startDate,
        end: now
      });

      return alerts;
    },
    enabled: !!hospitalId,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
  // Security statistics
  const { data: securityStats, isLoading: statsLoading } = useQuery({
    queryKey: ['security-stats', hospitalId, selectedTimeframe],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (selectedTimeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get total events
      const { count: totalEvents } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .gte('created_at', startDate.toISOString());

      // Get critical events
      const { count: criticalEvents } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .eq('severity', 'critical')
        .gte('created_at', startDate.toISOString());

      // Get active devices (count unique user_agents in recent logs)
      const { data: recentLogs } = await supabase
        .from('audit_logs')
        .select('user_agent')
        .eq('hospital_id', hospitalId)
        .gte('created_at', startDate.toISOString());

      const activeDevices = new Set(recentLogs?.map(log => log.user_agent).filter(Boolean)).size;

      // Get failed logins (access_denied actions)
      const { count: failedLogins } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .eq('action', 'access_denied')
        .gte('created_at', startDate.toISOString());

      // Get suspicious activities (high/critical severity)
      const { count: suspiciousActivities } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospitalId)
        .in('severity', ['high', 'critical'])
        .gte('created_at', startDate.toISOString());

      return {
        totalEvents: totalEvents || 0,
        criticalEvents: criticalEvents || 0,
        activeDevices: activeDevices || 0,
        failedLogins: failedLogins || 0,
        suspiciousActivities: suspiciousActivities || 0,
        intrusionAlerts: intrusionAlerts?.length || 0,
      } as SecurityStats;
    },
    enabled: !!hospitalId,
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEventIcon = (action: string) => {
    switch (action) {
      case 'access_denied':
        return <Lock className="h-4 w-4" />;
      case 'access_granted':
        return <Shield className="h-4 w-4" />;
      case 'data_access':
        return <Eye className="h-4 w-4" />;
      case 'data_modify':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const handleRunIntrusionDetection = async () => {
    if (!hospitalId) return;

    try {
      toast.info('Running intrusion detection analysis...');
      const now = new Date();
      const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const alerts = await intrusionDetection.analyzeLogs(hospitalId, {
        start: startDate,
        end: now
      });

      if (alerts.length > 0) {
        toast.success(`Found ${alerts.length} potential security threats`);
      } else {
        toast.success('No security threats detected');
      }
    } catch (error) {
      console.error('Error running intrusion detection:', error);
      toast.error('Failed to run intrusion detection');
    }
  };
  const handleClearEvents = async () => {
    if (!hospitalId) return;

    try {
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .eq('hospital_id', hospitalId)
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Older than 30 days

      if (error) throw error;

      toast.success('Old audit logs cleared successfully');
    } catch (error) {
      console.error('Error clearing audit logs:', error);
      toast.error('Failed to clear audit logs');
    }
  };

  const { roles } = useAuth();
  if (!roles.includes('admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Monitoring Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor audit logs and security access patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedTimeframe === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeframe('24h')}
          >
            24h
          </Button>
          <Button
            variant={selectedTimeframe === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeframe('7d')}
          >
            7d
          </Button>
          <Button
            variant={selectedTimeframe === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeframe('30d')}
          >
            30d
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className={`h-5 w-5 ${
                healthStatus?.status === 'healthy' ? 'text-green-500' :
                healthStatus?.status === 'warning' ? 'text-yellow-500' : 'text-red-500'
              }`} />
              System Health
            </CardTitle>
            <CardDescription>
              Overall security system status and monitoring health
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Checking system health...</span>
            </div>
          ) : healthStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={
                  healthStatus.status === 'healthy' ? 'default' :
                  healthStatus.status === 'warning' ? 'secondary' : 'destructive'
                }>
                  {healthStatus.status.toUpperCase()}
                </Badge>
                <span className="text-sm">{healthStatus.message}</span>
              </div>
              {healthStatus.details && (
                <div className="text-xs text-muted-foreground">
                  <details>
                    <summary className="cursor-pointer">Health Details</summary>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {JSON.stringify(healthStatus.details, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to check system health</p>
          )}
        </CardContent>
      </Card>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : securityStats?.totalEvents || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {statsLoading ? '...' : securityStats?.criticalEvents || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : securityStats?.activeDevices || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : securityStats?.failedLogins || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activity</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : securityStats?.suspiciousActivities || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intrusion Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {intrusionLoading ? '...' : intrusionAlerts?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>
              Recent audit logs and security activities
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleClearEvents}>
            Clear Old Logs
          </Button>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : securityEvents && securityEvents.length > 0 ? (
            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getEventIcon(event.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">
                        {event.action.replace('_', ' ').toUpperCase()} on {event.resource_type}
                        {event.resource_id && ` (${event.resource_id.slice(0, 8)}...)`}
                      </p>
                      <Badge variant={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(event.created_at).toLocaleString()}</span>
                      </span>
                      {event.ip_address && (
                        <span>IP: {event.ip_address}</span>
                      )}
                      {event.user_agent && (
                        <span>Agent: {event.user_agent.slice(0, 20)}...</span>
                      )}
                    </div>
                    {event.details && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <details>
                          <summary className="cursor-pointer">Details</summary>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Intrusion Detection Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Intrusion Detection</CardTitle>
            <CardDescription>
              AI-powered analysis of suspicious patterns and security threats
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRunIntrusionDetection}>
            Run Analysis
          </Button>
        </CardHeader>
        <CardContent>
          {intrusionLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Analyzing security patterns...</p>
            </div>
          ) : intrusionAlerts && intrusionAlerts.length > 0 ? (
            <div className="space-y-4">
              {intrusionAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-orange-50 border-orange-200">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-orange-900">{alert.description}</p>
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {alert.patternId.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-orange-700">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{alert.timestamp.toLocaleString()}</span>
                      </span>
                      {alert.affectedUsers.length > 0 && (
                        <span>{alert.affectedUsers.length} affected user(s)</span>
                      )}
                    </div>
                    {alert.details && (
                      <div className="mt-2 text-xs text-orange-700">
                        <details>
                          <summary className="cursor-pointer">Technical Details</summary>
                          <pre className="mt-1 whitespace-pre-wrap text-xs">
                            {JSON.stringify(alert.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No intrusion alerts detected</p>
            </div>
          )}
        </CardContent>
      </Card></content>
<parameter name="filePath">c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub\src\components\admin\SecurityMonitoringDashboard.tsx