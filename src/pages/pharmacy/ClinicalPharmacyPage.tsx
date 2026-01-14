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
} from 'lucide-react';

export default function ClinicalPharmacyPage() {
  const [activeTab, setActiveTab] = useState('overview');

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
          <Badge variant="pharmacist" className="w-fit text-sm py-1.5 px-4">
            Clinical Services
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Clinical Interventions"
            value="24"
            subtitle="This month"
            icon={Stethoscope}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Therapy Reviews"
            value="18"
            subtitle="Completed"
            icon={Users}
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="DUR Findings"
            value="31"
            subtitle="7 unresolved"
            icon={Target}
            trend={{ value: -3, isPositive: false }}
          />
          <StatsCard
            title="Cost Savings"
            value="$2,450"
            subtitle="This month"
            icon={TrendingUp}
            trend={{ value: 15, isPositive: true }}
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
                  <Button className="w-full justify-start" variant="outline">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    New Clinical Intervention
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Start Therapy Review
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Run DUR Analysis
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
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
                        <p className="text-sm font-medium">High-risk interaction detected</p>
                        <p className="text-xs text-muted-foreground">Patient: John Smith - Warfarin + Amiodarone</p>
                      </div>
                      <Badge variant="secondary">2h ago</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Stethoscope className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Therapy review completed</p>
                        <p className="text-xs text-muted-foreground">Patient: Sarah Johnson - Diabetes management</p>
                      </div>
                      <Badge variant="secondary">4h ago</Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Target className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">DUR finding resolved</p>
                        <p className="text-xs text-muted-foreground">Cost-saving opportunity identified</p>
                      </div>
                      <Badge variant="secondary">6h ago</Badge>
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
                    <div className="text-2xl font-bold text-green-600">89%</div>
                    <p className="text-sm text-muted-foreground">Medication Safety Score</p>
                    <p className="text-xs text-green-600 mt-1">+5% from last month</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">94%</div>
                    <p className="text-sm text-muted-foreground">Patient Adherence Rate</p>
                    <p className="text-xs text-blue-600 mt-1">+3% from last month</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">$12,450</div>
                    <p className="text-sm text-muted-foreground">Annual Cost Savings</p>
                    <p className="text-xs text-purple-600 mt-1">+18% from last month</p>
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
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Chart placeholder - Intervention trends over time
                  </div>
                </CardContent>
              </Card>

              {/* DUR Impact */}
              <Card>
                <CardHeader>
                  <CardTitle>DUR Impact Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Chart placeholder - Cost savings and quality improvements
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
                      <span className="font-medium">76%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Safety Enhanced</span>
                      <span className="font-medium">82%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Adherence Increased</span>
                      <span className="font-medium">68%</span>
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
                      <span className="font-medium">91%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Response Time</span>
                      <span className="font-medium">2.3 hours</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Patient Satisfaction</span>
                      <span className="font-medium">4.7/5</span>
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