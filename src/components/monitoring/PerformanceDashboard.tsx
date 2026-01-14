import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePerformanceMonitoring, type SystemHealth } from '@/hooks/usePerformanceMonitoring';
import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const { metrics, systemHealth, checkSystemHealth } = usePerformanceMonitoring();
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);

  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    await checkSystemHealth();
    setLastHealthCheck(new Date());
    setIsCheckingHealth(false);
  };

  useEffect(() => {
    // Auto-check health on mount
    handleHealthCheck();
  }, []);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'destructive';
      default: return 'secondary';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy': return <XCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Performance</h2>
          <p className="text-muted-foreground">Monitor application health and performance metrics</p>
        </div>
        <Button onClick={handleHealthCheck} disabled={isCheckingHealth} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          {isCheckingHealth ? 'Checking...' : 'Check Health'}
        </Button>
      </div>

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {systemHealth && getHealthStatusIcon(systemHealth.status)}
            System Health
          </CardTitle>
          <CardDescription>
            Overall system status and service availability
            {lastHealthCheck && (
              <span className="ml-2 text-xs">
                Last checked: {format(lastHealthCheck, 'HH:mm:ss')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemHealth ? (
            <>
              <div className="flex items-center gap-4">
                <Badge variant={getHealthStatusColor(systemHealth.status) as any} className="text-sm">
                  {systemHealth.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Uptime: {systemHealth.uptime}%
                </span>
                <span className="text-sm text-muted-foreground">
                  Response: {systemHealth.response_time}ms
                </span>
                <span className="text-sm text-muted-foreground">
                  Error Rate: {systemHealth.error_rate}%
                </span>
              </div>

              {systemHealth.status !== 'healthy' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    System is experiencing issues. Some services may be unavailable.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No health data available</p>
              <Button onClick={handleHealthCheck} className="mt-4" disabled={isCheckingHealth}>
                Check System Health
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>
              Recent system performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics && metrics.length > 0 ? (
              <div className="space-y-3">
                {metrics.slice(0, 5).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{metric.metric_name}</p>
                      <p className="text-xs text-muted-foreground">{metric.metric_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{metric.value.toFixed(2)}</p>
                      <Badge variant={metric.status === 'good' ? 'default' : metric.status === 'warning' ? 'secondary' : 'destructive'} className="text-xs">
                        {metric.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No performance metrics available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>
              Database and system health indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemHealth ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm font-medium">System Status</span>
                  <Badge variant={systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
                    {systemHealth.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm font-medium">Uptime</span>
                  <span className="font-bold">{systemHealth.uptime}%</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm font-medium">Avg Response Time</span>
                  <span className="font-bold">{systemHealth.response_time}ms</span>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <span className="text-sm font-medium">Error Rate</span>
                  <span className={`font-bold ${systemHealth.error_rate > 1 ? 'text-red-500' : 'text-green-500'}`}>
                    {systemHealth.error_rate}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Resource metrics not available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}