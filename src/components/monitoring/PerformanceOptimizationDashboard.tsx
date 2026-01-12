import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { Activity, AlertTriangle, Database, Zap, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PerformanceOptimizationDashboard = () => {
  const { metrics, errors, optimizeDatabase, isOptimizing } = usePerformanceMonitoring();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  const criticalMetrics = metrics.filter(m => m.status === 'critical');
  const warningMetrics = metrics.filter(m => m.status === 'warning');
  const avgResponseTime = metrics
    .filter(m => m.metric_type === 'query_time')
    .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600" />
            Performance Optimization Dashboard
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">{criticalMetrics.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{warningMetrics.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(avgResponseTime)}ms
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Errors</p>
                <p className="text-2xl font-bold text-purple-600">{errors.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Performance Metrics
              </span>
              <Button 
                onClick={() => optimizeDatabase()}
                disabled={isOptimizing}
                size="sm"
              >
                <Database className="h-4 w-4 mr-2" />
                {isOptimizing ? 'Optimizing...' : 'Optimize DB'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {metrics.slice(0, 20).map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{metric.metric_name}</p>
                    <p className="text-sm text-gray-600">{metric.metric_type}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(metric.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusColor(metric.status)}>
                      {metric.status.toUpperCase()}
                    </Badge>
                    <p className="text-sm mt-1">
                      {metric.metric_type === 'query_time' ? `${Math.round(metric.value)}ms` : metric.value}
                    </p>
                    {metric.threshold && (
                      <p className="text-xs text-gray-500">
                        Threshold: {metric.threshold}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {metrics.length === 0 && (
                <p className="text-gray-500 text-center py-8">No performance metrics available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Active Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {errors.map((error) => (
                <div key={error.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-red-600">{error.error_type}</h4>
                      <p className="text-sm text-gray-600 mt-1">{error.error_message}</p>
                    </div>
                    <Badge variant={getSeverityColor(error.severity)}>
                      {error.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(error.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
              {errors.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-green-600 mb-2">
                    <Zap className="h-8 w-8 mx-auto" />
                  </div>
                  <p className="text-green-600 font-medium">No active errors</p>
                  <p className="text-sm text-gray-500">System is running smoothly</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Optimizations Active</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Lazy loading for all components</li>
                <li>• Database query optimization</li>
                <li>• Real-time performance monitoring</li>
                <li>• Comprehensive error tracking</li>
                <li>• Pagination for large datasets</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">💡 Recommendations</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Run database optimization weekly</li>
                <li>• Monitor critical metrics daily</li>
                <li>• Address warnings promptly</li>
                <li>• Review error logs regularly</li>
                <li>• Update indexes as data grows</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceOptimizationDashboard;