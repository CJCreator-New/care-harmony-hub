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

  const { data: recentAlerts } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('resolved', false)
        .order('timestamp', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as SystemAlert[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          acknowledged: true, 
          acknowledged_at: new Date().toISOString() 
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