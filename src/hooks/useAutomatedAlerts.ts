import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SystemAlert, AlertRule } from '@/types/monitoring';
import { useToast } from '@/hooks/use-toast';

export function useAutomatedAlerts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch active alerts with real-time subscription
  const { data: activeAlerts, isLoading } = useQuery({
    queryKey: ['automated-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .in('severity', ['medium', 'high', 'critical'])
        .is('details->>acknowledged', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        severity: (log.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        message: (log.details as any)?.message || log.action_type,
        timestamp: log.created_at,
        acknowledged: (log.details as any)?.acknowledged || false,
        acknowledged_by: (log.details as any)?.acknowledged_by,
        acknowledged_at: (log.details as any)?.acknowledged_at,
        category: (log.details as any)?.category || 'system',
        source: log.action_type,
      })) as SystemAlert[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch alert rules
  const { data: alertRules } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      // For now, return default rules - can be moved to database later
      return [
        {
          id: '1',
          name: 'High Wait Time',
          metric_name: 'avg_wait_time',
          condition: 'greater_than' as const,
          threshold: 30,
          severity: 'high' as const,
          enabled: true,
          notification_channels: ['in_app', 'email'] as ('email' | 'sms' | 'in_app')[],
        },
        {
          id: '2',
          name: 'Low System Performance',
          metric_name: 'response_time',
          condition: 'greater_than' as const,
          threshold: 2000,
          severity: 'critical' as const,
          enabled: true,
          notification_channels: ['in_app', 'sms'] as ('email' | 'sms' | 'in_app')[],
        },
        {
          id: '3',
          name: 'High Error Rate',
          metric_name: 'error_rate',
          condition: 'greater_than' as const,
          threshold: 5,
          severity: 'high' as const,
          enabled: true,
          notification_channels: ['in_app'] as ('email' | 'sms' | 'in_app')[],
        },
      ] as AlertRule[];
    },
  });

  // Acknowledge alert
  const acknowledgeAlert = useMutation({
    mutationFn: async ({ alertId, userId }: { alertId: string; userId: string }) => {
      const { data: existing, error: fetchError } = await supabase
        .from('activity_logs')
        .select('details')
        .eq('id', alertId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('activity_logs')
        .update({
          details: {
            ...(existing?.details as object || {}),
            acknowledged: true,
            acknowledged_by: userId,
            acknowledged_at: new Date().toISOString(),
          },
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automated-alerts'] });
      toast({
        title: 'Alert Acknowledged',
        description: 'The alert has been marked as acknowledged.',
      });
    },
  });

  // Create new alert
  const createAlert = useMutation({
    mutationFn: async (alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged'>) => {
      const { error } = await supabase.from('activity_logs').insert({
        action_type: alert.source,
        severity: alert.severity,
        details: {
          message: alert.message,
          category: alert.category,
          acknowledged: false,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automated-alerts'] });
    },
  });

  // Evaluate metric against rules
  const evaluateMetric = (metricName: string, value: number) => {
    if (!alertRules) return;

    alertRules.forEach(rule => {
      if (!rule.enabled || rule.metric_name !== metricName) return;

      let shouldAlert = false;
      switch (rule.condition) {
        case 'greater_than':
          shouldAlert = value > rule.threshold;
          break;
        case 'less_than':
          shouldAlert = value < rule.threshold;
          break;
        case 'equals':
          shouldAlert = value === rule.threshold;
          break;
        case 'not_equals':
          shouldAlert = value !== rule.threshold;
          break;
      }

      if (shouldAlert) {
        createAlert.mutate({
          severity: rule.severity,
          message: `${rule.name}: ${metricName} is ${value} (threshold: ${rule.threshold})`,
          category: 'system',
          source: 'automated_rule',
        });
      }
    });
  };

  return {
    activeAlerts,
    alertRules,
    isLoading,
    acknowledgeAlert: acknowledgeAlert.mutate,
    createAlert: createAlert.mutate,
    evaluateMetric,
    isAcknowledging: acknowledgeAlert.isPending,
  };
}
