import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OperationalMetric {
  metric_name: string;
  current_value: number;
  target_value: number;
  trend: 'up' | 'down' | 'stable';
  change_percentage: number;
  unit: string;
  category: 'efficiency' | 'quality' | 'financial' | 'patient_satisfaction';
}

export interface QualityIndicator {
  indicator_name: string;
  score: number;
  benchmark: number;
  compliance_rate: number;
  risk_level: 'low' | 'medium' | 'high';
  improvement_actions: string[];
}

export interface BusinessIntelligence {
  revenue_cycle: {
    days_in_ar: number;
    collection_rate: number;
    denial_rate: number;
    cost_per_claim: number;
  };
  operational_efficiency: {
    patient_throughput: number;
    staff_utilization: number;
    resource_optimization: number;
    wait_times: number;
  };
  clinical_outcomes: {
    readmission_rate: number;
    patient_satisfaction: number;
    safety_incidents: number;
    quality_scores: number;
  };
}

export function useAdvancedAnalytics() {
  const { profile } = useAuth();

  // Real-time operational metrics
  const { data: operationalMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['operational-metrics', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      // Simulate real-time metrics calculation
      const metrics: OperationalMetric[] = [
        {
          metric_name: 'Patient Throughput',
          current_value: 45,
          target_value: 50,
          trend: 'up',
          change_percentage: 8.5,
          unit: 'patients/hour',
          category: 'efficiency'
        },
        {
          metric_name: 'Average Wait Time',
          current_value: 18,
          target_value: 15,
          trend: 'down',
          change_percentage: -12.3,
          unit: 'minutes',
          category: 'efficiency'
        },
        {
          metric_name: 'Staff Utilization',
          current_value: 87,
          target_value: 85,
          trend: 'stable',
          change_percentage: 2.1,
          unit: 'percentage',
          category: 'efficiency'
        },
        {
          metric_name: 'Patient Satisfaction',
          current_value: 4.2,
          target_value: 4.5,
          trend: 'up',
          change_percentage: 5.8,
          unit: 'score',
          category: 'patient_satisfaction'
        },
        {
          metric_name: 'Revenue per Patient',
          current_value: 1250,
          target_value: 1200,
          trend: 'up',
          change_percentage: 4.2,
          unit: 'dollars',
          category: 'financial'
        }
      ];

      return metrics;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Quality indicators
  const { data: qualityIndicators, isLoading: loadingQuality } = useQuery({
    queryKey: ['quality-indicators', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      const indicators: QualityIndicator[] = [
        {
          indicator_name: 'Hand Hygiene Compliance',
          score: 92,
          benchmark: 95,
          compliance_rate: 0.92,
          risk_level: 'medium',
          improvement_actions: ['Increase monitoring', 'Staff training', 'Reminder systems']
        },
        {
          indicator_name: 'Medication Error Rate',
          score: 98,
          benchmark: 99,
          compliance_rate: 0.98,
          risk_level: 'low',
          improvement_actions: ['Continue current protocols']
        },
        {
          indicator_name: 'Patient Fall Prevention',
          score: 89,
          benchmark: 95,
          compliance_rate: 0.89,
          risk_level: 'high',
          improvement_actions: ['Enhanced fall risk assessment', 'Environmental modifications', 'Staff education']
        }
      ];

      return indicators;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Business intelligence dashboard
  const { data: businessIntelligence, isLoading: loadingBI } = useQuery({
    queryKey: ['business-intelligence', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return null;

      const bi: BusinessIntelligence = {
        revenue_cycle: {
          days_in_ar: 28,
          collection_rate: 94.5,
          denial_rate: 3.2,
          cost_per_claim: 12.50
        },
        operational_efficiency: {
          patient_throughput: 85.2,
          staff_utilization: 87.8,
          resource_optimization: 91.3,
          wait_times: 18.5
        },
        clinical_outcomes: {
          readmission_rate: 8.2,
          patient_satisfaction: 4.2,
          safety_incidents: 0.8,
          quality_scores: 92.1
        }
      };

      return bi;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 600000 // Refresh every 10 minutes
  });

  // Generate analytics report
  const generateAnalyticsReport = useMutation({
    mutationFn: async ({ 
      reportType, 
      dateRange, 
      metrics 
    }: {
      reportType: 'operational' | 'quality' | 'financial' | 'comprehensive';
      dateRange: { start: string; end: string };
      metrics: string[];
    }) => {
      const report = {
        id: `report_${Date.now()}`,
        type: reportType,
        generated_at: new Date().toISOString(),
        date_range: dateRange,
        hospital_id: profile?.hospital_id,
        metrics: operationalMetrics?.filter(m => metrics.includes(m.metric_name)),
        quality_indicators: qualityIndicators,
        business_intelligence: businessIntelligence,
        summary: {
          total_metrics: metrics.length,
          alerts_generated: qualityIndicators?.filter(q => q.risk_level === 'high').length || 0,
          improvement_opportunities: qualityIndicators?.reduce((acc, q) => acc + q.improvement_actions.length, 0) || 0
        }
      };

      // Log report generation
      await supabase.from('activity_logs').insert({
        user_id: profile?.user_id,
        hospital_id: profile?.hospital_id,
        action_type: 'analytics_report_generated',
        entity_type: 'analytics',
        details: { 
          report_type: reportType, 
          metrics_count: metrics.length,
          date_range: dateRange 
        }
      });

      return report;
    }
  });

  // Automated alert generation
  const generateAutomatedAlerts = useMutation({
    mutationFn: async () => {
      if (!profile?.hospital_id) return [];

      const alerts = [];

      // Check operational metrics for alerts
      operationalMetrics?.forEach(metric => {
        if (metric.current_value < metric.target_value * 0.9) {
          alerts.push({
            type: 'performance_alert',
            severity: 'medium',
            message: `${metric.metric_name} is below target (${metric.current_value} vs ${metric.target_value})`,
            metric: metric.metric_name,
            recommended_action: 'Review operational procedures and resource allocation'
          });
        }
      });

      // Check quality indicators for alerts
      qualityIndicators?.forEach(indicator => {
        if (indicator.risk_level === 'high') {
          alerts.push({
            type: 'quality_alert',
            severity: 'high',
            message: `${indicator.indicator_name} requires immediate attention`,
            metric: indicator.indicator_name,
            recommended_action: indicator.improvement_actions.join(', ')
          });
        }
      });

      // Store alerts in database
      for (const alert of alerts) {
        await supabase.from('predictive_alerts').insert({
          hospital_id: profile.hospital_id,
          alert_type: alert.type,
          risk_score: alert.severity === 'high' ? 0.8 : 0.5,
          title: alert.message,
          recommended_action: alert.recommended_action,
          priority: alert.severity
        });
      }

      return alerts;
    }
  });

  // Performance benchmarking
  const performanceBenchmark = useMutation({
    mutationFn: async ({ benchmarkType }: { benchmarkType: 'peer_hospitals' | 'national_average' | 'best_practice' }) => {
      // Simulate benchmarking analysis
      const benchmark = {
        benchmark_type: benchmarkType,
        hospital_ranking: 'Top 25%',
        areas_of_excellence: ['Patient Satisfaction', 'Staff Utilization'],
        improvement_opportunities: ['Wait Times', 'Revenue Cycle'],
        peer_comparison: {
          better_than_peers: 65,
          similar_to_peers: 25,
          below_peers: 10
        },
        recommendations: [
          'Implement lean workflow processes',
          'Enhance staff training programs',
          'Optimize resource scheduling'
        ]
      };

      return benchmark;
    }
  });

  return {
    operationalMetrics,
    loadingMetrics,
    qualityIndicators,
    loadingQuality,
    businessIntelligence,
    loadingBI,
    generateAnalyticsReport: generateAnalyticsReport.mutate,
    isGeneratingReport: generateAnalyticsReport.isPending,
    generateAutomatedAlerts: generateAutomatedAlerts.mutate,
    isGeneratingAlerts: generateAutomatedAlerts.isPending,
    performanceBenchmark: performanceBenchmark.mutate,
    isBenchmarking: performanceBenchmark.isPending,
  };
}