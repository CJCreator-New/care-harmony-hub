import { useState } from 'react';
import { useNurseTasks, NurseTask } from '@/hooks/useNurseTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Filter, 
  Search,
  User,
  Calendar,
  Play,
  Trash2,
  Plus,
  Pill,
  Activity,
  FileText,
  RefreshCw,
  ArrowUpDown
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NurseTaskPanelProps {
  patientId?: string;
  compact?: boolean;
}

export function NurseTaskPanel({ patientId, compact = false }: NurseTaskPanelProps) {
  const { 
    tasks, 
    loading, 
    createTask, 
    updateTaskStatus, 
    deleteTask, 
    filterTasks, 
    getTaskStats,
    refetch 
  } = useNurseTasks(patientId);

  const [statusFilter, setStatusFilter] = useState<NurseTask['status'] | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<NurseTask['priority'] | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<NurseTask['task_type'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as NurseTask['priority'],
    task_type: 'other' as NurseTask['task_type'],
    due_date: '',
  });

  const stats = getTaskStats();
  const filteredTasks = filterTasks({
    status: statusFilter,
    priority: priorityFilter,
    taskType: typeFilter,
    searchTerm,
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getTaskTypeIcon = (type?: string) => {
    switch (type) {
      case 'medication': return <Pill className="h-4 w-4" />;
      case 'vital_check': return <Activity className="h-4 w-4" />;
      case 'documentation': return <FileText className="h-4 w-4" />;
      default: return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;
    
    await createTask({
      ...newTask,
      patient_id: patientId,
    });
    
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      task_type: 'other',
      due_date: '',
    });
    setIsCreateOpen(false);
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              My Tasks
            </span>
            <div className="flex gap-2">
              {stats.urgent > 0 && (
                <Badge variant="destructive">{stats.urgent} urgent</Badge>
              )}
              {stats.overdue > 0 && (
                <Badge variant="warning">{stats.overdue} overdue</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tasks found</p>
              </div>
            ) : (
              filteredTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${
                    task.status !== 'completed' && isOverdue(task.due_date)
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'border-border'
                  }`}
                >
                  {getStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.patient_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {task.patient_name}
                      </p>
                    )}
                  </div>
                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              ))
            )}
          </div>
          {filteredTasks.length > 5 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              +{filteredTasks.length - 5} more tasks
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Task Management
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Task title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Task description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(v) => setNewTask({ ...newTask, priority: v as NurseTask['priority'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newTask.task_type}
                        onValueChange={(v) => setNewTask({ ...newTask, task_type: v as NurseTask['task_type'] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medication">Medication</SelectItem>
                          <SelectItem value="vital_check">Vital Check</SelectItem>
                          <SelectItem value="patient_prep">Patient Prep</SelectItem>
                          <SelectItem value="documentation">Documentation</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateTask} className="w-full">
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold text-destructive">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[130px]">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
            <SelectTrigger className="w-[130px]">
              <ArrowUpDown className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tasks found</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 border rounded-lg space-y-2 ${
                    task.status !== 'completed' && isOverdue(task.due_date)
                      ? 'border-destructive/50 bg-destructive/5'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                        {task.priority}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {task.patient_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.patient_name}
                        {task.patient_mrn && ` (${task.patient_mrn})`}
                      </span>
                    )}
                    {task.task_type && (
                      <span className="flex items-center gap-1">
                        {getTaskTypeIcon(task.task_type)}
                        {task.task_type.replace('_', ' ')}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue(task.due_date) && task.status !== 'completed' ? 'text-destructive font-medium' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                    )}
                    {task.status === 'completed' && (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
