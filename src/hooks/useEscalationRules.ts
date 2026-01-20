import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EscalationRule {
  id: string;
  rule_name: string;
  trigger_condition: Record<string, any>;
  escalation_action: Record<string, any>;
  target_role?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  active: boolean;
}

export function useEscalationRules() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['escalation-rules', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as EscalationRule[];
    },
    enabled: !!hospital?.id,
  });

  const evaluateRules = async (event: string, data: Record<string, any>) => {
    if (!rules) return;

    for (const rule of rules) {
      if (shouldTrigger(rule, event, data)) {
        await executeAction(rule, data);
      }
    }
  };

  const shouldTrigger = (rule: EscalationRule, event: string, data: Record<string, any>): boolean => {
    const condition = rule.trigger_condition;
    
    // Queue length check
    if (condition.queue_length && data.queue_length) {
      const operator = Object.keys(condition.queue_length)[0];
      const threshold = condition.queue_length[operator];
      
      if (operator === '$gt' && data.queue_length > threshold) return true;
      if (operator === '$gte' && data.queue_length >= threshold) return true;
    }

    // Wait time check
    if (condition.wait_time && data.wait_time) {
      const operator = Object.keys(condition.wait_time)[0];
      const threshold = condition.wait_time[operator];
      
      if (operator === '$gt' && data.wait_time > threshold) return true;
    }

    return false;
  };

  const executeAction = async (rule: EscalationRule, data: Record<string, any>) => {
    const action = rule.escalation_action;

    if (action.type === 'send_notification') {
      await supabase.from('notifications').insert({
        hospital_id: hospital?.id,
        recipient_role: rule.target_role,
        type: 'alert',
        title: action.title || 'Escalation Alert',
        message: action.message || 'Workflow escalation triggered',
        priority: rule.priority,
        category: 'workflow',
      });

      toast.warning(`Escalation: ${rule.rule_name}`);
    }

    // Update trigger count
    await supabase
      .from('escalation_rules')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: supabase.rpc('increment', { row_id: rule.id }),
      })
      .eq('id', rule.id);
  };

  const createRuleMutation = useMutation({
    mutationFn: async (rule: Omit<EscalationRule, 'id'>) => {
      const { data, error } = await supabase
        .from('escalation_rules')
        .insert([{ ...rule, hospital_id: hospital?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-rules'] });
      toast.success('Escalation rule created');
    },
  });

  return {
    rules,
    isLoading,
    evaluateRules,
    createRule: createRuleMutation.mutate,
    isCreating: createRuleMutation.isPending,
  };
}
