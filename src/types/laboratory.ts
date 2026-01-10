// Phase 5: Laboratory Enhancement Types
// LOINC Code Integration & Critical Value Management

export interface LOINCCode {
  code: string;
  component: string;
  property?: string;
  time_aspect?: string;
  system_type?: string;
  scale_type?: string;
  method_type?: string;
  class?: string;
  reference_range?: {
    male?: string;
    female?: string;
    normal?: string;
    pediatric?: string;
  };
  critical_values?: {
    low?: string;
    high?: string;
    panic_low?: string;
    panic_high?: string;
  };
  units?: string;
  specimen_type?: string;
  created_at: string;
}

export interface LabResult {
  id: string;
  lab_order_id: string;
  loinc_code?: string;
  result_value: string;
  result_numeric?: number;
  result_unit?: string;
  reference_range?: string;
  abnormal_flag?: 'H' | 'L' | 'HH' | 'LL' | 'A' | null;
  critical_flag: boolean;
  result_status: 'preliminary' | 'final' | 'corrected' | 'cancelled';
  performed_at: string;
  verified_at?: string;
  verified_by?: string;
  interpretation?: string;
  hospital_id: string;
  created_at: string;
}

export interface EnhancedLabOrder {
  id: string;
  patient_id: string;
  doctor_id: string;
  test_name: string;
  loinc_code?: string;
  specimen_collected_at?: string;
  specimen_type?: string;
  collection_notes?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'ordered' | 'collected' | 'processing' | 'completed' | 'cancelled';
  notes?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
  
  // Enhanced fields
  loinc_details?: LOINCCode;
  results?: LabResult[];
  critical_notifications?: CriticalValueNotification[];
}

export interface CriticalValueNotification {
  id: string;
  lab_result_id: string;
  patient_id: string;
  loinc_code?: string;
  critical_value: string;
  notification_level: 1 | 2 | 3; // 1=routine, 2=urgent, 3=critical
  notified_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  read_back_verified: boolean;
  escalation_level: number;
  escalated_at?: string;
  resolution_notes?: string;
  hospital_id: string;
  created_at: string;
}

export interface LabInterpretationRule {
  id: string;
  loinc_code: string;
  condition_type: 'range' | 'delta' | 'pattern';
  condition_criteria: {
    low?: number;
    high?: number;
    delta_percent?: number;
    pattern_match?: string;
  };
  interpretation_text: string;
  severity_level: 'normal' | 'abnormal' | 'critical';
  auto_flag: boolean;
  created_at: string;
}

export interface LabTrend {
  id: string;
  patient_id: string;
  loinc_code: string;
  trend_period: '24h' | '7d' | '30d' | '90d';
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trend_significance: 'significant' | 'moderate' | 'minimal';
  calculated_at: string;
  trend_data: {
    values: Array<{
      date: string;
      value: number;
      unit: string;
    }>;
    slope?: number;
    correlation?: number;
    variance?: number;
  };
  hospital_id: string;
  created_at: string;
}

export interface LabQCResult {
  id: string;
  loinc_code: string;
  qc_level: 'normal' | 'abnormal_low' | 'abnormal_high';
  expected_value: number;
  actual_value: number;
  variance_percent: number;
  within_limits: boolean;
  run_date: string;
  instrument_id?: string;
  lot_number?: string;
  technician_id?: string;
  hospital_id: string;
  created_at: string;
}

// Critical value escalation workflow
export interface CriticalValueEscalation {
  level: number;
  title: string;
  recipients: string[];
  timeout_minutes: number;
  notification_methods: ('phone' | 'sms' | 'email' | 'pager')[];
  required_acknowledgment: boolean;
  read_back_required: boolean;
}

// Lab result interpretation
export interface LabResultInterpretation {
  result_id: string;
  interpretation_type: 'automated' | 'manual' | 'ai_assisted';
  clinical_significance: 'normal' | 'abnormal' | 'critical' | 'indeterminate';
  suggested_actions: string[];
  differential_considerations: string[];
  follow_up_recommendations: string[];
  confidence_score?: number;
  interpreted_by?: string;
  interpreted_at: string;
}

// Lab analytics and reporting
export interface LabAnalytics {
  patient_id: string;
  time_period: {
    start_date: string;
    end_date: string;
  };
  test_summary: {
    total_tests: number;
    abnormal_results: number;
    critical_values: number;
    pending_results: number;
  };
  trending_values: Array<{
    loinc_code: string;
    test_name: string;
    trend_direction: string;
    latest_value: string;
    reference_range: string;
    abnormal_flag?: string;
  }>;
  critical_alerts: CriticalValueNotification[];
  recommendations: string[];
}

// Lab workflow status
export interface LabWorkflowStatus {
  order_id: string;
  current_step: 'ordered' | 'collected' | 'received' | 'processing' | 'analyzed' | 'verified' | 'reported';
  estimated_completion: string;
  processing_notes: string[];
  quality_flags: string[];
  technician_notes?: string;
  pathologist_review_required: boolean;
}

// Reference range context
export interface ReferenceRangeContext {
  loinc_code: string;
  patient_demographics: {
    age_years: number;
    gender: 'M' | 'F';
    pregnancy_status?: boolean;
    gestational_age_weeks?: number;
  };
  applicable_range: {
    low_normal: number;
    high_normal: number;
    low_critical: number;
    high_critical: number;
    units: string;
  };
  range_source: string;
  last_updated: string;
}

// Lab result delta checking
export interface DeltaCheck {
  current_result: LabResult;
  previous_result?: LabResult;
  delta_value?: number;
  delta_percent?: number;
  delta_significance: 'normal' | 'moderate' | 'significant' | 'critical';
  time_interval_hours: number;
  requires_verification: boolean;
  verification_notes?: string;
}

// Specimen tracking
export interface SpecimenTracking {
  specimen_id: string;
  lab_order_id: string;
  collection_time: string;
  collected_by: string;
  specimen_type: string;
  collection_site?: string;
  transport_conditions: string;
  received_time?: string;
  received_by?: string;
  processing_started?: string;
  quality_assessment: {
    adequate_volume: boolean;
    proper_labeling: boolean;
    integrity_maintained: boolean;
    temperature_controlled: boolean;
    rejection_reason?: string;
  };
  chain_of_custody: Array<{
    timestamp: string;
    handler: string;
    action: string;
    location: string;
  }>;
}

// Lab equipment integration
export interface LabInstrument {
  instrument_id: string;
  instrument_name: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  supported_tests: string[]; // LOINC codes
  calibration_status: 'current' | 'due' | 'overdue';
  last_calibration: string;
  next_calibration_due: string;
  maintenance_status: 'operational' | 'maintenance' | 'down';
  quality_control_status: 'passing' | 'failing' | 'pending';
  location: string;
  hospital_id: string;
}

// Automated result validation
export interface ResultValidation {
  result_id: string;
  validation_rules_applied: string[];
  validation_status: 'passed' | 'failed' | 'requires_review';
  validation_flags: Array<{
    flag_type: 'range' | 'delta' | 'pattern' | 'technical';
    severity: 'info' | 'warning' | 'error';
    message: string;
    auto_resolvable: boolean;
  }>;
  manual_review_required: boolean;
  validated_by?: string;
  validated_at?: string;
}