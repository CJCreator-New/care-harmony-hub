import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Server,
  Users,
  Zap,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subHours, subDays } from 'date-fns';

interface SystemMetrics {
  uptime: number;
  responseTime: number;
  errorRate: number;
  activeUsers: number;
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface ErrorSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  recentErrors: Array<{
    id: string;
    message: string;
    level: 'critical' | 'warning' | 'info';
    timestamp: string;
    userId?: string;
  }>;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  slowestEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    callCount: number;
  }>;
  databaseQueryPerformance: Array<{
    query: string;
    averageTime: number;
    callCount: number;
  }>;
}

export default function MonitoringDashboard() {
  const { hospital } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');

  // System metrics query
  const { data: systemMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['system-metrics', hospital?.id, timeRange],
    queryFn: async (): Promise<SystemMetrics> => {
      if (!hospital?.id) return {} as SystemMetrics;

      // Mock data - in production, this would come from monitoring service
      return {
        uptime: 99.9,
        responseTime: 245,
        errorRate: 0.02,
        activeUsers: 47,
        databaseConnections: 12,
        memoryUsage: 68,
        cpuUsage: 34,
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: refreshInterval,
  });

  // Error summary query
  const { data: errorSummary, isLoading: errorsLoading, refetch: refetchErrors } = useQuery({
    queryKey: ['error-summary', hospital?.id, timeRange],
    queryFn: async (): Promise<ErrorSummary> => {
      if (!hospital?.id) return {} as ErrorSummary;

      // Get recent errors from activity logs
      const timeFilter = timeRange === '1h' ? subHours(new Date(), 1) :
                        timeRange === '24h' ? subDays(new Date(), 1) :
                        subDays(new Date(), 7);

      const { data: errors } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('action_type', 'error')
        .gte('created_at', timeFilter.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        total: errors?.length || 0,
        critical: errors?.filter(e => e.details?.severity === 'critical').length || 0,
        warning: errors?.filter(e => e.details?.severity === 'warning').length || 0,
        info: errors?.filter(e => e.details?.severity === 'info').length || 0,
        recentErrors: errors?.map(e => ({
          id: e.id,
          message: e.details?.message || 'Unknown error',
          level: e.details?.severity || 'info',
          timestamp: e.created_at,
          userId: e.user_id,
        })) || [],
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: refreshInterval,
  });

  // Performance metrics query
  const { data: performanceMetrics, isLoading: performanceLoading } = useQuery({
    queryKey: ['performance-metrics', hospital?.id, timeRange],
    queryFn: async (): Promise<PerformanceMetrics> => {
      if (!hospital?.id) return {} as PerformanceMetrics;

      // Mock performance data - in production, integrate with APM
      return {
        averageResponseTime: 245,
        slowestEndpoints: [
          { endpoint: '/api/patients/search', averageTime: 1200, callCount: 45 },
          { endpoint: '/api/appointments', averageTime: 890, callCount: 123 },
          { endpoint: '/api/reports/generate', averageTime: 2100, callCount: 12 },
        ],
        databaseQueryPerformance: [
          { query: 'SELECT patients WHERE hospital_id = ?', averageTime: 45, callCount: 234 },
          { query: 'SELECT appointments WITH patient JOIN', averageTime: 78, callCount: 156 },
          { query: 'INSERT consultation_notes', averageTime: 23, callCount: 89 },
        ],
      };
    },
    enabled: !!hospital?.id,
    refetchInterval: refreshInterval,
  });

  const handleRefresh = () => {
    refetchMetrics();
    refetchErrors();
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getErrorBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time performance and error monitoring for CareSync HMS
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemMetrics?.uptime || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              99.9% target uptime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(systemMetrics?.responseTime || 0, { good: 500, warning: 1000 })}`}>
              {systemMetrics?.responseTime || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 500ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor((systemMetrics?.errorRate || 0) * 100, { good: 0.1, warning: 1 })}`}>
              {(systemMetrics?.errorRate || 0).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Target: &lt; 0.1%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Error Monitoring</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        {/* Error Monitoring Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Critical Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {errorSummary?.critical || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {errorSummary?.warning || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  Info Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {errorSummary?.info || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  Total Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {errorSummary?.total || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors & Events</CardTitle>
              <CardDescription>
                Latest system events and errors from the last {timeRange}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {errorSummary?.recentErrors?.map((error) => (
                  <div key={error.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getErrorBadgeVariant(error.level)}>
                          {error.level.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(error.timestamp), 'MMM dd, HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm">{error.message}</p>
                      {error.userId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          User: {error.userId}
                        </p>
                      )}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No errors reported in the selected time range</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Slowest Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Slowest API Endpoints
                </CardTitle>
                <CardDescription>Endpoints with highest average response times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics?.slowestEndpoints?.map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{endpoint.endpoint}</p>
                        <p className="text-xs text-muted-foreground">
                          {endpoint.callCount} calls
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          endpoint.averageTime > 1000 ? 'text-red-600' :
                          endpoint.averageTime > 500 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {endpoint.averageTime}ms
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Database Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Query Performance
                </CardTitle>
                <CardDescription>Slowest database queries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics?.databaseQueryPerformance?.map((query, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate" title={query.query}>
                          {query.query.length > 40 ? `${query.query.substring(0, 40)}...` : query.query}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {query.callCount} executions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          query.averageTime > 100 ? 'text-red-600' :
                          query.averageTime > 50 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {query.averageTime}ms
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Resources Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics?.memoryUsage || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${systemMetrics?.memoryUsage || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics?.cpuUsage || 0}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${systemMetrics?.cpuUsage || 0}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Database Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics?.databaseConnections || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active connections
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Database Health</AlertTitle>
            <AlertDescription>
              Database monitoring and health metrics will be displayed here.
              Integration with database monitoring tools (like pg_stat_statements)
              will provide detailed query performance and connection metrics.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Pool Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Real-time connection pool monitoring will be implemented here.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detailed query performance metrics and slow query analysis.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}