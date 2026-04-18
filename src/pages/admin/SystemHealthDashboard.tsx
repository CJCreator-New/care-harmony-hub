/**
 * System Health Dashboard
 * Admin-only component for monitoring system status, service health, and metrics
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AIMetricsChart } from '@/components/admin/AIMetricsChart';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: 'healthy' | 'unhealthy';
    auth: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  external_apis?: {
    lovable_ai?: 'healthy' | 'unhealthy' | 'untested';
    email_service?: 'healthy' | 'unhealthy' | 'untested';
  };
  metrics: {
    response_time_ms: number;
    memory_usage_mb: number;
  };
}

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 text-green-800';
    case 'degraded':
      return 'bg-yellow-100 text-yellow-800';
    case 'unhealthy':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'degraded':
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    case 'unhealthy':
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    default:
      return null;
  }
};

export function SystemHealthDashboard() {
  const { profile } = useAuth();
  const { hasPermission } = usePermissions();
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isAdmin = hasPermission(['admin']);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/functions/v1/health-check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: HealthCheckResponse = await response.json();
      setHealth(data);
      setLastRefresh(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch health status';
      toast.error(`Health check failed: ${message}`);
      console.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isAdmin) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Access denied. Admin role required to view system health.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor system status and service health</p>
        </div>
        <Button onClick={fetchHealth} disabled={loading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {health && (
        <>
          {/* Overall Status Card */}
          <Card className={getStatusBadgeColor(health.status)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(health.status)}
                  <div>
                    <CardTitle>Overall System Status</CardTitle>
                    <CardDescription>
                      Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusBadgeColor(health.status)}>
                  {health.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Alert if degraded or unhealthy */}
          {health.status !== 'healthy' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                System status is {health.status}. Please check individual services below.
              </AlertDescription>
            </Alert>
          )}

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Database</CardTitle>
                  <Badge className={getStatusBadgeColor(health.services.database)}>
                    {health.services.database}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.database)}
                  <span>
                    {health.services.database === 'healthy'
                      ? 'Database connection is stable'
                      : 'Database connection issues detected'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Auth Service */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Authentication</CardTitle>
                  <Badge className={getStatusBadgeColor(health.services.auth)}>
                    {health.services.auth}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.auth)}
                  <span>
                    {health.services.auth === 'healthy'
                      ? 'Auth service is operational'
                      : 'Auth service issues detected'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Storage Service */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Storage</CardTitle>
                  <Badge className={getStatusBadgeColor(health.services.storage)}>
                    {health.services.storage}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.storage)}
                  <span>
                    {health.services.storage === 'healthy'
                      ? 'Storage service is operational'
                      : 'Storage service issues detected'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Lovable AI */}
            {health.external_apis?.lovable_ai && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Lovable AI</CardTitle>
                    <Badge
                      className={getStatusBadgeColor(
                        health.external_apis.lovable_ai || 'untested'
                      )}
                    >
                      {health.external_apis.lovable_ai || 'untested'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.external_apis.lovable_ai || 'untested')}
                    <span>
                      {health.external_apis.lovable_ai === 'healthy'
                        ? 'Lovable AI API is reachable'
                        : health.external_apis.lovable_ai === 'untested'
                          ? 'Lovable AI not configured'
                          : 'Lovable AI API issues detected'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email Service */}
            {health.external_apis?.email_service && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Email Service</CardTitle>
                    <Badge
                      className={getStatusBadgeColor(
                        health.external_apis.email_service || 'untested'
                      )}
                    >
                      {health.external_apis.email_service || 'untested'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(health.external_apis.email_service || 'untested')}
                    <span>
                      {health.external_apis.email_service === 'healthy'
                        ? 'Email service is operational'
                        : health.external_apis.email_service === 'untested'
                          ? 'Email service not configured'
                          : 'Email service issues detected'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Response Time</p>
                  <p className="text-2xl font-bold">{health.metrics.response_time_ms}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Memory Usage</p>
                  <p className="text-2xl font-bold">{health.metrics.memory_usage_mb}MB</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Uptime</p>
                  <p className="text-2xl font-bold">
                    {Math.round(health.uptime / 1000)}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Metrics Section - Tier 3.2 */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">AI Gateway Metrics</h2>
            <AIMetricsChart enabled={true} />
          </div>
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  );
}

export default SystemHealthDashboard;
