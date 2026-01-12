import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VitalSign {
  id: string;
  patient_id: string;
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'blood_glucose' | 'oxygen_saturation' | 'respiratory_rate';
  value: number;
  unit: string;
  recorded_at: string;
  recorded_by: string;
  device_type?: string;
  notes?: string;
}

export interface HealthMetric {
  id: string;
  patient_id: string;
  metric_type: 'steps' | 'sleep_hours' | 'water_intake' | 'calories_burned' | 'mood' | 'pain_level' | 'energy_level';
  value: number;
  unit: string;
  date: string;
  notes?: string;
}

export interface HealthGoal {
  id: string;
  patient_id: string;
  goal_type: 'weight_loss' | 'exercise' | 'blood_pressure' | 'blood_glucose' | 'medication_adherence' | 'appointment_attendance';
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface HealthAlert {
  id: string;
  patient_id: string;
  alert_type: 'abnormal_vital' | 'missed_medication' | 'upcoming_appointment' | 'goal_deadline' | 'health_reminder';
  severity: 'low' | 'medium' | 'high';
  message: string;
  action_required: boolean;
  action_taken?: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface HealthTrend {
  metric: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend: 'improving' | 'declining' | 'stable';
  period: '7d' | '30d' | '90d';
}

export function useHealthMonitoring() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Get recent vital signs
  const { data: vitalSigns, isLoading: vitalsLoading } = useQuery({
    queryKey: ['vital-signs', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', profile.id)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as VitalSign[];
    },
    enabled: !!profile?.id,
  });

  // Get health metrics
  const { data: healthMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['health-metrics', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patient_id', profile.id)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as HealthMetric[];
    },
    enabled: !!profile?.id,
  });

  // Get health goals
  const { data: healthGoals, isLoading: goalsLoading } = useQuery({
    queryKey: ['health-goals', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('health_goals')
        .select('*')
        .eq('patient_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HealthGoal[];
    },
    enabled: !!profile?.id,
  });

  // Get health alerts
  const { data: healthAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['health-alerts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('health_alerts')
        .select('*')
        .eq('patient_id', profile.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HealthAlert[];
    },
    enabled: !!profile?.id,
  });

  // Record vital sign
  const recordVitalSignMutation = useMutation({
    mutationFn: async (vital: Omit<VitalSign, 'id' | 'recorded_at'>) => {
      const { data, error } = await supabase
        .from('vital_signs')
        .insert([{
          ...vital,
          recorded_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data as VitalSign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vital-signs'] });
      toast.success('Vital sign recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record vital sign: ' + error.message);
    },
  });

  // Record health metric
  const recordHealthMetricMutation = useMutation({
    mutationFn: async (metric: Omit<HealthMetric, 'id'>) => {
      const { data, error } = await supabase
        .from('health_metrics')
        .insert([metric])
        .select()
        .single();

      if (error) throw error;
      return data as HealthMetric;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-metrics'] });
      toast.success('Health metric recorded successfully');
    },
    onError: (error) => {
      toast.error('Failed to record health metric: ' + error.message);
    },
  });

  // Update health goal progress
  const updateGoalProgressMutation = useMutation({
    mutationFn: async ({ goalId, currentValue }: { goalId: string; currentValue: number }) => {
      const { data, error } = await supabase
        .from('health_goals')
        .update({
          current_value: currentValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data as HealthGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-goals'] });
      toast.success('Goal progress updated');
    },
    onError: (error) => {
      toast.error('Failed to update goal progress: ' + error.message);
    },
  });

  // Resolve health alert
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('health_alerts')
        .update({
          action_taken: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data as HealthAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-alerts'] });
      toast.success('Alert resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve alert: ' + error.message);
    },
  });

  // Get health trends - Note: This is a utility function that returns query options
  // Use it by calling useQuery directly in components with these options
  const getHealthTrendsQueryOptions = (period: '7d' | '30d' | '90d' = '30d') => ({
    queryKey: ['health-trends', profile?.id, period],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase.rpc('get_health_trends', {
        p_patient_id: profile.id,
        p_period: period,
      });

      if (error) throw error;
      return data as HealthTrend[];
    },
    enabled: !!profile?.id,
  });

  // Get vital sign ranges for alerts
  const getVitalSignRanges = () => {
    return {
      blood_pressure: {
        systolic: { min: 90, max: 140, critical_min: 80, critical_max: 180 },
        diastolic: { min: 60, max: 90, critical_min: 50, critical_max: 110 },
      },
      heart_rate: { min: 60, max: 100, critical_min: 40, critical_max: 150 },
      temperature: { min: 97.0, max: 99.0, critical_min: 95.0, critical_max: 103.0 },
      blood_glucose: { min: 70, max: 140, critical_min: 50, critical_max: 200 },
      oxygen_saturation: { min: 95, max: 100, critical_min: 90, critical_max: 100 },
      respiratory_rate: { min: 12, max: 20, critical_min: 8, critical_max: 30 },
    };
  };

  // Check if vital sign is abnormal
  const isVitalSignAbnormal = (type: VitalSign['type'], value: number): boolean => {
    const ranges = getVitalSignRanges();

    if (type === 'blood_pressure') {
      // Handle systolic/diastolic format
      const [systolic, diastolic] = value.toString().split('/').map(Number);
      return systolic < ranges.blood_pressure.systolic.critical_min ||
             systolic > ranges.blood_pressure.systolic.critical_max ||
             diastolic < ranges.blood_pressure.diastolic.critical_min ||
             diastolic > ranges.blood_pressure.diastolic.critical_max;
    }

    const range = ranges[type];
    return value < range.critical_min || value > range.critical_max;
  };

  return {
    vitalSigns,
    healthMetrics,
    healthGoals,
    healthAlerts,
    isLoading: vitalsLoading || metricsLoading || goalsLoading || alertsLoading,
    recordVitalSign: recordVitalSignMutation.mutate,
    recordHealthMetric: recordHealthMetricMutation.mutate,
    updateGoalProgress: updateGoalProgressMutation.mutate,
    resolveAlert: resolveAlertMutation.mutate,
    getHealthTrends,
    getVitalSignRanges,
    isVitalSignAbnormal,
    isRecordingVital: recordVitalSignMutation.isPending,
    isRecordingMetric: recordHealthMetricMutation.isPending,
    isUpdatingGoal: updateGoalProgressMutation.isPending,
    isResolvingAlert: resolveAlertMutation.isPending,
  };
}