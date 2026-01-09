import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemMetric {
  id: string;
  timestamp: string;
  service: string;
  metric_name: string;
  value: number;
  status: string;
}

interface SystemAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export function useSystemMonitoring() {
  const queryClient = useQueryClient();

  const { data: systemStatus, isLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('monitoring', {
        body: { action: 'get_status' }
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Use activity_logs as a fallback for system alerts since system_alerts table doesn't exist
  const { data: recentAlerts } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action_type, details, created_at, severity')
        .in('severity', ['high', 'critical'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Transform to SystemAlert format
      return (data || []).map(log => ({
        id: log.id,
        severity: (log.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
        message: (log.details as any)?.message || log.action_type,
        timestamp: log.created_at,
        acknowledged: false,
      })) as SystemAlert[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      // Update activity_log entry with acknowledged status in details
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
            acknowledged_at: new Date().toISOString()
          }
        })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
    },
  });

  const collectMetrics = useMutation({
    mutationFn: async (metrics: Omit<SystemMetric, 'id'>[]) => {
      const { data, error } = await supabase.functions.invoke('monitoring', {
        body: { action: 'collect_metrics', data: metrics }
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    systemStatus,
    recentAlerts,
    isLoading,
    acknowledgeAlert: acknowledgeAlert.mutate,
    collectMetrics: collectMetrics.mutate,
    isAcknowledging: acknowledgeAlert.isPending,
  };
}
