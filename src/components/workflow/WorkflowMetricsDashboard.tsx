import { useWorkflowMetrics, useWorkflowStages } from '@/hooks/useWorkflowMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, TrendingUp, Users } from 'lucide-react';

export function WorkflowMetricsDashboard() {
  const { data: metrics, isLoading } = useWorkflowMetrics();
  const stages = useWorkflowStages();

  if (isLoading) {
    return <div className="text-center py-8">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="text-center py-8">No metrics available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-in to Nurse</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.checkInToNurse.toFixed(1)} min</div>
            <p className="text-xs text-muted-foreground">Target: &lt; 10 min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Turnaround</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.labTurnaround.toFixed(1)} min</div>
            <p className="text-xs text-muted-foreground">Target: &lt; 60 min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Throughput</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.patientThroughput.toFixed(1)}/day</div>
            <p className="text-xs text-muted-foreground">Target: 8+ patients/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.noShowRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Target: &lt; 10%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Stage Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stages.map((stage) => (
              <div key={stage.stage} className="flex items-center justify-between">
                <span className="text-sm font-medium">{stage.stage}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{stage.avgTime.toFixed(1)} min</span>
                  <Badge variant={
                    stage.status === 'good' ? 'default' :
                    stage.status === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {stage.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
