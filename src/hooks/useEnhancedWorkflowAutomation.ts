import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useEnhancedWorkflowAutomation = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workflowMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['workflow-metrics', profile?.hospital_id],
    queryFn: async () => {
      const [tasksResult, automationResult] = await Promise.all([
        supabase
          .from('task_assignments')
          .select('*')
          .eq('hospital_id', profile?.hospital_id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('workflow_automation_rules')
          .select('*')
          .eq('hospital_id', profile?.hospital_id)
          .eq('is_active', true),
      ]);

      const tasks = tasksResult.data || [];
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const autoAssignedTasks = tasks.filter(t => t.auto_assigned);

      return {
        task_completion_rate: tasks.length > 0 ? completedTasks.length / tasks.length : 0,
        avg_completion_time: completedTasks.length > 0
          ? completedTasks.reduce((sum, t) => {
              if (t.completed_at && t.created_at) {
                return sum + (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 60000;
              }
              return sum;
            }, 0) / completedTasks.length
          : 0,
        auto_assigned_today: autoAssignedTasks.filter(t =>
          new Date(t.created_at).toDateString() === new Date().toDateString()
        ).length,
        automation_success_rate: autoAssignedTasks.length > 0
          ? autoAssignedTasks.filter(t => t.status === 'completed').length / autoAssignedTasks.length
          : 0,
        time_saved_minutes: autoAssignedTasks.length * 5,
        active_staff_count: 0,
        completion_trend: 0,
        time_trend: 0,
      };
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 30000,
  });

  const { data: automationRules = [] } = useQuery({
    queryKey: ['automation-rules', profile?.hospital_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_automation_rules')
        .select('*')
        .eq('hospital_id', profile?.hospital_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hospital_id,
  });

  const createAutomationRule = useMutation({
    mutationFn: async (ruleData: {
      rule_name: string;
      rule_type: string;
      trigger_conditions: any;
      actions: any;
    }) => {
      const { error } = await supabase.from('workflow_automation_rules').insert({
        ...ruleData,
        hospital_id: profile?.hospital_id,
        created_by: profile?.id,
        is_active: true,
        execution_count: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Automation rule created successfully' });
    },
  });

  const updateAutomationRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('workflow_automation_rules')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Automation rule updated' });
    },
  });

  const deleteAutomationRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_automation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      toast({ title: 'Automation rule deleted' });
    },
  });

  const executeAutomationRule = useMutation({
    mutationFn: async ({ ruleId, triggerData }: { ruleId: string; triggerData: any }) => {
      const { error } = await supabase.from('automated_task_executions').insert({
        hospital_id: profile?.hospital_id,
        rule_id: ruleId,
        execution_status: 'pending',
        trigger_data: triggerData,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Automation rule executed' });
    },
  });

  return {
    workflowMetrics,
    metricsLoading,
    automationRules,
    createAutomationRule: createAutomationRule.mutate,
    updateAutomationRule: updateAutomationRule.mutate,
    deleteAutomationRule: deleteAutomationRule.mutate,
    executeAutomationRule: executeAutomationRule.mutate,
    isCreating: createAutomationRule.isPending,
    isUpdating: updateAutomationRule.isPending,
    isDeleting: deleteAutomationRule.isPending,
  };
};
