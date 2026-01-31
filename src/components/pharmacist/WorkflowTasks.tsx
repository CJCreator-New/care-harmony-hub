import { useState } from 'react';
import { useWorkflowAutomation } from '@/hooks/useWorkflowAutomation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function WorkflowTasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const { roleTasks, isLoading, updateTaskStatus } = useWorkflowAutomation();

  const filteredTasks = roleTasks?.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTaskAction = async (taskId: string, action: 'approve' | 'reject' | 'complete') => {
    try {
      await updateTaskStatus.mutateAsync({
        taskId,
        status: action === 'complete' ? 'completed' : action === 'approve' ? 'in_progress' : 'cancelled'
      });
      toast.success(`Task ${action === 'complete' ? 'completed' : action === 'approve' ? 'started' : 'rejected'}`);
    } catch (error) {
      toast.error(`Failed to ${action} task`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed': return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'normal': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'low': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Tasks</CardTitle>
          <CardDescription>Automated tasks assigned to pharmacy team</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading tasks...
                  </TableCell>
                </TableRow>
              ) : filteredTasks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No tasks found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks?.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{task.title}</div>
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(task.priority)}
                        <span className="capitalize">{task.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(task.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTaskAction(task.id, 'complete')}
                        disabled={task.status === 'completed'}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}