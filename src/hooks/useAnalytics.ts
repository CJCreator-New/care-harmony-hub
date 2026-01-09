import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface KPIMetrics {
  patient_metrics: {
    total_patients: number;
    new_patients: number;
  };
  appointment_metrics: {
    total_appointments: number;
    completed_appointments: number;
    cancelled_appointments: number;
    no_show_rate: number;
  };
  financial_metrics: {
    total_revenue: number;
    pending_payments: number;
    collection_rate: number;
  };
  operational_metrics: {
    total_consultations: number;
    avg_consultations_per_doctor: number;
  };
}

export function useAnalytics(period: '7d' | '30d' | '90d' | '1y' = '30d') {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['analytics', 'kpis', period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'get_kpis', params: { period } }
      });
      if (error) throw error;
      return data.kpis as KPIMetrics;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const { data: financialMetrics, isLoading: financialLoading } = useQuery({
    queryKey: ['analytics', 'financial', period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'get_financial_metrics', params: { period } }
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });

  const { data: operationalMetrics, isLoading: operationalLoading } = useQuery({
    queryKey: ['analytics', 'operational', period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'get_operational_metrics', params: { period } }
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 15 * 60 * 1000, // Refresh every 15 minutes
  });

  const { data: clinicalMetrics, isLoading: clinicalLoading } = useQuery({
    queryKey: ['analytics', 'clinical', period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics-engine', {
        body: { action: 'get_clinical_metrics', params: { period } }
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 20 * 60 * 1000, // Refresh every 20 minutes
  });

  return {
    kpis,
    financialMetrics,
    operationalMetrics,
    clinicalMetrics,
    isLoading: kpisLoading || financialLoading || operationalLoading || clinicalLoading,
  };
}