import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Play,
  Pause,
  RotateCcw,
  UserCheck,
  Timer,
  BarChart3
} from 'lucide-react';
import { useWorkflowAutomation, WorkflowTask, WorkflowRule } from '@/hooks/useWorkflowAutomation';
import { useCrossRoleCommunication } from '@/hooks/useCrossRoleCommunication';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore } from 'date-fns';

const WORKFLOW_TYPES = [
  { id: 'patient_admission', name: 'Patient Admission', icon: Users },
  { id: 'consultation', name: 'Consultation Workflow', icon: Activity },
  { id: 'laboratory', name: 'Lab Testing', icon: Activity },
  { id: 'pharmacy', name: 'Medication Management', icon: Activity },
  { id: 'billing', name: 'Billing Process', icon: Activity },
  { id: 'discharge', name: 'Patient Discharge', icon: Users },
];

const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

export function WorkflowOrchestrator() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const {
    myTasks,
    roleTasks,
    workflowRules,
    isLoading,
    updateTaskStatus,
    createAutomatedTask,
    assignTask,
    getWorkflowMetrics,
    getOverdueTasks,
    isUpdatingTask,
  } = useWorkflowAutomation();

  const {
    sendMessage,
    sendBulkNotification,
    getUrgentMessages,
    unreadCount,
  } = useCrossRoleCommunication();

  const { data: metrics } = getWorkflowMetrics();
  const { data: overdueTasks } = getOverdueTasks();

  const urgentMessages = getUrgentMessages();

  // Filter tasks based on selected filters
  const filteredTasks = myTasks?.filter(task => {
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    return true;
  }) || [];

  const handleTaskStatusUpdate = () => {
    if (!selectedTask || !taskStatus) return;

    updateTaskStatus({
      taskId: selectedTask.id,
      status: taskStatus as WorkflowTask['status'],
      notes: taskNotes,
    });

    setSelectedTask(null);
    setTaskStatus('');
    setTaskNotes('');
  };

  const handleBulkNotification = (roles: string[], message: string) => {
    sendBulkNotification({
      recipientRoles: roles,
      message: {
        message_type: 'workflow_notification',
        subject: 'Workflow Update',
        content: message,
        priority: 'medium',
      },
    });
  };

  const getTaskPriorityColor = (priority: string) => {
    return TASK_PRIORITIES.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isTaskOverdue = (task: WorkflowTask) => {
    return isAfter(new Date(), new Date(task.due_date)) && task.status !== 'completed';
  };

  const getCompletionRate = () => {
    if (!metrics) return 0;
    return Math.round((metrics.completed_tasks / metrics.total_tasks) * 100);
  };

  const getOverdueRate = () => {
    if (!metrics) return 0;
    return Math.round((metrics.overdue_tasks / metrics.total_tasks) * 100);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading workflow data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Orchestrator</h1>
          <p className="text-muted-foreground">
            Automated task routing and cross-role communication hub
          </p>
        </div>
        <div className="flex gap-2">
          {urgentMessages.length > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              <AlertTriangle className="h-4 w-4 mr-1" />
              {urgentMessages.length} Urgent Messages
            </Badge>
          )}
          {(unreadCount ?? 0) > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              <MessageSquare className="h-4 w-4 mr-1" />
              {unreadCount ?? 0} Unread
            </Badge>
          )}
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{metrics.total_tasks}</p>
                </div>
                <Workflow className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{getCompletionRate()}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <Progress value={getCompletionRate()} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Tasks</p>
                  <p className="text-2xl font-bold">{metrics.pending_tasks}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.overdue_tasks}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getOverdueRate()}% of total tasks
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue Tasks Alert */}
      {overdueTasks && overdueTasks.length > 0 && (
        <Alert className="border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-red-800">Overdue Tasks Alert</AlertTitle>
          <AlertDescription className="text-red-700">
            {overdueTasks.length} tasks are overdue. Please review and reassign as needed.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {/* Task Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Task Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Priority</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      {TASK_PRIORITIES.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task List */}
          <Card>
            <CardHeader>
              <CardTitle>My Tasks ({filteredTasks.length})</CardTitle>
              <CardDescription>
                Tasks assigned to you across all workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                        isTaskOverdue(task) ? 'border-red-200 bg-red-50' : ''
                      }`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold">{task.title}</h3>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getTaskPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge className={getTaskStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Workflow className="h-4 w-4" />
                            {task.workflow_type}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {isTaskOverdue(task) && (
                          <Badge variant="destructive" className="text-xs">
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks match your filters.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Automation Rules</CardTitle>
              <CardDescription>
                Automated task creation and routing rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowRules?.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                      <Badge variant={rule.active ? 'default' : 'secondary'}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="text-sm">
                      <p><strong>Trigger:</strong> {rule.trigger_event}</p>
                      <p><strong>Actions:</strong> {rule.actions.length} configured</p>
                    </div>
                  </div>
                ))}

                {(!workflowRules || workflowRules.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No automation rules configured yet.</p>
                    <p className="text-sm">Rules will be created based on workflow patterns.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Role Communication</CardTitle>
              <CardDescription>
                Send notifications and messages across healthcare roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleBulkNotification(['doctor', 'nurse'], 'Urgent: All hands on deck for emergency case')}
                >
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <span>Emergency Broadcast</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleBulkNotification(['pharmacist'], 'New medication order requires review')}
                >
                  <Activity className="h-6 w-6 text-blue-500" />
                  <span>Pharmacy Alert</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleBulkNotification(['lab_technician'], 'Priority lab results pending')}
                >
                  <Activity className="h-6 w-6 text-green-500" />
                  <span>Lab Notification</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={() => handleBulkNotification(['receptionist'], 'Patient check-in queue backup')}
                >
                  <Users className="h-6 w-6 text-orange-500" />
                  <span>Front Desk Alert</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Performance Analytics</CardTitle>
              <CardDescription>
                Insights into workflow efficiency and team performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.role_performance && (
                <div className="space-y-6">
                  <h3 className="font-semibold">Role Performance</h3>
                  {Object.entries(metrics.role_performance).map(([role, performance]) => (
                    <div key={role} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium capitalize">{role.replace('_', ' ')}</span>
                        <span className="text-sm text-muted-foreground">
                          {performance.tasks_completed} tasks completed
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Avg. Time:</span>
                          <span className="ml-2 font-medium">
                            {Math.round(performance.average_time / 60)} min
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Satisfaction:</span>
                          <span className="ml-2 font-medium">
                            {performance.satisfaction_score}/5
                          </span>
                        </div>
                      </div>
                      <Progress value={(performance.satisfaction_score / 5) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              )}

              {!metrics?.role_performance && (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No performance data available yet.</p>
                  <p className="text-sm">Analytics will populate as workflows are completed.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Details Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
              <DialogDescription>
                Task details and status update
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTask.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Badge className={`mt-1 ${getTaskPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <Label>Current Status</Label>
                  <Badge className={`mt-1 ${getTaskStatusColor(selectedTask.status)}`}>
                    {selectedTask.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Due Date</Label>
                <p className="text-sm mt-1">
                  {format(new Date(selectedTask.due_date), 'PPP p')}
                  {isTaskOverdue(selectedTask) && (
                    <Badge variant="destructive" className="ml-2">OVERDUE</Badge>
                  )}
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>Update Status</Label>
                  <Select value={taskStatus} onValueChange={setTaskStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this task update..."
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedTask(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTaskStatusUpdate}
                    disabled={isUpdatingTask || !taskStatus}
                  >
                    {isUpdatingTask ? 'Updating...' : 'Update Task'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}