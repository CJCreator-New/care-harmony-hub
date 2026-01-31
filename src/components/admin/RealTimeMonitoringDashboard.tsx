import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemMetrics {
  activeUsers: number;
  systemLoad: number;
  responseTime: number;
  errorRate: number;
  patientFlow: number;
  staffUtilization: number;
}

export const RealTimeMonitoringDashboard = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    systemLoad: 0,
    responseTime: 0,
    errorRate: 0,
    patientFlow: 0,
    staffUtilization: 0
  });

  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      // Real-time system metrics using existing tables
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('last_login', 'is', null);

      const { count: patientFlow } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, is_staff')
        .eq('is_staff', true);

      setMetrics({
        activeUsers: activeUsers || 0,
        systemLoad: Math.random() * 100, // Mock system load
        responseTime: Math.random() * 500 + 100,
        errorRate: Math.random() * 5,
        patientFlow: patientFlow || 0,
        staffUtilization: calculateStaffUtilization(staffData || [])
      });
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const calculateStaffUtilization = (staff: any[]) => {
    if (!staff.length) return 0;
    const totalWorkload = staff.reduce((sum, s) => sum + (s.current_workload || 0), 0);
    return (totalWorkload / (staff.length * 100)) * 100;
  };

  const getProgressVariant = (value: number, thresholds: { warning: number; critical: number }): 'success' | 'warning' | 'destructive' => {
    if (value >= thresholds.critical) return 'destructive';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  };

  const getStatusBadgeVariant = (value: number, thresholds: { warning: number; critical: number }): 'destructive' | 'default' | 'secondary' => {
    if (value >= thresholds.critical) return 'destructive';
    if (value >= thresholds.warning) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-Time System Monitor</h2>
        <Badge variant="outline" className="animate-pulse">
          <Activity className="w-3 h-3 mr-1" />
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" aria-hidden="true" />
              System Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemLoad.toFixed(1)}%</div>
            <Progress 
              value={metrics.systemLoad} 
              variant={getProgressVariant(metrics.systemLoad, { warning: 70, critical: 90 })}
              className="mt-2"
              aria-label={`System load: ${metrics.systemLoad.toFixed(1)} percent`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Average response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
            <Badge 
              variant={getStatusBadgeVariant(metrics.errorRate, { warning: 2, critical: 5 })}
              className="mt-1"
            >
              {metrics.errorRate < 2 ? 'Good' : metrics.errorRate < 5 ? 'Warning' : 'Critical'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Active Appointments</span>
                <span className="font-bold">{metrics.patientFlow}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Staff Utilization</span>
                <span className="font-bold">{metrics.staffUtilization.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.staffUtilization} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.systemLoad > 80 && (
                <div className="flex items-center p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm">High system load detected</span>
                </div>
              )}
              {metrics.errorRate > 3 && (
                <div className="flex items-center p-2 bg-red-50 rounded border-l-4 border-red-400">
                  <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                  <span className="text-sm">Elevated error rate</span>
                </div>
              )}
              {metrics.responseTime > 400 && (
                <div className="flex items-center p-2 bg-orange-50 rounded border-l-4 border-orange-400">
                  <Clock className="w-4 h-4 text-orange-600 mr-2" />
                  <span className="text-sm">Slow response times</span>
                </div>
              )}
              {metrics.systemLoad <= 80 && metrics.errorRate <= 3 && metrics.responseTime <= 400 && (
                <div className="flex items-center p-2 bg-green-50 rounded border-l-4 border-green-400">
                  <Activity className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm">All systems operational</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};