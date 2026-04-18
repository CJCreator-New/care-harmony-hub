/**
 * AIMetricsChart - Component to display AI usage metrics and trends
 * Tier 3.2: AI Gateway usage visualization in System Health Dashboard
 */

import { useMemo } from 'react';
import { useAIMetrics } from '@/hooks/useAIMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Zap, DollarSign, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AIMetricsChartProps {
  hospitalId?: string;
  enabled?: boolean;
}

/**
 * AI Metrics Chart Component
 * Displays:
 * - AI calls over time (line chart)
 * - Token usage (line chart)
 * - Cost trend (bar chart)
 * - Cost alert if threshold exceeded
 */
export function AIMetricsChart({ enabled = true }: AIMetricsChartProps) {
  const { metrics, stats, isLoading, error, refetch } = useAIMetrics(enabled);

  // Transform metrics for charting
  const chartData = useMemo(() => {
    return metrics
      .map(m => ({
        timestamp: new Date(m.measured_at).toLocaleTimeString(),
        calls: m.ai_calls_count,
        tokens: Math.floor(m.ai_tokens_used / 100), // Scale for visibility
        cost: parseFloat(m.ai_cost_estimate.toFixed(2)),
        responseTime: m.response_time_ms,
      }))
      .reverse(); // Chronological order
  }, [metrics]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!stats) return null;
    return {
      avgCostPerCall: stats.total_calls_today > 0 
        ? (stats.total_cost_today / stats.total_calls_today).toFixed(4)
        : '0.0000',
      avgCostPerToken: stats.total_tokens_today > 0
        ? (stats.total_cost_today / stats.total_tokens_today).toFixed(6)
        : '0.000000',
      percentOfBudget: (
        (stats.total_cost_today / stats.cost_alert_threshold * 100)
      ).toFixed(1),
    };
  }, [stats]);

  if (!enabled) return null;

  return (
    <div className="space-y-4">
      {/* Cost Alert */}
      {stats?.cost_alert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ AI usage cost alert: ${stats.total_cost_today.toFixed(2)} exceeds threshold of ${stats.cost_alert_threshold.toFixed(2)}
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_calls_today || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: ${summary?.avgCostPerCall} per call
            </p>
          </CardContent>
        </Card>

        {/* Total Tokens Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_tokens_today.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: ${summary?.avgCostPerToken} per token
            </p>
          </CardContent>
        </Card>

        {/* Total Cost Card */}
        <Card className={stats?.cost_alert ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {stats?.total_cost_today.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.percentOfBudget}% of budget
            </p>
          </CardContent>
        </Card>

        {/* Response Time Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.average_response_time_ms || 0}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Performance metric</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="space-y-4">
          {/* Calls and Tokens Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                AI Usage Trend
              </CardTitle>
              <CardDescription>Calls and tokens used over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="calls"
                    stroke="#3b82f6"
                    name="API Calls"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tokens"
                    stroke="#10b981"
                    name="Tokens (÷100)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Usage Cost
              </CardTitle>
              <CardDescription>Estimated cost per measurement</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cost" fill="#ef4444" name="Cost ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Loading AI metrics...</div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">No AI usage data available yet</div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error loading metrics: {error.message}</AlertDescription>
        </Alert>
      )}

      {/* Refresh Button */}
      <Button
        onClick={refetch}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {isLoading ? 'Refreshing...' : 'Refresh Metrics'}
      </Button>

      {/* Configuration Notice */}
      <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
        📊 AI metrics are tracked automatically when AI features are used. Cost threshold can be configured via environment variable: VITE_AI_COST_ALERT_THRESHOLD
      </div>
    </div>
  );
}
