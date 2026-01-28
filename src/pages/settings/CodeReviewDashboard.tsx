/**
 * CareSync Code Review Dashboard
 * Web interface for viewing and managing code review results
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import { CodeReviewReport, CodeReviewMetrics, CodeReviewIssue } from '../../types/code-review';

interface CodeReviewDashboardProps {
  className?: string;
}

export const CodeReviewDashboard: React.FC<CodeReviewDashboardProps> = ({ className }) => {
  const [currentReport, setCurrentReport] = useState<CodeReviewReport | null>(null);
  const [historicalReports, setHistoricalReports] = useState<CodeReviewReport[]>([]);
  const [metrics, setMetrics] = useState<CodeReviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load current report
      const currentResponse = await fetch('/api/code-review/current');
      if (currentResponse.ok) {
        const current = await currentResponse.json();
        setCurrentReport(current);
      }

      // Load historical reports
      const historicalResponse = await fetch('/api/code-review/history');
      if (historicalResponse.ok) {
        const historical = await historicalResponse.json();
        setHistoricalReports(historical);
      }

      // Load metrics
      const metricsResponse = await fetch('/api/code-review/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runReview = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/code-review/run', { method: 'POST' });
      if (response.ok) {
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to run review:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      case 'info': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security': return <Shield className="w-4 h-4" />;
      case 'compliance': return <FileText className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      case 'quality': return <CheckCircle className="w-4 h-4" />;
      case 'accessibility': return <Users className="w-4 h-4" />;
      case 'testing': return <Settings className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading code review data...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Code Review Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive code analysis for CareSync HMS
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runReview} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Review
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {currentReport && (
        <Alert className={currentReport.summary.success ? 'border-green-500' : 'border-red-500'}>
          {currentReport.summary.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            Last review: {currentReport.summary.totalIssues} issues found across {currentReport.summary.totalFiles} files
            {currentReport.metadata.git && (
              <span className="ml-2 text-sm">
                ({currentReport.metadata.git.branch}:{currentReport.metadata.git.commit.substring(0, 7)})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentReport?.summary.totalIssues || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {currentReport?.summary.totalFiles || 0} files
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {currentReport?.summary.issuesBySeverity.critical || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Code Quality</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics?.metrics.codeQualityScore || 0}%
                </div>
                <Progress value={metrics?.metrics.codeQualityScore || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scan Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentReport ? Math.round(currentReport.summary.scanDuration / 1000) : 0}s
                </div>
                <p className="text-xs text-muted-foreground">
                  Last scan time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Issues by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentReport?.results.map((result) => (
                  <div key={result.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(result.category)}
                      <span className="capitalize">{result.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {result.summary.totalIssues} issues
                      </Badge>
                      {result.summary.criticalIssues > 0 && (
                        <Badge variant="destructive">
                          {result.summary.criticalIssues} critical
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentReport?.results.flatMap(result =>
                  result.issues.map((issue, index) => (
                    <div key={`${result.category}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline">
                              {result.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {issue.file}:{issue.line}:{issue.column}
                            </span>
                          </div>
                          <h4 className="font-medium">{issue.message}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {issue.suggestion}
                          </p>
                          {issue.code && (
                            <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-x-auto">
                              <code>{issue.code}</code>
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {metrics.trends.issuesTrend > 0 ? '+' : ''}{metrics.trends.issuesTrend}%
                      </div>
                      <p className="text-sm text-muted-foreground">Issues Trend</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {metrics.trends.resolutionTrend > 0 ? '+' : ''}{metrics.trends.resolutionTrend}%
                      </div>
                      <p className="text-sm text-muted-foreground">Resolution Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {metrics.trends.qualityTrend > 0 ? '+' : ''}{metrics.trends.qualityTrend}%
                      </div>
                      <p className="text-sm text-muted-foreground">Quality Score</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Enabled Categories</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['security', 'compliance', 'performance', 'quality', 'accessibility', 'testing'].map(category => (
                      <div key={category} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={true} // This would be dynamic
                          readOnly
                          className="rounded"
                        />
                        <span className="capitalize text-sm">{category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">CI/CD Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Fail on severity:</span>
                      <Badge>high</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Max issues:</span>
                      <Badge>100</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};