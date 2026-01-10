// AI and Workflow Optimization Types
// Extends the existing types for Phase 1-3 implementations

export interface PredictionModel {
  id: string;
  model_type: 'no_show' | 'staffing' | 'inventory' | 'risk_assessment' | 'care_gaps';
  model_version: string;
  accuracy_score: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  training_data_size: number;
  last_trained: string;
  model_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PredictiveAlert {
  id: string;
  hospital_id: string;
  patient_id?: string;
  alert_type: 'no_show_risk' | 'clinical_risk' | 'care_gap' | 'inventory_alert' | 'staffing_alert';
  risk_score: number;
  confidence_level?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string;
  recommended_action?: string;
  action_taken: boolean;
  action_taken_by?: string;
  action_taken_at?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIClinicalInsight {
  id: string;
  hospital_id: string;
  patient_id: string;
  consultation_id?: string;
  insight_type: 'differential_diagnosis' | 'risk_assessment' | 'clinical_coding' | 'drug_interaction' | 'care_recommendation';
  generated_by: string;
  confidence_score: number;
  insight_data: Record<string, any>;
  human_reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  accuracy_feedback?: 'accurate' | 'partially_accurate' | 'inaccurate';
  clinical_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowAutomationRule {
  id: string;
  hospital_id: string;
  rule_name: string;
  rule_type: 'care_team_assignment' | 'follow_up_scheduling' | 'task_prioritization' | 'alert_generation';
  trigger_conditions: Record<string, any>;
  actions: Record<string, any>;
  is_active: boolean;
  success_rate?: number;
  execution_count: number;
  last_executed?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AutomatedTaskExecution {
  id: string;
  hospital_id: string;
  rule_id: string;
  patient_id?: string;
  execution_status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  trigger_data?: Record<string, any>;
  execution_result?: Record<string, any>;
  error_message?: string;
  execution_time_ms?: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface AIPerformanceMetric {
  id: string;
  hospital_id: string;
  metric_type: 'prediction_accuracy' | 'automation_success_rate' | 'user_satisfaction' | 'time_savings';
  metric_name: string;
  metric_value: number;
  measurement_unit?: string;
  measurement_period_start: string;
  measurement_period_end: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// Mobile Workflow Types
export interface MobileWorkflowConfig {
  role: string;
  offline_enabled: boolean;
  voice_commands_enabled: boolean;
  quick_actions: string[];
  sync_frequency: number;
}

export interface OfflineData {
  patients: any[];
  appointments: any[];
  medications: any[];
  last_sync: string;
  pending_changes: OfflineChange[];
}

export interface OfflineChange {
  table: string;
  data: any;
  timestamp: string;
  operation?: 'insert' | 'update' | 'delete';
}

export interface VoiceCommand {
  command: string;
  action: string;
  confidence: number;
  parameters: Record<string, any>;
}

// Advanced Analytics Types
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

export interface AnalyticsReport {
  id: string;
  type: 'operational' | 'quality' | 'financial' | 'comprehensive';
  generated_at: string;
  date_range: { start: string; end: string };
  hospital_id: string;
  metrics: OperationalMetric[];
  quality_indicators: QualityIndicator[];
  business_intelligence: BusinessIntelligence;
  summary: {
    total_metrics: number;
    alerts_generated: number;
    improvement_opportunities: number;
  };
}

export interface AutomatedAlert {
  type: 'performance_alert' | 'quality_alert' | 'safety_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  recommended_action: string;
  created_at: string;
}

export interface PerformanceBenchmark {
  benchmark_type: 'peer_hospitals' | 'national_average' | 'best_practice';
  hospital_ranking: string;
  areas_of_excellence: string[];
  improvement_opportunities: string[];
  peer_comparison: {
    better_than_peers: number;
    similar_to_peers: number;
    below_peers: number;
  };
  recommendations: string[];
}

// Extend existing Database types
declare module '@/integrations/supabase/types' {
  interface Database {
    public: {
      Tables: {
        prediction_models: {
          Row: PredictionModel;
          Insert: Omit<PredictionModel, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<PredictionModel, 'id' | 'created_at'>>;
        };
        predictive_alerts: {
          Row: PredictiveAlert;
          Insert: Omit<PredictiveAlert, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<PredictiveAlert, 'id' | 'created_at'>>;
        };
        ai_clinical_insights: {
          Row: AIClinicalInsight;
          Insert: Omit<AIClinicalInsight, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<AIClinicalInsight, 'id' | 'created_at'>>;
        };
        workflow_automation_rules: {
          Row: WorkflowAutomationRule;
          Insert: Omit<WorkflowAutomationRule, 'id' | 'created_at' | 'updated_at'>;
          Update: Partial<Omit<WorkflowAutomationRule, 'id' | 'created_at'>>;
        };
        automated_task_executions: {
          Row: AutomatedTaskExecution;
          Insert: Omit<AutomatedTaskExecution, 'id' | 'created_at'>;
          Update: Partial<Omit<AutomatedTaskExecution, 'id' | 'created_at'>>;
        };
        ai_performance_metrics: {
          Row: AIPerformanceMetric;
          Insert: Omit<AIPerformanceMetric, 'id' | 'created_at'>;
          Update: Partial<Omit<AIPerformanceMetric, 'id' | 'created_at'>>;
        };
      };
    };
  }
}