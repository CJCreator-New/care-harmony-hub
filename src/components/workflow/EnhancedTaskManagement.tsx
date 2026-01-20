import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Clock, AlertCircle, Filter, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function EnhancedTaskManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('due_date');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['enhanced-tasks', profile?.user_id, priorityFilter, statusFilter, sortBy],
    queryFn: async () => {
      if (!profile?.user_id) return [];

      let query = supabase
        .from('task_assignments')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn),
          assigned_by_profile:profiles!task_assignments_assigned_by_fkey(first_name, last_name)
        `)
        .eq('assigned_to', profile.user_id);

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      query = query.order(sortBy, { ascending: sortBy === 'due_date' });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id,
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase
        .from('task_assignments')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-tasks'] });
      toast({ title: 'Task status updated' });
    },
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
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && isOverdue(t.due_date)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>My Tasks</span>
          <div className="flex gap-2">
            <Badge variant="secondary">{pendingCount} pending</Badge>
            <Badge variant="default">{inProgressCount} in progress</Badge>
            {overdueCount > 0 && <Badge variant="destructive">{overdueCount} overdue</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created_at">Created Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="text-center py-8">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No tasks found</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className={`p-4 border rounded-lg space-y-3 ${
                    task.status !== 'completed' && isOverdue(task.due_date)
                      ? 'border-destructive/50 bg-destructive/5'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(task.status)}
                        <span className="font-medium">{task.title}</span>
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {task.auto_assigned && (
                          <Badge variant="outline">Auto-assigned</Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {task.patient && (
                          <span>
                            Patient: {task.patient.first_name} {task.patient.last_name} (MRN: {task.patient.mrn})
                          </span>
                        )}
                        {task.assigned_by_profile && (
                          <span>
                            • Assigned by: {task.assigned_by_profile.first_name} {task.assigned_by_profile.last_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        <span className={isOverdue(task.due_date) && task.status !== 'completed' ? 'text-destructive font-medium' : ''}>
                          Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: 'in_progress' })}
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: 'completed' })}
                      >
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
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
