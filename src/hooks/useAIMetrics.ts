/**
 * useAIMetrics - Hook for tracking and querying AI Gateway usage metrics
 * Tier 3.2: AI Gateway usage metrics for observability
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface AIMetricsData {
  id: string;
  hospital_id: string;
  ai_calls_count: number;
  ai_tokens_used: number;
  ai_cost_estimate: number;
  ai_model: string;
  ai_feature: string;
  response_time_ms: number;
  memory_usage_mb: number;
  measured_at: string;
  created_at: string;
}

export interface AIUsageStats {
  total_calls_today: number;
  total_tokens_today: number;
  total_cost_today: number;
  average_response_time_ms: number;
  cost_alert: boolean;
  cost_alert_threshold: number;
}

interface UseAIMetricsReturn {
  metrics: AIMetricsData[];
  stats: AIUsageStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  logAIUsage: (usage: Partial<AIMetricsData>) => Promise<void>;
}

/**
 * Hook to fetch AI metrics from Lovable API and system_metrics table
 */
export function useAIMetrics(enabled: boolean = true): UseAIMetricsReturn {
  const { user, hospital } = useAuth();
  const hospitalId = hospital?.id;
  const [metrics, setMetrics] = useState<AIMetricsData[]>([]);
  const [stats, setStats] = useState<AIUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Threshold for cost alerts (configurable via environment)
  const COST_ALERT_THRESHOLD = parseFloat(
    import.meta.env.VITE_AI_COST_ALERT_THRESHOLD || '100.00'
  );

  // Fetch AI metrics from system_metrics table
  const fetchMetrics = useCallback(async () => {
    if (!hospitalId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch today's metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error: fetchError } = await supabase
        .from('system_metrics')
        .select('*')
        .eq('hospital_id', hospitalId)
        .gte('measured_at', today.toISOString())
        .order('measured_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMetrics(data || []);

      // Calculate aggregate stats
      if (data && data.length > 0) {
        const stats: AIUsageStats = {
          total_calls_today: data.reduce((sum, m) => sum + (m.ai_calls_count || 0), 0),
          total_tokens_today: data.reduce((sum, m) => sum + (m.ai_tokens_used || 0), 0),
          total_cost_today: data.reduce((sum, m) => sum + (m.ai_cost_estimate || 0), 0),
          average_response_time_ms: Math.round(
            data.reduce((sum, m) => sum + (m.response_time_ms || 0), 0) / data.length
          ),
          cost_alert: false,
          cost_alert_threshold: COST_ALERT_THRESHOLD,
        };

        // Check if cost exceeds threshold
        if (stats.total_cost_today > COST_ALERT_THRESHOLD) {
          stats.cost_alert = true;
          toast.warning(
            `AI usage cost alert: $${stats.total_cost_today.toFixed(2)} > $${COST_ALERT_THRESHOLD.toFixed(2)} threshold`,
            { duration: 8000 }
          );
        }

        setStats(stats);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      toast.error(`Failed to fetch AI metrics: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, enabled, COST_ALERT_THRESHOLD]);

  // Log AI usage to system_metrics table
  const logAIUsage = useCallback(
    async (usage: Partial<AIMetricsData>) => {
      if (!hospitalId || !user) return;

      try {
        const { error: insertError } = await supabase
          .from('system_metrics')
          .insert([
            {
              hospital_id: hospitalId,
              ai_calls_count: usage.ai_calls_count || 0,
              ai_tokens_used: usage.ai_tokens_used || 0,
              ai_cost_estimate: usage.ai_cost_estimate || 0,
              ai_model: usage.ai_model || 'lovable-ai',
              ai_feature: usage.ai_feature || 'unknown',
              response_time_ms: usage.response_time_ms || 0,
              memory_usage_mb: usage.memory_usage_mb || 0,
              measured_at: usage.measured_at || new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ]);

        if (insertError) throw insertError;

        // Refetch to update stats
        await fetchMetrics();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to log AI usage:', error);
        toast.error(`Failed to log AI usage: ${error.message}`);
      }
    },
    [hospitalId, user, fetchMetrics]
  );

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      fetchMetrics();
      // Poll every 5 minutes for updates
      const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [enabled, fetchMetrics]);

  return {
    metrics,
    stats,
    isLoading,
    error,
    refetch: fetchMetrics,
    logAIUsage,
  };
}

/**
 * Hook to query Lovable AI API for usage statistics (if available)
 * Note: This requires Lovable API key in environment
 */
export function useLovableAIStats() {
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLovableStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_LOVABLE_API_KEY;
      if (!apiKey) {
        throw new Error('Lovable API key not configured');
      }

      // Example: Query Lovable AI usage endpoint
      // Adjust based on actual Lovable API documentation
      const response = await fetch('https://api.lovable.dev/v1/usage', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Lovable API returned ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.warn('Could not fetch Lovable AI stats:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stats,
    isLoading,
    error,
    fetch: fetchLovableStats,
  };
}
