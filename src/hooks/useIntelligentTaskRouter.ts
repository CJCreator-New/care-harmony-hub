import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeLogMessage } from '@/utils/sanitize';

interface TaskRoutingRule {
  id: string;
  task_type: string;
  role_priority: string[];
  workload_threshold: number;
  skill_requirements: string[];
  auto_assign: boolean;
}

interface WorkloadMetric {
  user_id: string;
  active_tasks: number;
  avg_completion_time: number;
  current_capacity: number;
}

export const useIntelligentTaskRouter = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get routing rules
  const { data: routingRules } = useQuery({
    queryKey: ['task-routing-rules', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_routing_rules')
        .select('*')
        .eq('hospital_id', profile?.hospital_id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as TaskRoutingRule[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Get current workload metrics
  const { data: workloadMetrics } = useQuery({
    queryKey: ['workload-metrics', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_user_workloads', {
          hospital_id_param: profile?.hospital_id
        });
      
      if (error) throw error;
      return data as WorkloadMetric[];
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Intelligent task assignment
  const assignTaskIntelligently = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description: string;
      task_type: string;
      priority: string;
      patient_id?: string;
      due_date?: string;
    }) => {
      // Find optimal assignee
      const optimalAssignee = await findOptimalAssignee(
        taskData.task_type,
        routingRules || [],
        workloadMetrics || []
      );

      // Create task with intelligent assignment
      const { data, error } = await supabase
        .from('task_assignments')
        .insert({
          ...taskData,
          assigned_by: profile?.id,
          assigned_to: optimalAssignee.user_id,
          hospital_id: profile?.hospital_id,
          auto_assigned: true,
          assignment_reason: optimalAssignee.reason,
          estimated_completion: optimalAssignee.estimated_completion
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to assignee
      await supabase.from('notifications').insert({
        recipient_id: optimalAssignee.user_id,
        title: `New Task Assigned: ${taskData.title}`,
        message: `You have been automatically assigned a ${taskData.task_type} task.`,
        type: 'task_assignment',
        hospital_id: profile?.hospital_id
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['workload-metrics'] });
      toast({
        title: "Task Assigned Intelligently",
        description: "Task has been automatically assigned to the optimal team member.",
      });
    },
    onError: (error) => {
      console.error('Error in intelligent task assignment:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Assignment Failed",
        description: "Failed to assign task automatically. Please assign manually.",
        variant: "destructive"
      });
    }
  });

  return {
    routingRules,
    workloadMetrics,
    assignTaskIntelligently: assignTaskIntelligently.mutate,
    isAssigning: assignTaskIntelligently.isPending
  };
};

// Helper function for optimal assignee selection
async function findOptimalAssignee(
  taskType: string,
  rules: TaskRoutingRule[],
  workloads: WorkloadMetric[]
) {
  const rule = rules.find(r => r.task_type === taskType);
  if (!rule) {
    throw new Error(`No routing rule found for task type: ${taskType}`);
  }

  // Get users by role priority
  const { data: eligibleUsers, error } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name')
    .in('role', rule.role_priority)
    .eq('is_staff', true);

  if (error || !eligibleUsers?.length) {
    throw new Error('No eligible users found for this task type');
  }

  // Filter by workload capacity
  const availableUsers = workloads.filter(w => 
    eligibleUsers.some(u => u.user_id === w.user_id) &&
    w.current_capacity > rule.workload_threshold
  );

  if (availableUsers.length === 0) {
    // Fallback to user with highest capacity
    const fallbackUser = workloads
      .filter(w => eligibleUsers.some(u => u.user_id === w.user_id))
      .reduce((best, current) => 
        current.current_capacity > best.current_capacity ? current : best
      );
    
    return {
      user_id: fallbackUser.user_id,
      reason: `Assigned to user with highest available capacity (${fallbackUser.current_capacity}%)`,
      estimated_completion: new Date(Date.now() + fallbackUser.avg_completion_time * 60000).toISOString()
    };
  }

  // Select user with best capacity/performance ratio
  const optimalUser = availableUsers.reduce((best, current) => 
    (current.current_capacity / current.avg_completion_time) > 
    (best.current_capacity / best.avg_completion_time) ? current : best
  );

  return {
    user_id: optimalUser.user_id,
    reason: `Selected based on capacity (${optimalUser.current_capacity}%) and performance`,
    estimated_completion: new Date(Date.now() + optimalUser.avg_completion_time * 60000).toISOString()
  };
}
