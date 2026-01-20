import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, Users, Activity } from 'lucide-react';

export function WorkflowPerformanceMonitor() {
  const { profile } = useAuth();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['workflow-metrics', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_workflow_performance_metrics', {
          hospital_id_param: profile?.hospital_id,
        });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 30000,
  });

  const { data: bottlenecks = [] } = useQuery({
    queryKey: ['workflow-bottlenecks', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          assigned_to_profile:profiles!task_assignments_assigned_to_fkey(first_name, last_name, role)
        `)
        .eq('hospital_id', profile?.hospital_id)
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });

  const { data: rolePerformance = [] } = useQuery({
    queryKey: ['role-performance', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_role_performance_stats', {
          hospital_id_param: profile?.hospital_id,
        });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Workflow Performance Monitor</h2>
        <Badge variant="outline">Real-time</Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Task Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.task_completion_rate ? `${(metrics.task_completion_rate * 100).toFixed(1)}%` : '--'}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              {getTrendIcon(metrics?.completion_trend || 0)}
              <span>{metrics?.completion_trend > 0 ? '+' : ''}{metrics?.completion_trend?.toFixed(1)}% vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Avg Completion Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avg_completion_time ? `${metrics.avg_completion_time.toFixed(0)}m` : '--'}
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              {getTrendIcon(-(metrics?.time_trend || 0))}
              <span>{metrics?.time_trend < 0 ? 'Faster' : 'Slower'} by {Math.abs(metrics?.time_trend || 0).toFixed(0)}m</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bottlenecks.length}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Require immediate attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Active Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.active_staff_count || '--'}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Currently working
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="bottlenecks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          <TabsTrigger value="role-performance">Role Performance</TabsTrigger>
          <TabsTrigger value="automation">Automation Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="bottlenecks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Bottlenecks</CardTitle>
            </CardHeader>
            <CardContent>
              {bottlenecks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No bottlenecks detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bottlenecks.map((task: any) => (
                    <div key={task.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{task.title}</span>
                            <Badge variant="destructive">Overdue</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {task.assigned_to_profile?.first_name} {task.assigned_to_profile?.last_name} ({task.assigned_to_profile?.role})
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {new Date(task.due_date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rolePerformance.map((role: any) => (
                  <div key={role.role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{role.role}</span>
                      <span className={`font-bold ${getPerformanceColor(role.completion_rate)}`}>
                        {role.completion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={role.completion_rate} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{role.completed_tasks} completed</span>
                      <span>Avg: {role.avg_time.toFixed(0)}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Auto-assigned Tasks</p>
                    <p className="text-sm text-muted-foreground">Today</p>
                  </div>
                  <div className="text-2xl font-bold">{metrics?.auto_assigned_today || 0}</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Time Saved</p>
                    <p className="text-sm text-muted-foreground">Estimated</p>
                  </div>
                  <div className="text-2xl font-bold">{metrics?.time_saved_minutes || 0}m</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Automation Success Rate</p>
                    <p className="text-sm text-muted-foreground">Last 7 days</p>
                  </div>
                  <div className="text-2xl font-bold text-green-500">
                    {metrics?.automation_success_rate ? `${(metrics.automation_success_rate * 100).toFixed(1)}%` : '--'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
