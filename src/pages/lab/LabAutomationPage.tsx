import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { SampleTracking } from '@/components/lab/SampleTracking';
import { useSampleTracking } from '@/hooks/useSampleTracking';
import { useQualityControl } from '@/hooks/useQualityControl';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import {
  TestTube2,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Thermometer,
  Shield,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';

export function LabAutomationPage() {
  const { profile } = useAuth();
  const { samples, urgentSamples, overdueSamples } = useSampleTracking();
  const {
    qcResults,
    criticalResults,
    qcStatistics,
    pendingCriticalResults,
    acknowledgedCriticalResults
  } = useQualityControl();

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate statistics
  const totalSamples = samples?.length || 0;
  const completedSamples = samples?.filter(s => s.status === 'completed').length || 0;
  const processingSamples = samples?.filter(s => s.status === 'processing').length || 0;
  const completionRate = totalSamples > 0 ? (completedSamples / totalSamples) * 100 : 0;

  const todayStats = {
    samplesProcessed: completedSamples,
    qcTestsPerformed: qcResults?.length || 0,
    criticalResultsHandled: criticalResults?.filter(r => r.status !== 'pending').length || 0,
    averageProcessingTime: '2.3 hours', // This would be calculated from actual data
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lab Automation Dashboard</h1>
            <p className="text-muted-foreground">
              Automated sample tracking, quality control, and critical result management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Activity className="mr-1 h-3 w-3" />
              System Online
            </Badge>
          </div>
        </div>

        {/* Critical Alerts */}
        {(urgentSamples.length > 0 || pendingCriticalResults.length > 0 || overdueSamples.length > 0) && (
          <div className="space-y-4">
            {urgentSamples.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{urgentSamples.length} urgent sample{urgentSamples.length > 1 ? 's' : ''}</strong> require{urgentSamples.length === 1 ? 's' : ''} immediate processing.
                  <Button variant="link" className="p-0 ml-2 h-auto text-red-800 underline">
                    View Details
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {pendingCriticalResults.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>{pendingCriticalResults.length} critical result{pendingCriticalResults.length > 1 ? 's' : ''}</strong> require{pendingCriticalResults.length === 1 ? 's' : ''} immediate review.
                  <Button variant="link" className="p-0 ml-2 h-auto text-orange-800 underline">
                    Review Now
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {overdueSamples.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>{overdueSamples.length} sample{overdueSamples.length > 1 ? 's are' : ' is'}</strong> overdue for processing.
                  <Button variant="link" className="p-0 ml-2 h-auto text-yellow-800 underline">
                    Process Now
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Today's Samples"
            value={totalSamples}
            description={`${completedSamples} completed`}
            icon={TestTube2}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="QC Pass Rate"
            value={`${qcStatistics?.passRate.toFixed(1) || 0}%`}
            description={`${qcStatistics?.passedTests || 0} of ${qcStatistics?.totalTests || 0} tests`}
            icon={CheckCircle}
            trend={{ value: 2.1, isPositive: true }}
          />
          <StatsCard
            title="Critical Results"
            value={pendingCriticalResults.length}
            description={`${acknowledgedCriticalResults.length} acknowledged`}
            icon={AlertTriangle}
            trend={{ value: -5, isPositive: false }}
          />
          <StatsCard
            title="Processing Rate"
            value={`${completionRate.toFixed(1)}%`}
            description={`${processingSamples} in progress`}
            icon={TrendingUp}
            trend={{ value: 8.2, isPositive: true }}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="samples">Sample Tracking</TabsTrigger>
            <TabsTrigger value="quality">Quality Control</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Today's Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Performance
                  </CardTitle>
                  <CardDescription>Key metrics for today</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Samples Processed</span>
                    <span className="text-2xl font-bold">{todayStats.samplesProcessed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">QC Tests Performed</span>
                    <span className="text-2xl font-bold">{todayStats.qcTestsPerformed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Critical Results Handled</span>
                    <span className="text-2xl font-bold">{todayStats.criticalResultsHandled}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg Processing Time</span>
                    <span className="text-2xl font-bold">{todayStats.averageProcessingTime}</span>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Status
                  </CardTitle>
                  <CardDescription>Automated monitoring systems</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sample Tracking</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Online
                      </Badge>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quality Control</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Online
                      </Badge>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Alerts</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Online
                      </Badge>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Equipment Monitoring</span>
                      <Badge variant="outline">
                        <Shield className="mr-1 h-3 w-3" />
                        Standby
                      </Badge>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest sample processing and QC activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {samples?.slice(0, 5).map((sample) => (
                    <div key={sample.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        <TestTube2 className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Sample {sample.sample_id} - {sample.test_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sample.patient ? `${sample.patient.first_name} ${sample.patient.last_name}` : 'Unknown Patient'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant={sample.status === 'completed' ? 'default' : 'secondary'}>
                          {sample.status}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="samples">
            <SampleTracking />
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* QC Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Quality Control Statistics
                  </CardTitle>
                  <CardDescription>QC test results and compliance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {qcStatistics?.passRate.toFixed(1) || 0}%
                    </div>
                    <p className="text-sm text-muted-foreground">Pass Rate</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Passed</span>
                      <span className="font-medium text-green-600">{qcStatistics?.passedTests || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Failed</span>
                      <span className="font-medium text-red-600">{qcStatistics?.failedTests || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending</span>
                      <span className="font-medium text-yellow-600">{qcStatistics?.pendingTests || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Critical Results Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Critical Results
                  </CardTitle>
                  <CardDescription>Critical value alerts and acknowledgments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {pendingCriticalResults.length}
                      </div>
                      <p className="text-xs text-muted-foreground">Pending Review</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {acknowledgedCriticalResults.length}
                      </div>
                      <p className="text-xs text-muted-foreground">Acknowledged</p>
                    </div>
                  </div>

                  {pendingCriticalResults.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {pendingCriticalResults.length} critical result{pendingCriticalResults.length > 1 ? 's' : ''} require{pendingCriticalResults.length === 1 ? 's' : ''} immediate attention.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* QC Test History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent QC Tests</CardTitle>
                <CardDescription>Latest quality control test results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {qcResults?.slice(0, 10).map((qc) => (
                    <div key={qc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${qc.result === 'pass' ? 'bg-green-500' : qc.result === 'fail' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <div>
                          <p className="text-sm font-medium">{qc.test_type} - Lot {qc.control_lot}</p>
                          <p className="text-xs text-muted-foreground">
                            {qc.technician?.first_name} {qc.technician?.last_name} • {new Date(qc.performed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={qc.result === 'pass' ? 'default' : qc.result === 'fail' ? 'destructive' : 'secondary'}>
                        {qc.result.toUpperCase()}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-center text-muted-foreground py-4">No QC tests found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sample Processing Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Analytics charts would be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Processing times, completion rates, error rates over time
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    QC Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">QC analytics would be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Pass rates, control limits, Westgard rule violations
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Technician Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Performance metrics would be displayed here</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Individual technician stats, error rates, processing times
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default LabAutomationPage;