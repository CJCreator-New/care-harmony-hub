import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePerformanceMonitoring, SystemHealth } from '@/hooks/usePerformanceMonitoring';
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
                  Uptime: {formatTime(systemHealth.uptime)}
                </span>
                <span className="text-sm text-muted-foreground">
                  Response: {systemHealth.metrics.response_time_ms}ms
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemHealth.services.database === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">Database</span>
                  <Badge variant={systemHealth.services.database === 'healthy' ? 'success' : 'destructive'} className="text-xs">
                    {systemHealth.services.database}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemHealth.services.auth === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">Authentication</span>
                  <Badge variant={systemHealth.services.auth === 'healthy' ? 'success' : 'destructive'} className="text-xs">
                    {systemHealth.services.auth}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    systemHealth.services.storage === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm">Storage</span>
                  <Badge variant={systemHealth.services.storage === 'healthy' ? 'success' : 'destructive'} className="text-xs">
                    {systemHealth.services.storage}
                  </Badge>
                </div>
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
              Page Performance
            </CardTitle>
            <CardDescription>
              Current page load and rendering metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Page Load Time</span>
                    <span className={metrics.pageLoadTime > 3000 ? 'text-red-500' : 'text-green-500'}>
                      {formatTime(metrics.pageLoadTime)}
                    </span>
                  </div>
                  <Progress value={Math.min((metrics.pageLoadTime / 3000) * 100, 100)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>DOM Content Loaded</span>
                    <span className={metrics.domContentLoaded > 2000 ? 'text-yellow-500' : 'text-green-500'}>
                      {formatTime(metrics.domContentLoaded)}
                    </span>
                  </div>
                  <Progress value={Math.min((metrics.domContentLoaded / 2000) * 100, 100)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>First Contentful Paint</span>
                    <span className={metrics.firstContentfulPaint > 2000 ? 'text-yellow-500' : 'text-green-500'}>
                      {formatTime(metrics.firstContentfulPaint)}
                    </span>
                  </div>
                  <Progress value={Math.min((metrics.firstContentfulPaint / 2000) * 100, 100)} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Network Requests:</span>
                    <span className="ml-2 font-medium">{metrics.networkRequests}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Failed Requests:</span>
                    <span className={`ml-2 font-medium ${metrics.failedRequests > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {metrics.failedRequests}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Collecting performance metrics...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>
              Memory usage and system performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics?.memoryUsage ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>{formatBytes(metrics.memoryUsage * 1024 * 1024)}</span>
                  </div>
                  <Progress value={Math.min((metrics.memoryUsage / 100) * 100, 100)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Largest Contentful Paint</span>
                    <span className={metrics.largestContentfulPaint > 2500 ? 'text-red-500' : 'text-green-500'}>
                      {formatTime(metrics.largestContentfulPaint)}
                    </span>
                  </div>
                  <Progress value={Math.min((metrics.largestContentfulPaint / 2500) * 100, 100)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Cumulative Layout Shift</span>
                    <span className={metrics.cumulativeLayoutShift > 0.1 ? 'text-yellow-500' : 'text-green-500'}>
                      {metrics.cumulativeLayoutShift.toFixed(3)}
                    </span>
                  </div>
                  <Progress value={Math.min(metrics.cumulativeLayoutShift * 1000, 100)} className="h-2" />
                </div>
              </>
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