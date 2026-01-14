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
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export function WorkflowDashboard() {
  const { profile, hospital } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

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

  const unreadMessages = getUnreadMessages();
  const urgentMessages = getUrgentMessages();

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

    const avgCompletionTime = myTasks?.filter(task => task.completed_at).reduce((acc, task) => {
      const created = new Date(task.created_at);
      const completed = new Date(task.completed_at!);
      return acc + (completed.getTime() - created.getTime());
    }, 0) / (myTasks?.filter(task => task.completed_at).length || 1) / (1000 * 60 * 60); // hours

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      {!message.read && <Badge variant="destructive">New</Badge>}
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
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Completion Trends</CardTitle>
                <CardDescription>
                  Task completion rates over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chart visualization would be implemented here</p>
                    <p className="text-sm">Integration with charting library needed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Performance</CardTitle>
                <CardDescription>
                  Performance metrics by healthcare role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Role performance breakdown</p>
                    <p className="text-sm">Data visualization pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
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
                      <span className="text-sm">Auto Tasks Created</span>
                      <span className="font-medium">127</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Time Saved</span>
                      <span className="font-medium">42h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Efficiency Gain</span>
                      <span className="font-medium">+35%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}

export default WorkflowDashboard;