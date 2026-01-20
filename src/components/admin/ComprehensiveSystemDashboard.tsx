import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, Users, Zap, Globe } from 'lucide-react';
import { performanceOptimization } from '@/services/performanceOptimization';
import { automationScaling } from '@/services/automationScaling';
import { continuousImprovement } from '@/services/continuousImprovement';
import { enterpriseScaling } from '@/services/enterpriseScaling';

export const ComprehensiveSystemDashboard = () => {
  const [metrics, setMetrics] = useState<any>({});

  useEffect(() => {
    loadAllMetrics();
  }, []);

  const loadAllMetrics = async () => {
    const [perf, auto, improve, enterprise] = await Promise.all([
      performanceOptimization.monitorPerformance(),
      automationScaling.getAutomationMetrics(),
      continuousImprovement.getImprovementMetrics(),
      enterpriseScaling.getEnterpriseMetrics()
    ]);
    setMetrics({ perf, auto, improve, enterprise });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">System Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.perf?.score || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.auto?.activeWorkflows || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">User Satisfaction</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.improve?.avgRating || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facilities</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.enterprise?.facilities || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="improvement">Improvement</TabsTrigger>
          <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Page Load Time</span>
                  <span className="font-bold">{metrics.perf?.pageLoadTime}s</span>
                </div>
                <div className="flex justify-between">
                  <span>API Response</span>
                  <span className="font-bold">{metrics.perf?.apiResponseTime}s</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader><CardTitle>Automation Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Time Saved</span>
                  <span className="font-bold">{metrics.auto?.timeSaved} hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Reduction</span>
                  <span className="font-bold">{metrics.auto?.errorReduction}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvement">
          <Card>
            <CardHeader><CardTitle>Continuous Improvement</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Feedback Collected</span>
                  <span className="font-bold">{metrics.improve?.feedbackCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Implemented</span>
                  <span className="font-bold">{metrics.improve?.implementedSuggestions}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enterprise">
          <Card>
            <CardHeader><CardTitle>Enterprise Scale</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Staff</span>
                  <span className="font-bold">{metrics.enterprise?.totalStaff}</span>
                </div>
                <div className="flex justify-between">
                  <span>Patients Served</span>
                  <span className="font-bold">{metrics.enterprise?.patientsServed?.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
