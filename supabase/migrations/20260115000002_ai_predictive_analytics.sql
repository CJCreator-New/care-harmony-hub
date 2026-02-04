-- Phase 1: AI Integration Foundation - Database Schema
-- Migration: 20260115000002_ai_predictive_analytics.sql

-- Prediction models table for storing ML model metadata
CREATE TABLE IF NOT EXISTS prediction_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL CHECK (model_type IN ('no_show', 'staffing', 'inventory', 'risk_assessment', 'care_gaps')),
  model_version TEXT NOT NULL,
  accuracy_score DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  training_data_size INTEGER,
  last_trained TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictive alerts for AI-generated insights
CREATE TABLE IF NOT EXISTS predictive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('no_show_risk', 'clinical_risk', 'care_gap', 'inventory_alert', 'staffing_alert')),
  risk_score DECIMAL(5,4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  confidence_level DECIMAL(5,4) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  recommended_action TEXT,
  action_taken BOOLEAN DEFAULT false,
  action_taken_by UUID REFERENCES profiles(id),
  action_taken_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI clinical insights for storing AI-generated clinical support
CREATE TABLE IF NOT EXISTS ai_clinical_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('differential_diagnosis', 'risk_assessment', 'clinical_coding', 'drug_interaction', 'care_recommendation')),
  generated_by TEXT NOT NULL DEFAULT 'ai_system',
  confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  insight_data JSONB NOT NULL,
  human_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  accuracy_feedback TEXT CHECK (accuracy_feedback IN ('accurate', 'partially_accurate', 'inaccurate')),
  clinical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow automation rules
CREATE TABLE IF NOT EXISTS workflow_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('care_team_assignment', 'follow_up_scheduling', 'task_prioritization', 'alert_generation')),
  trigger_conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  success_rate DECIMAL(5,4),
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automated task executions log
CREATE TABLE IF NOT EXISTS automated_task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES workflow_automation_rules(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  trigger_data JSONB,
  execution_result JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics for AI/automation systems
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('prediction_accuracy', 'automation_success_rate', 'user_satisfaction', 'time_savings')),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  measurement_unit TEXT,
  measurement_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  measurement_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_hospital_patient ON predictive_alerts(hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_type_priority ON predictive_alerts(alert_type, priority);
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_created_at ON predictive_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_clinical_insights_hospital_patient ON ai_clinical_insights(hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_clinical_insights_type ON ai_clinical_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_clinical_insights_consultation ON ai_clinical_insights(consultation_id);

CREATE INDEX IF NOT EXISTS idx_workflow_automation_rules_hospital ON workflow_automation_rules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_workflow_automation_rules_type ON workflow_automation_rules(rule_type);

CREATE INDEX IF NOT EXISTS idx_automated_task_executions_hospital ON automated_task_executions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_automated_task_executions_rule ON automated_task_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automated_task_executions_status ON automated_task_executions(execution_status);

CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_hospital ON ai_performance_metrics(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_type ON ai_performance_metrics(metric_type);

-- Add RLS policies
ALTER TABLE prediction_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_clinical_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hospital-scoped access
CREATE POLICY "prediction_models_hospital_access" ON prediction_models
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "predictive_alerts_hospital_access" ON predictive_alerts
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_clinical_insights_hospital_access" ON ai_clinical_insights
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workflow_automation_rules_hospital_access" ON workflow_automation_rules
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "automated_task_executions_hospital_access" ON automated_task_executions
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_performance_metrics_hospital_access" ON ai_performance_metrics
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prediction_models_updated_at BEFORE UPDATE ON prediction_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_alerts_updated_at BEFORE UPDATE ON predictive_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_clinical_insights_updated_at BEFORE UPDATE ON ai_clinical_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_automation_rules_updated_at BEFORE UPDATE ON workflow_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample prediction models
INSERT INTO prediction_models (model_type, model_version, accuracy_score, precision_score, recall_score, f1_score, training_data_size, model_data) VALUES
('no_show', 'v1.0.0', 0.8500, 0.8200, 0.8800, 0.8500, 10000, '{"algorithm": "random_forest", "features": ["age", "previous_no_shows", "appointment_type", "weather"]}'),
('risk_assessment', 'v1.2.1', 0.9200, 0.9000, 0.9400, 0.9200, 25000, '{"algorithm": "gradient_boosting", "features": ["vitals", "lab_results", "medications", "comorbidities"]}'),
('staffing', 'v1.1.0', 0.7800, 0.7500, 0.8100, 0.7800, 5000, '{"algorithm": "linear_regression", "features": ["historical_volume", "day_of_week", "season", "events"]}'),
('inventory', 'v1.0.2', 0.8800, 0.8600, 0.9000, 0.8800, 15000, '{"algorithm": "arima", "features": ["usage_history", "seasonal_patterns", "supplier_lead_times"]}');

-- Insert sample workflow automation rules
INSERT INTO workflow_automation_rules (hospital_id, rule_name, rule_type, trigger_conditions, actions, created_by) 
SELECT 
  h.id,
  'Auto Care Team Assignment for High Acuity',
  'care_team_assignment',
  '{"conditions": [{"field": "acuity_level", "operator": ">=", "value": "high"}]}',
  '{"actions": [{"type": "assign_primary_doctor", "criteria": "specialty_match"}, {"type": "assign_nurse", "criteria": "experience_level"}]}',
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

-- Insert workflow rules for clinical workflows
INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Lab Results Ready Notification',
  'Notify ordering doctor when lab results are completed',
  'lab_results_ready',
  '{}',
  '[{"type": "send_notification", "target_role": "doctor", "target_user": "{{orderedBy}}", "message": "Lab results for {{testName}} are ready for {{patientName}}"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Prescription Review Task',
  'Create task for pharmacist to review new prescriptions',
  'prescription_created',
  '{}',
  '[{"type": "create_task", "target_role": "pharmacist", "message": "Review prescription for {{patientName}} ({{medicationCount}} medications)"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Lab Order Processing',
  'Create task for lab technician when lab order is created',
  'lab_order_created',
  '{}',
  '[{"type": "create_task", "target_role": "lab_technician", "message": "Process {{testName}} for {{patientName}}"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Consultation Completion Notification',
  'Notify billing/reception when consultation is completed',
  'consultation_completed',
  '{}',
  '[{"type": "send_notification", "target_role": "receptionist", "message": "Consultation completed for {{patientName}} - ready for checkout"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;