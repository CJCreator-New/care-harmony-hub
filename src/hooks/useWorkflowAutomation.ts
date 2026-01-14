import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string;
  assigned_role: string;
  created_by: string;
  due_date: string;
  completed_at?: string;
  workflow_type: string;
  patient_id?: string;
  related_entity_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger_event: string;
  conditions: Record<string, any>;
  actions: WorkflowAction[];
  active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowAction {
  type: 'assign_task' | 'send_notification' | 'update_status' | 'create_appointment' | 'send_message';
  target_role?: string;
  target_user?: string;
  message?: string;
  task_template?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface CommunicationMessage {
  id: string;
  sender_id: string;
  sender_role: string;
  recipient_id?: string;
  recipient_role?: string;
  message_type: 'task_assignment' | 'status_update' | 'urgent_alert' | 'general' | 'patient_update';
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  read_at?: string;
  patient_id?: string;
  related_entity_id?: string;
  created_at: string;
}

export interface WorkflowMetrics {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  average_completion_time: number;
  role_performance: Record<string, {
    tasks_completed: number;
    average_time: number;
    satisfaction_score: number;
  }>;
}

export function useWorkflowAutomation() {
  const { profile, hospital } = useAuth();
  const queryClient = useQueryClient();

  // Get workflow tasks for current user
  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['workflow-tasks', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('assigned_to', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WorkflowTask[];
    },
    enabled: !!profile?.id,
  });

  // Get workflow tasks by role (for managers)
  const { data: roleTasks, isLoading: roleTasksLoading } = useQuery({
    queryKey: ['workflow-tasks-role', profile?.role, hospital?.id],
    queryFn: async () => {
      if (!profile?.role || !hospital?.id) return [];

      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('assigned_role', profile.role)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as WorkflowTask[];
    },
    enabled: !!profile?.role && !!hospital?.id,
  });

  // Get workflow rules
  const { data: workflowRules, isLoading: rulesLoading } = useQuery({
    queryKey: ['workflow-rules', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('workflow_rules')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as WorkflowRule[];
    },
    enabled: !!hospital?.id,
  });

  // Update task status
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: string; status: WorkflowTask['status']; notes?: string }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.metadata = { ...updateData.metadata, completion_notes: notes };
      }

      const { data, error } = await supabase
        .from('workflow_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });
      toast.success(`Task ${data.status === 'completed' ? 'completed' : 'updated'} successfully`);

      // Trigger workflow automation
      triggerWorkflowAutomation('task_status_changed', {
        task_id: data.id,
        old_status: data.status,
        new_status: data.status,
        assigned_role: data.assigned_role,
        patient_id: data.patient_id,
      });
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    },
  });

  // Create automated task
  const createAutomatedTaskMutation = useMutation({
    mutationFn: async (task: Omit<WorkflowTask, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .insert([{
          ...task,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });
      toast.success('Automated task created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create automated task: ' + error.message);
    },
  });

  // Assign task to user
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, userId, role }: { taskId: string; userId: string; role: string }) => {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .update({
          assigned_to: userId,
          assigned_role: role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as WorkflowTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-tasks'] });
      toast.success('Task assigned successfully');
    },
    onError: (error) => {
      toast.error('Failed to assign task: ' + error.message);
    },
  });

  // Trigger workflow automation
  const triggerWorkflowAutomation = async (event: string, data: Record<string, any>) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('workflow-automation', {
        body: {
          event,
          data,
          hospital_id: hospital?.id,
        }
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error('Workflow automation trigger failed:', error);
    }
  };

// Get workflow metrics query
  const workflowMetricsQuery = useQuery({
    queryKey: ['workflow-metrics', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return null;

      const { data, error } = await supabase.rpc('get_workflow_metrics', {
        p_hospital_id: hospital.id,
      });

      if (error) throw error;
      return data as WorkflowMetrics;
    },
    enabled: !!hospital?.id,
  });

  // Get overdue tasks query
  const overdueTasksQuery = useQuery({
    queryKey: ['overdue-tasks', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('hospital_id', hospital.id)
        .lt('due_date', new Date().toISOString())
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as WorkflowTask[];
    },
    enabled: !!hospital?.id,
  });

  // Get workflow metrics (return the query object)
  const getWorkflowMetrics = () => {
    return workflowMetricsQuery;
  };

  // Get overdue tasks (return the query object)
  const getOverdueTasks = () => {
    return overdueTasksQuery;
  };

  return {
    myTasks,
    roleTasks,
    workflowRules,
    isLoading: tasksLoading || roleTasksLoading || rulesLoading,
    updateTaskStatus: updateTaskStatusMutation.mutate,
    createAutomatedTask: createAutomatedTaskMutation.mutate,
    assignTask: assignTaskMutation.mutate,
    triggerWorkflowAutomation,
    getWorkflowMetrics,
    getOverdueTasks,
    isUpdatingTask: updateTaskStatusMutation.isPending,
    isCreatingTask: createAutomatedTaskMutation.isPending,
    isAssigningTask: assignTaskMutation.isPending,
  };
}