import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TaskAssignment, CreateTaskAssignmentData, UpdateTaskAssignmentData } from '@/types/enhancement';

export function useTaskAssignments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch task assignments for current user/hospital
  const {
    data: taskAssignments,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['task-assignments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          assigned_by_profile:profiles!task_assignments_assigned_by_fkey(first_name, last_name),
          assigned_to_profile:profiles!task_assignments_assigned_to_fkey(first_name, last_name),
          patient:patients(first_name, last_name, mrn)
        `)
        .eq('hospital_id', profile?.hospital_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskAssignment[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Fetch tasks assigned to current user
  const {
    data: myTasks,
    isLoading: isLoadingMyTasks
  } = useQuery({
    queryKey: ['my-tasks', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          assigned_by_profile:profiles!task_assignments_assigned_by_fkey(first_name, last_name),
          patient:patients(first_name, last_name, mrn)
        `)
        .eq('assigned_to', profile?.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true, nullsLast: true });

      if (error) throw error;
      return data as TaskAssignment[];
    },
    enabled: !!profile?.id,
  });

  // Create task assignment
  const createTaskAssignment = useMutation({
    mutationFn: async (data: CreateTaskAssignmentData) => {
      const { data: result, error } = await supabase
        .from('task_assignments')
        .insert({
          ...data,
          assigned_by: profile?.id,
          hospital_id: profile?.hospital_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({
        title: "Task Assigned",
        description: "Task has been assigned successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating task assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create task assignment. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Update task assignment
  const updateTaskAssignment = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskAssignmentData }) => {
      const updateData = { ...data };
      if (data.status === 'completed' && !data.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: result, error } = await supabase
        .from('task_assignments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({
        title: "Task Updated",
        description: "Task has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating task assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update task assignment. Please try again.",
        variant: "destructive"
      });
    },
  });

  return {
    taskAssignments,
    myTasks,
    isLoading,
    isLoadingMyTasks,
    error,
    refetch,
    createTaskAssignment: createTaskAssignment.mutate,
    isCreating: createTaskAssignment.isPending,
    updateTaskAssignment: updateTaskAssignment.mutate,
    isUpdating: updateTaskAssignment.isPending,
  };
}