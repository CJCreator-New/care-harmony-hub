// Phase 7: Analytics & Population Health Types
// Clinical Quality Dashboard & Population Health Tools

export interface CareGap {
  id: string;
  patient_id: string;
  measure_type: string;
  measure_category: 'preventive' | 'chronic_care' | 'screening';
  gap_description: string;
  due_date?: string;
  completed_date?: string;
  status: 'open' | 'closed' | 'overdue' | 'scheduled';
  priority_level: 1 | 2 | 3 | 4;
  assigned_provider_id?: string;
  intervention_notes?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface QualityMeasure {
  id: string;
  measure_code: string;
  measure_name: string;
  measure_description?: string;
  measure_type: 'process' | 'outcome' | 'structure';
  target_population?: string;
  numerator_criteria?: Record<string, any>;
  denominator_criteria?: Record<string, any>;
  exclusion_criteria?: Record<string, any>;
  target_rate?: number;
  reporting_period: string;
  is_active: boolean;
  created_at: string;
}

export interface PatientQualityCompliance {
  id: string;
  patient_id: string;
  measure_id: string;
  compliance_status: 'compliant' | 'non_compliant' | 'excluded';
  compliance_date?: string;
  next_due_date?: string;
  compliance_value?: string;
  notes?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderScorecard {
  id: string;
  provider_id: string;
  reporting_period_start: string;
  reporting_period_end: string;
  total_patients: number;
  quality_scores?: Record<string, number>;
  patient_satisfaction_score?: number;
  productivity_metrics?: {
    patients_seen: number;
    avg_visit_duration: number;
    no_show_rate: number;
    documentation_completion_rate: number;
  };
  financial_metrics?: {
    revenue_per_patient: number;
    cost_per_patient: number;
    collection_rate: number;
  };
  peer_ranking?: number;
  improvement_areas: string[];
  achievements: string[];
  hospital_id: string;
  created_at: string;
}

export interface PopulationCohort {
  id: string;
  cohort_name: string;
  cohort_description?: string;
  inclusion_criteria: Record<string, any>;
  exclusion_criteria?: Record<string, any>;
  target_size?: number;
  current_size: number;
  risk_stratification?: {
    high_risk: Record<string, any>;
    medium_risk: Record<string, any>;
    low_risk: Record<string, any>;
  };
  intervention_protocols?: Record<string, any>;
  outcome_measures: string[];
  is_active: boolean;
  hospital_id: string;
  created_at: string;
}

export interface PatientCohortMembership {
  id: string;
  patient_id: string;
  cohort_id: string;
  enrollment_date: string;
  risk_level?: 'high' | 'medium' | 'low';
  last_contact_date?: string;
  next_outreach_date?: string;
  status: 'active' | 'inactive' | 'graduated' | 'lost_to_followup';
  notes?: string;
  hospital_id: string;
  created_at: string;
}

export interface ClinicalOutcome {
  id: string;
  patient_id: string;
  outcome_type: 'readmission' | 'mortality' | 'infection' | 'complication';
  outcome_date: string;
  severity_level?: 'mild' | 'moderate' | 'severe' | 'critical';
  related_diagnosis?: string;
  related_procedure?: string;
  preventable?: boolean;
  root_cause_analysis?: string;
  improvement_actions: string[];
  hospital_id: string;
  created_at: string;
}

export interface RiskScore {
  id: string;
  patient_id: string;
  score_type: 'charlson' | 'frailty' | 'falls' | 'readmission';
  score_value: number;
  risk_category?: 'low' | 'moderate' | 'high' | 'very_high';
  calculated_date: string;
  factors_considered?: Record<string, any>;
  recommendations: string[];
  valid_until?: string;
  hospital_id: string;
  created_at: string;
}

export interface PopulationIntervention {
  id: string;
  intervention_name: string;
  intervention_type: 'education' | 'outreach' | 'care_management' | 'screening';
  target_cohort_id?: string;
  start_date: string;
  end_date?: string;
  intervention_protocol?: string;
  success_metrics?: Record<string, any>;
  cost_per_patient?: number;
  expected_outcomes: string[];
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  hospital_id: string;
  created_at: string;
}

export interface InterventionOutcome {
  id: string;
  intervention_id: string;
  patient_id: string;
  participation_status: 'enrolled' | 'completed' | 'dropped_out' | 'excluded';
  baseline_metrics?: Record<string, any>;
  follow_up_metrics?: Record<string, any>;
  outcome_achieved?: boolean;
  cost_savings?: number;
  notes?: string;
  hospital_id: string;
  created_at: string;
}

// Dashboard and analytics interfaces
export interface QualityDashboardData {
  hospital_id: string;
  reporting_period: {
    start_date: string;
    end_date: string;
  };
  overall_quality_score: number;
  measure_performance: Array<{
    measure_code: string;
    measure_name: string;
    current_rate: number;
    target_rate: number;
    trend: 'improving' | 'stable' | 'declining';
    patients_compliant: number;
    total_patients: number;
  }>;
  care_gaps_summary: {
    total_gaps: number;
    overdue_gaps: number;
    high_priority_gaps: number;
    gaps_by_category: Record<string, number>;
  };
  top_performing_providers: Array<{
    provider_id: string;
    provider_name: string;
    overall_score: number;
    specialty: string;
  }>;
  improvement_opportunities: Array<{
    area: string;
    current_performance: number;
    potential_improvement: number;
    estimated_impact: string;
  }>;
}

export interface PopulationHealthSummary {
  hospital_id: string;
  total_population: number;
  active_cohorts: number;
  high_risk_patients: number;
  interventions_active: number;
  cohort_summaries: Array<{
    cohort_id: string;
    cohort_name: string;
    total_patients: number;
    risk_distribution: {
      high: number;
      medium: number;
      low: number;
    };
    recent_outcomes: {
      improved: number;
      stable: number;
      declined: number;
    };
  }>;
  intervention_effectiveness: Array<{
    intervention_id: string;
    intervention_name: string;
    participants: number;
    completion_rate: number;
    outcome_achievement_rate: number;
    cost_per_outcome: number;
  }>;
}

export interface PatientRiskProfile {
  patient_id: string;
  overall_risk_level: 'low' | 'moderate' | 'high' | 'very_high';
  risk_scores: RiskScore[];
  active_care_gaps: CareGap[];
  cohort_memberships: Array<{
    cohort_name: string;
    enrollment_date: string;
    risk_level: string;
    next_outreach: string;
  }>;
  recent_outcomes: ClinicalOutcome[];
  recommended_interventions: Array<{
    intervention_type: string;
    priority: number;
    expected_benefit: string;
    estimated_cost: number;
  }>;
}

export interface HEDISTracker {
  measure_year: number;
  hospital_id: string;
  hedis_measures: Array<{
    measure_code: string;
    measure_name: string;
    domain: string;
    current_rate: number;
    target_rate: number;
    percentile_rank: number;
    trend_direction: 'up' | 'down' | 'stable';
    improvement_needed: number;
    action_plan: string[];
  }>;
  overall_star_rating: number;
  domain_scores: Record<string, number>;
  benchmark_comparison: {
    national_average: number;
    regional_average: number;
    top_decile: number;
  };
}

export interface CareGapAnalysis {
  analysis_date: string;
  hospital_id: string;
  gap_categories: Array<{
    category: string;
    total_gaps: number;
    overdue_gaps: number;
    avg_days_overdue: number;
    closure_rate_30_days: number;
  }>;
  provider_performance: Array<{
    provider_id: string;
    provider_name: string;
    assigned_gaps: number;
    closed_gaps: number;
    closure_rate: number;
    avg_closure_time: number;
  }>;
  patient_risk_stratification: {
    high_risk_gaps: number;
    medium_risk_gaps: number;
    low_risk_gaps: number;
  };
  intervention_recommendations: Array<{
    gap_type: string;
    recommended_action: string;
    expected_closure_rate: number;
    resource_requirements: string;
  }>;
}

export interface OutcomeMetrics {
  hospital_id: string;
  reporting_period: {
    start_date: string;
    end_date: string;
  };
  clinical_outcomes: {
    readmission_rate_30_day: number;
    mortality_rate: number;
    infection_rate: number;
    complication_rate: number;
  };
  quality_outcomes: {
    patient_satisfaction: number;
    safety_score: number;
    effectiveness_score: number;
    timeliness_score: number;
  };
  financial_outcomes: {
    cost_per_case: number;
    length_of_stay: number;
    revenue_per_patient: number;
    margin_per_patient: number;
  };
  comparative_data: {
    national_benchmarks: Record<string, number>;
    peer_hospital_averages: Record<string, number>;
    historical_trends: Array<{
      period: string;
      metrics: Record<string, number>;
    }>;
  };
}