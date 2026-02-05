import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target
} from 'lucide-react';
import { useTesting } from '../../../contexts/TestingContext';
import { TestCategoryType } from '../../../types/testing';
import { ChartSkeleton, useRecharts } from '@/components/ui/lazy-chart';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function ReportsDashboard() {
  const { state } = useTesting();
  const { categories, executionResults } = state;
  const { components: Recharts, loading: rechartsLoading } = useRecharts();

  // Calculate overall metrics
  const totalTests = categories.reduce((sum, cat) => sum + cat.testCases.length, 0);
  const completedTests = categories.reduce((sum, cat) =>
    sum + cat.testCases.filter(tc => tc.status !== 'Not Started' && tc.status !== 'N/A').length, 0
  );
  const passedTests = categories.reduce((sum, cat) =>
    sum + cat.testCases.filter(tc => tc.status === 'Passed').length, 0
  );
  const failedTests = categories.reduce((sum, cat) =>
    sum + cat.testCases.filter(tc => tc.status === 'Failed').length, 0
  );
  const blockedTests = categories.reduce((sum, cat) =>
    sum + cat.testCases.filter(tc => tc.status === 'Blocked').length, 0
  );

  const completionRate = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
  const passRate = completedTests > 0 ? (passedTests / completedTests) * 100 : 0;

  // Category-wise data for charts
  const categoryData = categories.map(cat => ({
    name: cat.name.split(' ')[0], // Shorten names for chart
    total: cat.testCases.length,
    completed: cat.testCases.filter(tc => tc.status !== 'Not Started' && tc.status !== 'N/A').length,
    passed: cat.testCases.filter(tc => tc.status === 'Passed').length,
    failed: cat.testCases.filter(tc => tc.status === 'Failed').length,
    blocked: cat.testCases.filter(tc => tc.status === 'Blocked').length,
  }));

  // Status distribution for pie chart
  const statusData = [
    { name: 'Passed', value: passedTests, color: '#00C49F' },
    { name: 'Failed', value: failedTests, color: '#FF8042' },
    { name: 'Blocked', value: blockedTests, color: '#FFBB28' },
    { name: 'Not Started', value: totalTests - completedTests, color: '#8884D8' },
  ].filter(item => item.value > 0);

  // Execution trend data (mock data for now - in real app, this would be calculated from execution history)
  const executionTrendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    return last30Days.map(date => {
      const executionsOnDate = executionResults.filter(
        exec => exec.runAt.toISOString().split('T')[0] === date
      );

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        executions: executionsOnDate.length,
        passed: executionsOnDate.filter(e => e.status === 'Passed').length,
        failed: executionsOnDate.filter(e => e.status === 'Failed').length,
      };
    });
  }, [executionResults]);

  // Velocity metrics
  const velocityData = useMemo(() => {
    const weeklyData = [];
    for (let i = 4; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekExecutions = executionResults.filter(
        exec => exec.runAt >= weekStart && exec.runAt <= weekEnd
      );

      weeklyData.push({
        week: `Week ${5 - i}`,
        completed: weekExecutions.length,
        passed: weekExecutions.filter(e => e.status === 'Passed').length,
        failed: weekExecutions.filter(e => e.status === 'Failed').length,
      });
    }
    return weeklyData;
  }, [executionResults]);

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTests,
        completedTests,
        passedTests,
        failedTests,
        blockedTests,
        completionRate: `${completionRate.toFixed(1)}%`,
        passRate: `${passRate.toFixed(1)}%`,
      },
      categoryBreakdown: categoryData,
      executionTrend: executionTrendData,
      velocityMetrics: velocityData,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testing-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Testing Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into testing progress and performance
          </p>
        </div>
        <Button onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold text-green-600">{passRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                <p className="text-2xl font-bold">{totalTests}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Executions</p>
                <p className="text-2xl font-bold">{executionResults.length}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Test Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {rechartsLoading || !Recharts ? (
              <ChartSkeleton />
            ) : (
              <Recharts.ResponsiveContainer width="100%" height={300}>
                <Recharts.PieChart>
                  <Recharts.Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Recharts.Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Progress Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Progress by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {rechartsLoading || !Recharts ? (
              <ChartSkeleton />
            ) : (
              <Recharts.ResponsiveContainer width="100%" height={300}>
                <Recharts.BarChart data={categoryData}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis dataKey="name" />
                  <Recharts.YAxis />
                  <Recharts.Tooltip />
                  <Recharts.Legend />
                  <Recharts.Bar dataKey="passed" stackId="a" fill="#00C49F" name="Passed" />
                  <Recharts.Bar dataKey="failed" stackId="a" fill="#FF8042" name="Failed" />
                  <Recharts.Bar dataKey="blocked" stackId="a" fill="#FFBB28" name="Blocked" />
                  <Recharts.Bar dataKey="completed" stackId="b" fill="#8884D8" name="In Progress" />
                </Recharts.BarChart>
              </Recharts.ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Execution Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {rechartsLoading || !Recharts ? (
              <ChartSkeleton />
            ) : (
              <Recharts.ResponsiveContainer width="100%" height={300}>
                <Recharts.AreaChart data={executionTrendData}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis dataKey="date" />
                  <Recharts.YAxis />
                  <Recharts.Tooltip />
                  <Recharts.Legend />
                  <Recharts.Area
                    type="monotone"
                    dataKey="executions"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Total Executions"
                  />
                  <Recharts.Area
                    type="monotone"
                    dataKey="passed"
                    stackId="2"
                    stroke="#00C49F"
                    fill="#00C49F"
                    name="Passed"
                  />
                </Recharts.AreaChart>
              </Recharts.ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Velocity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            {rechartsLoading || !Recharts ? (
              <ChartSkeleton />
            ) : (
              <Recharts.ResponsiveContainer width="100%" height={300}>
                <Recharts.LineChart data={velocityData}>
                  <Recharts.CartesianGrid strokeDasharray="3 3" />
                  <Recharts.XAxis dataKey="week" />
                  <Recharts.YAxis />
                  <Recharts.Tooltip />
                  <Recharts.Legend />
                  <Recharts.Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Completed"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="passed"
                    stroke="#00C49F"
                    strokeWidth={2}
                    name="Passed"
                  />
                  <Recharts.Line
                    type="monotone"
                    dataKey="failed"
                    stroke="#FF8042"
                    strokeWidth={2}
                    name="Failed"
                  />
                </Recharts.LineChart>
              </Recharts.ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Category Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => {
              const catData = categoryData.find(d => d.name === category.name.split(' ')[0]);
              if (!catData || catData.total === 0) return null;

              const catCompletionRate = (catData.completed / catData.total) * 100;
              const catPassRate = catData.completed > 0 ? (catData.passed / catData.completed) * 100 : 0;

              return (
                <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{category.name}</h4>
                      <Badge variant="outline">{catData.total} tests</Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Completed: {catData.completed}/{catData.total} ({catCompletionRate.toFixed(1)}%)</span>
                      <span>Pass Rate: {catPassRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      {catData.passed} Passed
                    </Badge>
                    <Badge className="bg-red-100 text-red-800">
                      {catData.failed} Failed
                    </Badge>
                    {catData.blocked > 0 && (
                      <Badge className="bg-orange-100 text-orange-800">
                        {catData.blocked} Blocked
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Release Readiness Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Release Readiness Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${completionRate >= 90 ? 'text-green-600' : completionRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {completionRate >= 90 ? '🟢' : completionRate >= 70 ? '🟡' : '🔴'}
                </div>
                <div className="text-sm text-muted-foreground">Test Completion</div>
                <div className="text-lg font-semibold">{completionRate.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${passRate >= 95 ? 'text-green-600' : passRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {passRate >= 95 ? '🟢' : passRate >= 80 ? '🟡' : '🔴'}
                </div>
                <div className="text-sm text-muted-foreground">Quality Score</div>
                <div className="text-lg font-semibold">{passRate.toFixed(1)}%</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${blockedTests === 0 ? 'text-green-600' : blockedTests <= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {blockedTests === 0 ? '🟢' : blockedTests <= 2 ? '🟡' : '🔴'}
                </div>
                <div className="text-sm text-muted-foreground">Blockers</div>
                <div className="text-lg font-semibold">{blockedTests}</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Assessment Summary</h4>
              <p className="text-sm text-muted-foreground">
                {completionRate >= 90 && passRate >= 95 && blockedTests === 0
                  ? "🎉 Excellent! The application is ready for release with high confidence."
                  : completionRate >= 80 && passRate >= 85
                  ? "✅ Good progress. Minor issues remain but release is feasible."
                  : "⚠️ Additional testing required. Critical issues need attention before release."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
