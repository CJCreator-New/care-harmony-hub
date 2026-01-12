import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useIntelligentTaskRouter } from '@/hooks/useIntelligentTaskRouter';
import { Brain, Users, Clock, TrendingUp } from 'lucide-react';

const IntelligentTaskAssignmentDemo = () => {
  const { routingRules, workloadMetrics, assignTaskIntelligently, isAssigning } = useIntelligentTaskRouter();
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    task_type: '',
    priority: 'normal',
    due_date: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskData.title || !taskData.task_type) return;
    
    assignTaskIntelligently(taskData);
    setTaskData({
      title: '',
      description: '',
      task_type: '',
      priority: 'normal',
      due_date: ''
    });
  };

  const taskTypes = routingRules?.map(rule => rule.task_type) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Intelligent Task Assignment System
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={taskData.title}
                  onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="task_type">Task Type</Label>
                <Select 
                  value={taskData.task_type} 
                  onValueChange={(value) => setTaskData(prev => ({ ...prev, task_type: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={taskData.priority} 
                  onValueChange={(value) => setTaskData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={taskData.description}
                  onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="due_date">Due Date (Optional)</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={taskData.due_date}
                  onChange={(e) => setTaskData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <Button type="submit" disabled={isAssigning} className="w-full">
                {isAssigning ? 'Assigning...' : 'Assign Task Intelligently'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Workload Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Team Workload Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workloadMetrics?.map(metric => (
                <div key={metric.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">User {metric.user_id.slice(0, 8)}...</p>
                    <p className="text-sm text-gray-600">
                      {metric.active_tasks} active tasks
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={metric.current_capacity > 70 ? 'default' : 
                               metric.current_capacity > 40 ? 'secondary' : 'destructive'}
                    >
                      {metric.current_capacity}% capacity
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Avg: {Math.round(metric.avg_completion_time)}min
                    </p>
                  </div>
                </div>
              ))}
              {!workloadMetrics?.length && (
                <p className="text-gray-500 text-center py-4">No workload data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Routing Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Task Routing Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routingRules?.map(rule => (
              <div key={rule.id} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">
                  {rule.task_type.replace('_', ' ').toUpperCase()}
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Priority Roles:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rule.role_priority.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Threshold:</span>
                    <span className="ml-1">{rule.workload_threshold}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Auto-assign:</span>
                    <Badge variant={rule.auto_assign ? 'default' : 'secondary'} className="ml-1 text-xs">
                      {rule.auto_assign ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntelligentTaskAssignmentDemo;