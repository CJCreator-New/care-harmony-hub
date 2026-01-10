import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NoShowPrediction {
  appointment_id: string;
  no_show_probability: number;
  risk_factors: string[];
  recommended_actions: string[];
}

export interface StaffingOptimization {
  department: string;
  recommended_staff: number;
  current_staff: number;
  patient_volume_forecast: number;
  optimization_score: number;
}

export interface InventoryForecast {
  item_id: string;
  item_name: string;
  predicted_usage: number;
  current_stock: number;
  reorder_recommendation: boolean;
  days_until_stockout: number;
}

export function usePredictiveAnalytics() {
  const { profile } = useAuth();

  const { data: noShowPredictions, isLoading: loadingNoShow } = useQuery({
    queryKey: ['no-show-predictions', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      // Simulate ML predictions - in production, this would call ML service
      const mockPredictions: NoShowPrediction[] = [
        {
          appointment_id: "apt_123",
          no_show_probability: 0.75,
          risk_factors: ["Previous no-shows", "No confirmation", "Weather"],
          recommended_actions: ["Send reminder", "Call patient", "Overbook slot"]
        }
      ];

      return mockPredictions;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: staffingOptimization, isLoading: loadingStaffing } = useQuery({
    queryKey: ['staffing-optimization', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      const mockOptimization: StaffingOptimization[] = [
        {
          department: "Emergency",
          recommended_staff: 8,
          current_staff: 6,
          patient_volume_forecast: 45,
          optimization_score: 0.82
        },
        {
          department: "Outpatient",
          recommended_staff: 12,
          current_staff: 14,
          patient_volume_forecast: 28,
          optimization_score: 0.91
        }
      ];

      return mockOptimization;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const { data: inventoryForecasts, isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory-forecasts', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      const mockForecasts: InventoryForecast[] = [
        {
          item_id: "med_001",
          item_name: "Acetaminophen 500mg",
          predicted_usage: 150,
          current_stock: 75,
          reorder_recommendation: true,
          days_until_stockout: 3
        }
      ];

      return mockForecasts;
    },
    enabled: !!profile?.hospital_id,
    refetchInterval: 3600000 // Refresh every hour
  });

  const generatePredictiveReport = useMutation({
    mutationFn: async ({ reportType, dateRange }: {
      reportType: 'no_show' | 'staffing' | 'inventory' | 'comprehensive';
      dateRange: { start: string; end: string };
    }) => {
      // Generate comprehensive predictive analytics report
      const report = {
        generated_at: new Date().toISOString(),
        report_type: reportType,
        date_range: dateRange,
        predictions: {
          no_show_rate: 0.15,
          optimal_staffing: staffingOptimization,
          inventory_alerts: inventoryForecasts?.filter(f => f.reorder_recommendation)
        }
      };

      // Log report generation
      await supabase.from('activity_logs').insert({
        user_id: profile?.user_id,
        hospital_id: profile?.hospital_id,
        action_type: 'predictive_report_generated',
        entity_type: 'analytics',
        details: { report_type: reportType, date_range: dateRange }
      });

      return report;
    }
  });

  return {
    noShowPredictions,
    loadingNoShow,
    staffingOptimization,
    loadingStaffing,
    inventoryForecasts,
    loadingInventory,
    generatePredictiveReport: generatePredictiveReport.mutate,
    isGeneratingReport: generatePredictiveReport.isPending,
  };
}