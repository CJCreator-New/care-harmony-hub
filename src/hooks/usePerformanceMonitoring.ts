import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  value: number;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
  metadata: Record<string, any>;
  created_at: string;
}

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  created_at: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  response_time: number;
  error_rate: number;
  last_check: string;
}

export const usePerformanceMonitoring = () => {
  const auth = useAuth();
  const profile = auth?.profile;

  // Get performance metrics
  const { data: metrics } = useQuery({
    queryKey: ['performance-metrics', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];
      
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as PerformanceMetric[];
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 30000,
  });

  // Get error logs
  const { data: errors } = useQuery({
    queryKey: ['error-logs', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];
      
      const { data, error } = await supabase
        .from('error_tracking')
        .select('*')
        .eq('hospital_id', profile.hospital_id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ErrorLog[];
    },
    enabled: !!profile?.hospital_id,
  });

  // Get system health
  const { data: systemHealth } = useQuery({
    queryKey: ['system-health', profile?.hospital_id],
    queryFn: async () => {
      // Mock system health check - in production, this would check actual system metrics
      const health: SystemHealth = {
        status: 'healthy',
        uptime: 99.9,
        response_time: 245,
        error_rate: 0.1,
        last_check: new Date().toISOString()
      };
      return health;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 60000, // Check every minute
  });

  // Log performance metric
  const logMetric = useMutation({
    mutationFn: async (metric: {
      metric_type: string;
      metric_name: string;
      value: number;
      threshold?: number;
      metadata?: Record<string, any>;
    }) => {
      if (!profile?.hospital_id) throw new Error('No hospital ID');
      
      const status = metric.threshold 
        ? metric.value > metric.threshold * 2 ? 'critical'
          : metric.value > metric.threshold ? 'warning' 
          : 'good'
        : 'good';

      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          ...metric,
          hospital_id: profile.hospital_id,
          status
        });
      
      if (error) throw error;
    }
  });

  // Log error
  const logError = useMutation({
    mutationFn: async (errorData: {
      error_type: string;
      error_message: string;
      stack_trace?: string;
      url?: string;
      user_agent?: string;
      severity?: string;
    }) => {
      if (!profile?.hospital_id) throw new Error('No hospital ID');
      
      const { error } = await supabase
        .from('error_tracking')
        .insert({
          ...errorData,
          hospital_id: profile.hospital_id,
          user_id: profile.user_id
        });
      
      if (error) throw error;
    }
  });

  // Optimize database
  const optimizeDatabase = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('optimize_database_performance');
      if (error) throw error;
    }
  });

  // Check system health
  const checkSystemHealth = useMutation({
    mutationFn: async () => {
      // Mock system health check - in production, this would perform actual health checks
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate check time
      return {
        status: 'healthy' as const,
        uptime: 99.9,
        response_time: Math.random() * 100 + 200,
        error_rate: Math.random() * 0.5,
        last_check: new Date().toISOString()
      };
    }
  });

  return {
    metrics: metrics || [],
    errors: errors || [],
    systemHealth,
    logMetric: logMetric.mutate,
    logError: logError.mutate,
    checkSystemHealth: checkSystemHealth.mutate,
    optimizeDatabase: optimizeDatabase.mutate,
    isOptimizing: optimizeDatabase.isPending,
    isCheckingHealth: checkSystemHealth.isPending
  };
};