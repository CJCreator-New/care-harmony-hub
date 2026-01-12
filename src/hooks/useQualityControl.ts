import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface QualityControl {
  id: string;
  test_type: string;
  control_lot: string;
  control_level: 'low' | 'normal' | 'high';
  expected_value: number;
  expected_range_min: number;
  expected_range_max: number;
  measured_value?: number;
  result: 'pass' | 'fail' | 'pending';
  technician_id: string;
  equipment_id?: string;
  performed_at: string;
  notes?: string;
  hospital_id: string;
  created_at: string;
}

export interface QualityControlRule {
  id: string;
  test_type: string;
  control_level: string;
  expected_mean: number;
  standard_deviation: number;
  acceptable_range_min: number;
  acceptable_range_max: number;
  westgard_rules: string[]; // Array of rule codes like '1_2s', '2_2s', 'R_4s', etc.
  active: boolean;
  hospital_id: string;
  created_at: string;
}

export interface CriticalResult {
  id: string;
  patient_id: string;
  test_type: string;
  test_name: string;
  result_value: number;
  unit: string;
  reference_range_min?: number;
  reference_range_max?: number;
  severity: 'low_critical' | 'high_critical' | 'panic';
  status: 'pending' | 'acknowledged' | 'reviewed';
  acknowledged_by?: string;
  acknowledged_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notification_sent: boolean;
  hospital_id: string;
  created_at: string;
}

