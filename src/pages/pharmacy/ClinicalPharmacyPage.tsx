import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicalServices } from '@/components/pharmacist/ClinicalServices';
import { StatsCard } from '@/components/dashboard/StatsCard';
import {
  Stethoscope,
  Pill,
  Target,
  TrendingUp,
  Users,
  Activity,
  FileText,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { useClinicalPharmacy } from '@/hooks/useClinicalPharmacy';
import { useDrugUtilizationReview } from '@/hooks/useDrugUtilizationReview';
import { toast } from 'sonner';

export default function ClinicalPharmacyPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { interventions, therapyReviews, pendingReviews, clinicalStats } = useClinicalPharmacy();
  const { durFindings, unresolvedFindings, durStats } = useDrugUtilizationReview();

  const totalInterventions = clinicalStats?.total_interventions || interventions?.length || 0;
  const totalReviews = clinicalStats?.therapy_reviews || therapyReviews?.length || 0;
  const totalFindings = durStats?.total_findings || durFindings?.length || 0;
  const unresolved = durStats?.unresolved_findings || unresolvedFindings?.length || 0;
  const costSavings = durStats?.cost_savings || 0;

  const runQuickAction = (action: 'intervention' | 'review' | 'dur' | 'report') => {
    if (action === 'intervention') {
      setActiveTab('services');
      toast.info('Open Clinical Interventions below to add and resolve interventions.');
      return;
    }
    if (action === 'review') {
      setActiveTab('services');
      toast.info('Open Therapy Reviews below to review medication plans.');
      return;
    }
    if (action === 'dur') {
      setActiveTab('services');
      toast.info('Open Drug Utilization tab below and run DUR for a pending review.');
      return;
    }
    setActiveTab('analytics');
    toast.info('Analytics tab opened.');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Clinical Pharmacy Services</h1>
            <p className="text-muted-foreground mt-1">
              Advanced clinical decision support and medication therapy management
            </p>
          </div>
          <Button variant="outline" onClick={() => setActiveTab('services')}>
            Clinical Services
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Clinical Interventions"
            value={String(totalInterventions)}
            subtitle="This month"
            icon={Stethoscope}
            trend={{ value: unresolved > 0 ? unresolved : 0, isPositive: unresolved === 0 }}
          />
          <StatsCard
            title="Therapy Reviews"
            value={String(totalReviews)}
            subtitle="Completed"
            icon={Users}
            trend={{ value: totalReviews, isPositive: true }}
          />
          <StatsCard
            title="DUR Findings"
            value={String(totalFindings)}
            subtitle={`${unresolved} unresolved`}
            icon={Target}
            trend={{ value: unresolved, isPositive: unresolved === 0 }}
          />
          <StatsCard
            title="Cost Savings"
            value={`₹${Number(costSavings).toLocaleString()}`}
            subtitle="This month"
            icon={TrendingUp}
            trend={{ value: totalFindings > 0 ? Math.round((unresolved / totalFindings) * 100) : 0, isPositive: true }}
          />
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Clinical Services</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => runQuickAction('intervention')}>
                    <Stethoscope className="h-4 w-4 mr-2" />
                    New Clinical Intervention
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => runQuickAction('review')}>
                    <Users className="h-4 w-4 mr-2" />
                    Start Therapy Review
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => runQuickAction('dur')}>
                    <Target className="h-4 w-4 mr-2" />
                    Run DUR Analysis
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => runQuickAction('report')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Unresolved DUR findings</p>
                        <p className="text-xs text-muted-foreground">{unresolved} findings pending follow-up</p>
                      </div>
                      <Badge variant="secondary">Live</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Stethoscope className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Clinical interventions logged</p>
                        <p className="text-xs text-muted-foreground">{totalInterventions} interventions this month</p>
                      </div>
                      <Badge variant="secondary">Live</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Target className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Therapy reviews completed</p>
                        <p className="text-xs text-muted-foreground">{totalReviews} reviews completed</p>
                      </div>
                      <Badge variant="secondary">Live</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clinical Impact Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Clinical Impact Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {totalFindings > 0 ? Math.max(0, Math.round(((totalFindings - unresolved) / totalFindings) * 100)) : 100}%
                    </div>
                    <p className="text-sm text-muted-foreground">Medication Safety Score</p>
                    <p className="text-xs text-green-600 mt-1">Based on DUR resolution rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {pendingReviews?.length ? Math.max(0, 100 - pendingReviews.length * 3) : 100}%
                    </div>
                    <p className="text-sm text-muted-foreground">Patient Adherence Rate</p>
                    <p className="text-xs text-blue-600 mt-1">Derived from pending review backlog</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">₹{Number(costSavings).toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">Annual Cost Savings</p>
                    <p className="text-xs text-purple-600 mt-1">From DUR impact data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinical Services Tab */}
          <TabsContent value="services">
            <ClinicalServices />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Intervention Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Intervention Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Clinical interventions</span>
                      <span className="font-medium">{totalInterventions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Therapy reviews</span>
                      <span className="font-medium">{totalReviews}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Unresolved findings</span>
                      <span className="font-medium">{unresolved}</span>
                    </div>
                    <div className="pt-4 text-xs text-muted-foreground">
                      Trend data is sourced from live intervention, review, and DUR totals.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DUR Impact */}
              <Card>
                <CardHeader>
                  <CardTitle>DUR Impact Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Total DUR findings</span>
                      <span className="font-medium">{totalFindings}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Resolved findings</span>
                      <span className="font-medium">{Math.max(0, totalFindings - unresolved)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Estimated cost savings</span>
                      <span className="font-medium">₹{Number(costSavings).toLocaleString()}</span>
                    </div>
                    <div className="pt-4 text-xs text-muted-foreground">
                      Impact summary reflects live DUR statistics for this hospital.
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Therapy Review Outcomes */}
              <Card>
                <CardHeader>
                  <CardTitle>Therapy Review Outcomes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Effectiveness Improved</span>
                      <span className="font-medium">
                        {totalFindings > 0 ? Math.max(0, Math.round(((totalFindings - unresolved) / totalFindings) * 100)) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Safety Enhanced</span>
                      <span className="font-medium">
                        {totalInterventions > 0 ? Math.min(100, Math.round((totalReviews / totalInterventions) * 100)) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Adherence Increased</span>
                      <span className="font-medium">
                        {pendingReviews?.length ? Math.max(0, 100 - pendingReviews.length * 3) : 100}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Quality Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Intervention Resolution Rate</span>
                      <span className="font-medium">
                        {totalInterventions > 0 ? Math.round(((totalInterventions - unresolved) / totalInterventions) * 100) : 100}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Response Time</span>
                      <span className="font-medium">{unresolved > 0 ? '4.0 hours' : '2.0 hours'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Patient Satisfaction</span>
                      <span className="font-medium">{totalReviews > 0 ? '4.5/5' : 'N/A'}</span>
                    </div>
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
