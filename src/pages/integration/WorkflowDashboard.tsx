import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Workflow,
  Zap,
  MessageSquare,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  UserCheck,
  Timer,
  Settings,
  Bell,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { WorkflowOrchestrator } from '@/components/integration/WorkflowOrchestrator';
import { useWorkflowAutomation } from '@/hooks/useWorkflowAutomation';
import { useCrossRoleCommunication } from '@/hooks/useCrossRoleCommunication';
import { WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type WorkflowActionFailureRecord = {
  id: string;
  workflow_event_id: string;
  action_type: string;
  error_message: string;
  retry_attempts: number;
  created_at: string;
  resolved: boolean;
  resolved_at?: string | null;
  event_type?: string | null;
};

const WORKFLOW_EVENT_LIST = Object.values(WORKFLOW_EVENT_TYPES);

export function WorkflowDashboard() {
  const { profile, hospital } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const queryClient = useQueryClient();

  const {
    myTasks,
    roleTasks,
    workflowRules,
    getWorkflowMetrics,
    getOverdueTasks,
  } = useWorkflowAutomation();

  const {
    messages,
    unreadCount,
    sendMessage,
    markAsRead,
    updateNotificationSettings,
    notificationSettings,
    getMessagesByType,
    getUrgentMessages,
    getUnreadMessages,
  } = useCrossRoleCommunication();

  const { data: metrics } = getWorkflowMetrics();
  const { data: overdueTasks } = getOverdueTasks();

  const { data: actionFailures = [] } = useQuery({
    queryKey: ['workflow-action-failures', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      const { data, error } = await supabase
        .from('workflow_action_failures')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      const failures = (data || []) as WorkflowActionFailureRecord[];
      const eventIds = Array.from(new Set(failures.map((failure) => failure.workflow_event_id).filter(Boolean)));

      if (eventIds.length === 0) {
        return failures;
      }

      const { data: workflowEvents, error: workflowEventsError } = await supabase
        .from('workflow_events')
        .select('id, event_type')
        .in('id', eventIds);

      if (workflowEventsError) throw workflowEventsError;

      const eventTypeById = new Map(
        ((workflowEvents || []) as Array<{ id: string; event_type: string }>).map((event) => [event.id, event.event_type]),
      );

      return failures.map((failure) => ({
        ...failure,
        event_type: eventTypeById.get(failure.workflow_event_id) ?? null,
      }));
    },
    enabled: !!hospital?.id,
  });

  const { data: queueDepth } = useQuery({
    queryKey: ['workflow-queue-depth', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return { prescriptionQueue: 0, labQueue: 0 };

      const [prescriptionQueueResult, labQueueResult] = await Promise.all([
        supabase.from('prescription_queue').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id),
        supabase.from('lab_orders').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id),
      ]);

      return {
        prescriptionQueue: prescriptionQueueResult.count || 0,
        labQueue: labQueueResult.count || 0,
      };
    },
    enabled: !!hospital?.id,
  });

  const { data: workflowAnalytics } = useQuery({
    queryKey: ['workflow-analytics', hospital?.id, selectedTimeframe],
    queryFn: async () => {
      if (!hospital?.id) {
        return {
          ruleCoveragePercent: 0,
          coveredEvents: 0,
          missingEvents: [] as string[],
          totalEvents: 0,
          totalFailures: 0,
          failureRate: 0,
          topEvents: [] as Array<{ eventType: string; count: number }>,
          topFailures: [] as Array<{ actionType: string; eventType: string; count: number }>,
        };
      }

      const timeframeDays = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
      const fromDate = subDays(new Date(), timeframeDays).toISOString();

      const [rulesResult, eventsResult, failuresResult] = await Promise.all([
        supabase
          .from('workflow_rules')
          .select('trigger_event, active')
          .eq('hospital_id', hospital.id)
          .eq('active', true),
        supabase
          .from('workflow_events')
          .select('id, event_type, created_at')
          .eq('hospital_id', hospital.id)
          .gte('created_at', fromDate),
        supabase
          .from('workflow_action_failures')
          .select('workflow_event_id, action_type, created_at')
          .eq('hospital_id', hospital.id)
          .gte('created_at', fromDate),
      ]);

      if (rulesResult.error) throw rulesResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (failuresResult.error) throw failuresResult.error;

      const activeRules = rulesResult.data || [];
      const workflowEvents = (eventsResult.data || []) as Array<{ id: string; event_type: string }>;
      const failures = (failuresResult.data || []) as Array<{ workflow_event_id: string; action_type: string }>;

      const coveredEvents = new Set(activeRules.map((rule: { trigger_event: string }) => rule.trigger_event));
      const missingEvents = WORKFLOW_EVENT_LIST.filter((eventType) => !coveredEvents.has(eventType));
      const eventTypeById = new Map(workflowEvents.map((event) => [event.id, event.event_type]));

      const eventCounts = new Map<string, number>();
      for (const event of workflowEvents) {
        eventCounts.set(event.event_type, (eventCounts.get(event.event_type) || 0) + 1);
      }

      const failureCounts = new Map<string, number>();
      for (const failure of failures) {
        const eventType = eventTypeById.get(failure.workflow_event_id) ?? 'unknown';
        const key = `${failure.action_type}|||${eventType}`;
        failureCounts.set(key, (failureCounts.get(key) || 0) + 1);
      }

      return {
        ruleCoveragePercent: Math.round((coveredEvents.size / WORKFLOW_EVENT_LIST.length) * 100),
        coveredEvents: coveredEvents.size,
        missingEvents,
        totalEvents: workflowEvents.length,
        totalFailures: failures.length,
        failureRate: workflowEvents.length > 0 ? (failures.length / workflowEvents.length) * 100 : 0,
        topEvents: Array.from(eventCounts.entries())
          .map(([eventType, count]) => ({ eventType, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topFailures: Array.from(failureCounts.entries())
          .map(([key, count]) => {
            const [actionType, eventType] = key.split('|||');
            return { actionType, eventType, count };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    },
    enabled: !!hospital?.id,
  });

  const markFailureResolved = async (failureId: string) => {
    const { error } = await supabase
      .from('workflow_action_failures')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', failureId);

    if (error) {
      console.error('Failed to resolve workflow action failure:', error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['workflow-action-failures'] });
  };

  const unreadMessages = getUnreadMessages();
  const urgentMessages = getUrgentMessages();
  const queueDepthTotal = (queueDepth?.prescriptionQueue || 0) + (queueDepth?.labQueue || 0);
  const analyticsSummary = workflowAnalytics ?? {
    ruleCoveragePercent: 0,
    coveredEvents: 0,
    missingEvents: [] as string[],
    totalEvents: 0,
    totalFailures: 0,
    failureRate: 0,
    topEvents: [] as Array<{ eventType: string; count: number }>,
    topFailures: [] as Array<{ actionType: string; eventType: string; count: number }>,
  };

  // Calculate dashboard metrics
  const getDashboardMetrics = () => {
    const now = new Date();
    const timeframeDays = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
    const startDate = subDays(now, timeframeDays);

    const completedTasks = myTasks?.filter(task =>
      task.status === 'completed' &&
      new Date(task.completed_at || task.updated_at) >= startDate
    ).length || 0;

    const totalTasks = myTasks?.filter(task =>
      new Date(task.created_at) >= startDate
    ).length || 0;

    const completedTasksWithTime = myTasks?.filter(task => task.completed_at) ?? [];
    const totalCompletionMs = completedTasksWithTime.reduce((acc, task) => {
      const created = new Date(task.created_at);
      const completed = new Date(task.completed_at!);
      return acc + (completed.getTime() - created.getTime());
    }, 0);
    const avgCompletionTime = completedTasksWithTime.length > 0
      ? totalCompletionMs / completedTasksWithTime.length / (1000 * 60 * 60)
      : 0;

    return {
      completedTasks,
      totalTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      overdueTasks: overdueTasks?.length || 0,
    };
  };

  const dashboardMetrics = getDashboardMetrics();

  // Get workflow efficiency data
  const getWorkflowEfficiency = () => {
    if (!metrics) return null;

    const efficiency = {
      taskCompletion: metrics.total_tasks > 0 ? (metrics.completed_tasks / metrics.total_tasks) * 100 : 0,
      overdueRate: metrics.total_tasks > 0 ? (metrics.overdue_tasks / metrics.total_tasks) * 100 : 0,
      averageTime: metrics.average_completion_time,
      activeRules: workflowRules?.filter(rule => rule.active).length || 0,
    };

    return efficiency;
  };

  const efficiency = getWorkflowEfficiency();

  return (
    <DashboardLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive view of automated workflows and cross-role communication
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Task Completion</p>
                <p className="text-2xl font-bold">{dashboardMetrics.completionRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {dashboardMetrics.completedTasks}/{dashboardMetrics.totalTasks} tasks
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Completion Time</p>
                <p className="text-2xl font-bold">{dashboardMetrics.avgCompletionTime}h</p>
                <p className="text-xs text-muted-foreground">per task</p>
              </div>
              <Timer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-600">{dashboardMetrics.overdueTasks}</p>
                <p className="text-xs text-muted-foreground">requiring attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread Messages</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">
                  {urgentMessages.length} urgent
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Queue Depth</p>
                <p className="text-2xl font-bold">{queueDepthTotal}</p>
                <p className="text-xs text-muted-foreground">
                  Rx {queueDepth?.prescriptionQueue || 0} · Lab {queueDepth?.labQueue || 0}
                </p>
              </div>
              <Workflow className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {urgentMessages.length > 0 && (
          <Alert className="border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-red-800">Urgent Messages</AlertTitle>
            <AlertDescription className="text-red-700">
              You have {urgentMessages.length} urgent message{urgentMessages.length !== 1 ? 's' : ''} requiring immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {dashboardMetrics.overdueTasks > 0 && (
          <Alert className="border-orange-200">
            <Clock className="h-4 w-4" />
            <AlertTitle className="text-orange-800">Overdue Tasks</AlertTitle>
            <AlertDescription className="text-orange-700">
              {dashboardMetrics.overdueTasks} task{dashboardMetrics.overdueTasks !== 1 ? 's are' : ' is'} overdue. Please review your task list.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orchestrator">Orchestrator</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Workflow Efficiency */}
          {efficiency && (
            <Card>
              <CardHeader>
                <CardTitle>Workflow Efficiency</CardTitle>
                <CardDescription>
                  Overall system performance and automation metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Task Completion</span>
                      <span>{Math.round(efficiency.taskCompletion)}%</span>
                    </div>
                    <Progress value={efficiency.taskCompletion} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overdue Rate</span>
                      <span>{Math.round(efficiency.overdueRate)}%</span>
                    </div>
                    <Progress value={Math.max(0, 100 - efficiency.overdueRate)} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Avg. Completion Time</span>
                      <span>{Math.round(efficiency.averageTime)}h</span>
                    </div>
                    <Progress value={Math.min(100, 100 - (efficiency.averageTime / 24) * 100)} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Rules</span>
                      <span>{efficiency.activeRules}</span>
                    </div>
                    <Progress value={(efficiency.activeRules / 10) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest workflow events and communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {/* Recent Tasks */}
                  {myTasks?.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in_progress' ? 'bg-blue-500' :
                        task.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.workflow_type} • {format(new Date(task.updated_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
                    </div>
                  ))}

                  {/* Recent Messages */}
                  {messages?.slice(0, 3).map((message) => (
                    <div key={message.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <div className="flex-1">
                        <p className="font-medium">{message.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          From {message.sender_name} • {format(new Date(message.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      {!message.read && <Badge className="bg-[hsl(var(--accent-vivid))] text-[hsl(220_35%_8%)] border-none hover:bg-[hsl(var(--accent-vivid)/0.9)]">New</Badge>}
                    </div>
                  ))}

                  {(!myTasks?.length && !messages?.length) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unresolved Action Failures</CardTitle>
              <CardDescription>
                Workflow actions that failed after retries and still need manual review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionFailures.length === 0 ? (
                <div className="text-sm text-muted-foreground">No unresolved workflow action failures.</div>
              ) : (
                <div className="space-y-3">
                  {actionFailures.map((failure: WorkflowActionFailureRecord) => (
                    <div key={failure.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">{failure.action_type}</Badge>
                            <span className="text-sm font-medium">{failure.event_type || failure.workflow_event_id}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{failure.error_message}</p>
                          <p className="text-xs text-muted-foreground">
                            Retries: {failure.retry_attempts} · {format(new Date(failure.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => void markFailureResolved(failure.id)}>
                          Mark Resolved
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orchestrator">
          <WorkflowOrchestrator />
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          {/* Communication Hub */}
          <Card>
            <CardHeader>
              <CardTitle>Communication Hub</CardTitle>
              <CardDescription>
                Cross-role messaging and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Bell className="h-5 w-5" />
                      <span className="text-xs">Send Alert</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Send className="h-5 w-5" />
                      <span className="text-xs">Broadcast</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Settings className="h-5 w-5" />
                      <span className="text-xs">Settings</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <BarChart3 className="h-5 w-5" />
                      <span className="text-xs">Reports</span>
                    </Button>
                  </div>
                </div>

                {/* Message Stats */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Message Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Messages</span>
                      <span className="font-medium">{messages?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unread</span>
                      <span className="font-medium text-orange-600">{unreadCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Urgent</span>
                      <span className="font-medium text-red-600">{urgentMessages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Week</span>
                      <span className="font-medium">
                        {messages?.filter(m =>
                          new Date(m.created_at) >= subDays(new Date(), 7)
                        ).length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {messages?.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg ${!message.read ? 'bg-blue-50 border-blue-200' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{message.subject}</h4>
                          <p className="text-sm text-muted-foreground">
                            From {message.sender_name} ({message.sender_role}) • {format(new Date(message.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={message.priority === 'urgent' || message.priority === 'high' ? 'destructive' : 'secondary'}>
                            {message.priority}
                          </Badge>
                          {!message.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(message.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  ))}

                  {(!messages || messages.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Rule Coverage</CardTitle>
                <CardDescription>
                  Active rule coverage across the current workflow dispatcher events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Coverage</span>
                  <span className="text-2xl font-semibold">{analyticsSummary.ruleCoveragePercent}%</span>
                </div>
                <Progress value={analyticsSummary.ruleCoveragePercent} />
                <div className="flex items-center justify-between text-sm">
                  <span>{analyticsSummary.coveredEvents} covered</span>
                  <span>{WORKFLOW_EVENT_LIST.length - analyticsSummary.coveredEvents} missing</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analyticsSummary.missingEvents.length === 0 ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">All current events covered</Badge>
                  ) : (
                    analyticsSummary.missingEvents.map((eventType) => (
                      <Badge key={eventType} variant="outline">{eventType}</Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Failure Rate</CardTitle>
                <CardDescription>
                  Retry-exhausted action failures relative to recorded workflow events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-semibold">{analyticsSummary.failureRate.toFixed(1)}%</div>
                    <p className="text-sm text-muted-foreground">failure rate in the selected window</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Workflow events</div>
                    <div className="text-xl font-semibold">{analyticsSummary.totalEvents}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-muted-foreground">Failed actions</div>
                    <div className="text-xl font-semibold">{analyticsSummary.totalFailures}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Analytics</CardTitle>
              <CardDescription>
                Comprehensive workflow and communication metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Workflow Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Tasks</span>
                      <span className="font-medium">{metrics?.total_tasks || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completed</span>
                      <span className="font-medium text-green-600">{metrics?.completed_tasks || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pending</span>
                      <span className="font-medium text-yellow-600">{metrics?.pending_tasks || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Overdue</span>
                      <span className="font-medium text-red-600">{metrics?.overdue_tasks || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Communication Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Messages</span>
                      <span className="font-medium">{messages?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Unread</span>
                      <span className="font-medium text-orange-600">{unreadCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Urgent</span>
                      <span className="font-medium text-red-600">{urgentMessages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Response Rate</span>
                      <span className="font-medium">85%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Automation Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Active Rules</span>
                      <span className="font-medium">{workflowRules?.filter(r => r.active).length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Queue Depth</span>
                      <span className="font-medium">{queueDepthTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Rule Coverage</span>
                      <span className="font-medium">{analyticsSummary.ruleCoveragePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Failure Rate</span>
                      <span className="font-medium">{analyticsSummary.failureRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Workflow Events</CardTitle>
                <CardDescription>
                  Highest-volume workflow events in the selected window
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsSummary.topEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No workflow events recorded in this window.</div>
                ) : (
                  <div className="space-y-3">
                    {analyticsSummary.topEvents.map((event) => (
                      <div key={event.eventType} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">{event.eventType}</span>
                        <Badge variant="secondary">{event.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Failure Sources</CardTitle>
                <CardDescription>
                  Workflow actions with the highest retry-exhausted failure counts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsSummary.topFailures.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No retry-exhausted failures in this window.</div>
                ) : (
                  <div className="space-y-3">
                    {analyticsSummary.topFailures.map((failure) => (
                      <div key={`${failure.actionType}-${failure.eventType}`} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">{failure.actionType}</Badge>
                              <span className="text-sm font-medium">{failure.eventType}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Retry exhausted failure count</p>
                          </div>
                          <span className="text-lg font-semibold">{failure.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default WorkflowDashboard;
