import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ComplianceMetrics {
  score: number;
  completedSteps: number;
  totalSteps: number;
  missedSteps: string[];
}

export const useProtocolCompliance = (protocolId: string, userId: string) => {
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    score: 0,
    completedSteps: 0,
    totalSteps: 0,
    missedSteps: []
  });

  const logCompliance = async (score: number) => {
    await supabase.from('protocol_compliance_logs').insert({
      user_id: userId,
      protocol_id: protocolId,
      compliance_score: score
    });
  };

  const calculateCompliance = (completed: number, total: number) => {
    const score = (completed / total) * 100;
    setMetrics(prev => ({
      ...prev,
      score,
      completedSteps: completed,
      totalSteps: total
    }));
    return score;
  };

  return { metrics, logCompliance, calculateCompliance };
};
