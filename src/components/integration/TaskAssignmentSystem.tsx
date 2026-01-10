import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Clock, User, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { TaskAssignment, CreateTaskForm, TaskSummary, TaskFilters } from '@/types/integration';

interface TaskAssignmentSystemProps {
  hospitalId: string;
  currentUserId: string;
  currentUserRole: string;
}

export const TaskAssignmentSystem: React.FC<TaskAssignmentSystemProps> = ({ 
  hospitalId, 
  currentUserId, 
  currentUserRole 
}) => {
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [summary, setSummary] = useState<TaskSummary>({
    total_tasks: 0,
    pending_tasks: 0,
    overdue_tasks: 0,
    completed_today: 0,
    high_priority_tasks: 0
  });
  const [filters, setFilters] = useState<TaskFilters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskAssignment | null>(null);
  const [activeTab, setActiveTab] = useState<'assigned' | 'created' | 'all'>('assigned');

  const [createForm, setCreateForm] = useState<CreateTaskForm>({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'normal',
    due_date: ''
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (task: TaskAssignment) => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date() && task.status !== 'completed';
  };

  const handleCreateTask = async () => {
    // Implementation would create task via API
    console.log('Creating task:', createForm);
    setIsCreateModalOpen(false);
    setCreateForm({
      title: '',
      description: '',
      assigned_to: '',
      priority: 'normal',
      due_date: ''
    });
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    // Implementation would update task status via API
    console.log('Updating task status:', taskId, status);
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'assigned' && task.assigned_to !== currentUserId) return false;
    if (activeTab === 'created' && task.assigned_by !== currentUserId) return false;
    
    if (filters.status && !filters.status.includes(task.status)) return false;
    if (filters.priority && !filters.priority.includes(task.priority)) return false;
    if (filters.assigned_to && task.assigned_to !== filters.assigned_to) return false;
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Task Management</h2>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                  placeholder="Task title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="assigned_to">Assign To</Label>
                <Select value={createForm.assigned_to} onValueChange={(value) => setCreateForm({...createForm, assigned_to: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff1">Dr. Smith (Doctor)</SelectItem>
                    <SelectItem value="staff2">Nurse Johnson (Nurse)</SelectItem>
                    <SelectItem value="staff3">Tech Wilson (Lab Tech)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={createForm.priority} onValueChange={(value: any) => setCreateForm({...createForm, priority: value})}>
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
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({...createForm, due_date: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask}>
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">{summary.total_tasks}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pending_tasks}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{summary.overdue_tasks}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">{summary.completed_today}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{summary.high_priority_tasks}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Tabs */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'assigned' ? 'default' : 'outline'}
            onClick={() => setActiveTab('assigned')}
          >
            Assigned to Me
          </Button>
          <Button 
            variant={activeTab === 'created' ? 'default' : 'outline'}
            onClick={() => setActiveTab('created')}
          >
            Created by Me
          </Button>
          <Button 
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            All Tasks
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={filters.status?.[0] || ''} onValueChange={(value) => setFilters({...filters, status: value ? [value] : undefined})}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority?.[0] || ''} onValueChange={(value) => setFilters({...filters, priority: value ? [value] : undefined})}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{task.title}</h4>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      {isOverdue(task) && (
                        <Badge className="bg-red-100 text-red-800">
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Assigned to: {task.assigned_to_profile?.full_name}</span>
                      <span>Created by: {task.assigned_by_profile?.full_name}</span>
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {task.assigned_to === currentUserId && task.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                      >
                        Start
                      </Button>
                    )}
                    {task.assigned_to === currentUserId && task.status === 'in_progress' && (
                      <Button 
                        size="sm"
                        onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                      >
                        Complete
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setSelectedTask(task)}
                    >
                      View
                    </Button>
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