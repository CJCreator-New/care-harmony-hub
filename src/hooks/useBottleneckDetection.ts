import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Bottleneck {
  stage_name: string;
  avg_wait_time: number;
  queue_length: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export function useBottleneckDetection() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['bottleneck-detection', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase.rpc('detect_workflow_bottlenecks', {
        p_hospital_id: hospital.id,
        p_threshold_minutes: 30,
      });

      if (error) throw error;

      return (data as any[]).map((item) => ({
        stage_name: item.stage_name,
        avg_wait_time: item.avg_wait_time,
        queue_length: item.queue_length,
        severity: item.severity,
        recommendation: getRecommendation(item.stage_name, item.severity),
      })) as Bottleneck[];
    },
    enabled: !!hospital?.id,
    refetchInterval: 300000, // Refresh every 5 minutes
  });
}

function getRecommendation(stage: string, severity: string): string {
  const recommendations: Record<string, Record<string, string>> = {
    checked_in: {
      medium: 'Consider adding self-check-in kiosk',
      high: 'Add additional receptionist staff',
      critical: 'Immediate staffing intervention required',
    },
    triage_started: {
      medium: 'Review nurse staffing levels',
      high: 'Add nurse or implement parallel triage',
      critical: 'Emergency nurse staffing needed',
    },
    consultation_started: {
      medium: 'Optimize doctor schedule',
      high: 'Add doctor or redistribute patients',
      critical: 'Activate on-call doctor',
    },
    lab_ordered: {
      medium: 'Review lab equipment and staffing',
      high: 'Expedite lab processing',
      critical: 'Escalate to lab supervisor immediately',
    },
  };

  return recommendations[stage]?.[severity] || 'Monitor situation closely';
}