export function useQualityControl() {
  const { hospital, profile } = useAuth();
  const queryClient = useQueryClient();

  // Get QC results
  const { data: qcResults, isLoading: qcLoading } = useQuery({
    queryKey: ['quality-control', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('quality_control')
        .select(`
          *,
          technician:profiles(first_name, last_name),
          equipment:lab_equipment(name, model)
        `)
        .eq('hospital_id', hospital.id)
        .order('performed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as QualityControl[];
    },
    enabled: !!hospital?.id,
  });

  // Get QC rules
  const { data: qcRules } = useQuery({
    queryKey: ['qc-rules', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('quality_control_rules')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('active', true)
        .order('test_type');

      if (error) throw error;
      return data as QualityControlRule[];
    },
    enabled: !!hospital?.id,
  });

  // Get critical results
  const { data: criticalResults, isLoading: criticalLoading } = useQuery({
    queryKey: ['critical-results', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('critical_results')
        .select(`
          *,
          patient:patients(first_name, last_name, medical_record_number),
          acknowledged_by_user:profiles!critical_results_acknowledged_by_fkey(first_name, last_name),
          reviewed_by_user:profiles!critical_results_reviewed_by_fkey(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CriticalResult[];
    },
    enabled: !!hospital?.id,
  });

  // Perform QC test
  const performQCTestMutation = useMutation({
    mutationFn: async (qcData: Omit<QualityControl, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('quality_control')
        .insert(qcData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-control'] });
      toast.success('QC test recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record QC test: ' + error.message);
    },
  });

  // Acknowledge critical result
  const acknowledgeCriticalResultMutation = useMutation({
    mutationFn: async ({ resultId, notes }: { resultId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('critical_results')
        .update({
          status: 'acknowledged',
          acknowledged_by: profile?.id,
          acknowledged_at: new Date().toISOString(),
          notes: notes,
        })
        .eq('id', resultId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['critical-results'] });
      toast.success('Critical result acknowledged');
    },
    onError: (error) => {
      toast.error('Failed to acknowledge critical result: ' + error.message);
    },
  });

  // Review critical result
  const reviewCriticalResultMutation = useMutation({
    mutationFn: async ({ resultId, notes }: { resultId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('critical_results')
        .update({
          status: 'reviewed',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          notes: notes,
        })
        .eq('id', resultId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['critical-results'] });
      toast.success('Critical result reviewed');
    },
    onError: (error) => {
      toast.error('Failed to review critical result: ' + error.message);
    },
  });

  // Westgard Rules Validation
  const validateWestgardRules = (
    measurements: number[],
    rule: QualityControlRule
  ): { passed: boolean; violatedRules: string[] } => {
    const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const stdDev = Math.sqrt(
      measurements.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (measurements.length - 1)
    );

    const violatedRules: string[] = [];

    rule.westgard_rules.forEach(ruleCode => {
      switch (ruleCode) {
        case '1_2s':
          // One measurement exceeds 2 SD
          if (Math.abs(measurements[measurements.length - 1] - mean) > 2 * stdDev) {
            violatedRules.push('1_2s');
          }
          break;
        case '2_2s':
          // Two consecutive measurements exceed 2 SD on same side
          if (measurements.length >= 2) {
            const lastTwo = measurements.slice(-2);
            const bothAbove = lastTwo.every(m => m > mean + 2 * stdDev);
            const bothBelow = lastTwo.every(m => m < mean - 2 * stdDev);
            if (bothAbove || bothBelow) {
              violatedRules.push('2_2s');
            }
          }
          break;
        case 'R_4s':
          // One measurement exceeds 4 SD
          if (Math.abs(measurements[measurements.length - 1] - mean) > 4 * stdDev) {
            violatedRules.push('R_4s');
          }
          break;
        case '4_1s':
          // Four consecutive measurements exceed 1 SD on same side
          if (measurements.length >= 4) {
            const lastFour = measurements.slice(-4);
            const allAbove = lastFour.every(m => m > mean + stdDev);
            const allBelow = lastFour.every(m => m < mean - stdDev);
            if (allAbove || allBelow) {
              violatedRules.push('4_1s');
            }
          }
          break;
        case '10x':
          // Ten consecutive measurements on same side of mean
          if (measurements.length >= 10) {
            const lastTen = measurements.slice(-10);
            const allAbove = lastTen.every(m => m > mean);
            const allBelow = lastTen.every(m => m < mean);
            if (allAbove || allBelow) {
              violatedRules.push('10x');
            }
          }
          break;
      }
    });

    return {
      passed: violatedRules.length === 0,
      violatedRules,
    };
  };

  // Get QC statistics
  const getQCStatistics = () => {
    if (!qcResults) return null;

    const totalTests = qcResults.length;
    const passedTests = qcResults.filter(qc => qc.result === 'pass').length;
    const failedTests = qcResults.filter(qc => qc.result === 'fail').length;
    const pendingTests = qcResults.filter(qc => qc.result === 'pending').length;

    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    // Group by test type
    const byTestType = qcResults.reduce((acc, qc) => {
      if (!acc[qc.test_type]) {
        acc[qc.test_type] = { total: 0, passed: 0, failed: 0 };
      }
      acc[qc.test_type].total++;
      if (qc.result === 'pass') acc[qc.test_type].passed++;
      if (qc.result === 'fail') acc[qc.test_type].failed++;
      return acc;
    }, {} as Record<string, { total: number; passed: number; failed: number }>);

    return {
      totalTests,
      passedTests,
      failedTests,
      pendingTests,
      passRate,
      byTestType,
    };
  };

  // Get pending critical results
  const pendingCriticalResults = criticalResults?.filter(
    result => result.status === 'pending'
  ) || [];

  // Get acknowledged but not reviewed critical results
  const acknowledgedCriticalResults = criticalResults?.filter(
    result => result.status === 'acknowledged'
  ) || [];

  return {
    qcResults,
    qcRules,
    criticalResults,
    isLoading: qcLoading || criticalLoading,
    performQCTest: performQCTestMutation.mutate,
    acknowledgeCriticalResult: acknowledgeCriticalResultMutation.mutate,
    reviewCriticalResult: reviewCriticalResultMutation.mutate,
    validateWestgardRules,
    qcStatistics: getQCStatistics(),
    pendingCriticalResults,
    acknowledgedCriticalResults,
    isPerformingQC: performQCTestMutation.isPending,
    isAcknowledging: acknowledgeCriticalResultMutation.isPending,
    isReviewing: reviewCriticalResultMutation.isPending,
  };
}