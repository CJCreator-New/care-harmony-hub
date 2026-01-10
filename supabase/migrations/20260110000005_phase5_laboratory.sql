-- Phase 5: Laboratory Enhancement
-- LOINC Code Integration & Critical Value Management

-- LOINC codes standardization
CREATE TABLE loinc_codes (
  code TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  property TEXT,
  time_aspect TEXT,
  system_type TEXT,
  scale_type TEXT,
  method_type TEXT,
  class TEXT,
  reference_range JSONB,
  critical_values JSONB,
  units TEXT,
  specimen_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced lab orders with LOINC
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS loinc_code TEXT REFERENCES loinc_codes(code);
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS specimen_collected_at TIMESTAMPTZ;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS specimen_type TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS collection_notes TEXT;

-- Lab results with standardized values
CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID REFERENCES lab_orders(id),
  loinc_code TEXT REFERENCES loinc_codes(code),
  result_value TEXT NOT NULL,
  result_numeric DECIMAL,
  result_unit TEXT,
  reference_range TEXT,
  abnormal_flag TEXT, -- H, L, HH, LL, A
  critical_flag BOOLEAN DEFAULT false,
  result_status TEXT DEFAULT 'final', -- preliminary, final, corrected
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  interpretation TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical value notifications
CREATE TABLE critical_value_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id UUID REFERENCES lab_results(id),
  patient_id UUID REFERENCES patients(id),
  loinc_code TEXT REFERENCES loinc_codes(code),
  critical_value TEXT NOT NULL,
  notification_level INTEGER DEFAULT 1, -- 1=routine, 2=urgent, 3=critical
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  read_back_verified BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  resolution_notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab interpretation rules
CREATE TABLE lab_interpretation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loinc_code TEXT REFERENCES loinc_codes(code),
  condition_type TEXT NOT NULL, -- range, delta, pattern
  condition_criteria JSONB NOT NULL,
  interpretation_text TEXT NOT NULL,
  severity_level TEXT, -- normal, abnormal, critical
  auto_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab trending and analytics
CREATE TABLE lab_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  loinc_code TEXT REFERENCES loinc_codes(code),
  trend_period TEXT NOT NULL, -- 24h, 7d, 30d, 90d
  trend_direction TEXT, -- increasing, decreasing, stable, volatile
  trend_significance TEXT, -- significant, moderate, minimal
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  trend_data JSONB,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality control tracking
CREATE TABLE lab_qc_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loinc_code TEXT REFERENCES loinc_codes(code),
  qc_level TEXT NOT NULL, -- normal, abnormal_low, abnormal_high
  expected_value DECIMAL,
  actual_value DECIMAL,
  variance_percent DECIMAL,
  within_limits BOOLEAN,
  run_date DATE NOT NULL,
  instrument_id TEXT,
  lot_number TEXT,
  technician_id UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_loinc_codes_component ON loinc_codes(component);
CREATE INDEX idx_loinc_codes_class ON loinc_codes(class);
CREATE INDEX idx_lab_orders_loinc ON lab_orders(loinc_code);
CREATE INDEX idx_lab_results_order ON lab_results(lab_order_id);
CREATE INDEX idx_lab_results_loinc ON lab_results(loinc_code);
CREATE INDEX idx_lab_results_patient ON lab_results(lab_order_id, loinc_code);
CREATE INDEX idx_critical_notifications_patient ON critical_value_notifications(patient_id);
CREATE INDEX idx_critical_notifications_status ON critical_value_notifications(acknowledged_at);
CREATE INDEX idx_lab_trends_patient_loinc ON lab_trends(patient_id, loinc_code);
CREATE INDEX idx_qc_results_date ON lab_qc_results(run_date);

-- Sample LOINC codes data
INSERT INTO loinc_codes (code, component, property, time_aspect, system_type, scale_type, method_type, class, reference_range, critical_values, units, specimen_type) VALUES
('33747-0', 'Hemoglobin', 'MCnc', 'Pt', 'Bld', 'Qn', 'Automated count', 'HEMATOLOGY/CELL COUNTS', '{"male": "13.8-17.2", "female": "12.1-15.1"}', '{"low": "<7.0", "high": ">20.0"}', 'g/dL', 'Blood'),
('6690-2', 'Leukocytes', 'NCnc', 'Pt', 'Bld', 'Qn', 'Automated count', 'HEMATOLOGY/CELL COUNTS', '{"normal": "4.5-11.0"}', '{"low": "<1.0", "high": ">50.0"}', '10*3/uL', 'Blood'),
('777-3', 'Platelets', 'NCnc', 'Pt', 'Bld', 'Qn', 'Automated count', 'HEMATOLOGY/CELL COUNTS', '{"normal": "150-450"}', '{"low": "<50", "high": ">1000"}', '10*3/uL', 'Blood'),
('2951-2', 'Sodium', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Ion selective electrode', 'CHEMISTRY', '{"normal": "136-145"}', '{"low": "<120", "high": ">160"}', 'mmol/L', 'Serum'),
('2823-3', 'Potassium', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Ion selective electrode', 'CHEMISTRY', '{"normal": "3.5-5.1"}', '{"low": "<2.5", "high": ">6.5"}', 'mmol/L', 'Serum'),
('2160-0', 'Creatinine', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Enzymatic method', 'CHEMISTRY', '{"male": "0.74-1.35", "female": "0.59-1.04"}', '{"high": ">5.0"}', 'mg/dL', 'Serum'),
('33743-4', 'Troponin T', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', 'Immunoassay', 'CHEMISTRY', '{"normal": "<0.01"}', '{"high": ">0.04"}', 'ng/mL', 'Serum'),
('1975-2', 'Bilirubin.total', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Spectrophotometry', 'CHEMISTRY', '{"normal": "0.3-1.2"}', '{"high": ">20.0"}', 'mg/dL', 'Serum'),
('1742-6', 'ALT', 'CCnc', 'Pt', 'Ser/Plas', 'Qn', 'Enzymatic rate', 'CHEMISTRY', '{"male": "10-40", "female": "7-35"}', '{"high": ">1000"}', 'U/L', 'Serum'),
('1920-8', 'AST', 'CCnc', 'Pt', 'Ser/Plas', 'Qn', 'Enzymatic rate', 'CHEMISTRY', '{"male": "10-40", "female": "9-32"}', '{"high": ">1000"}', 'U/L', 'Serum');

-- Sample interpretation rules
INSERT INTO lab_interpretation_rules (loinc_code, condition_type, condition_criteria, interpretation_text, severity_level, auto_flag) VALUES
('33747-0', 'range', '{"low": 7.0, "high": 20.0}', 'Hemoglobin level requires immediate clinical attention', 'critical', true),
('6690-2', 'range', '{"low": 1.0, "high": 50.0}', 'White blood cell count indicates possible infection or hematologic disorder', 'critical', true),
('777-3', 'range', '{"low": 50}', 'Platelet count indicates bleeding risk - consider platelet transfusion', 'critical', true),
('2951-2', 'range', '{"low": 120, "high": 160}', 'Sodium level requires immediate intervention', 'critical', true),
('2823-3', 'range', '{"low": 2.5, "high": 6.5}', 'Potassium level requires cardiac monitoring and immediate treatment', 'critical', true),
('33743-4', 'range', '{"high": 0.04}', 'Elevated troponin indicates myocardial injury - consider acute coronary syndrome', 'critical', true);

-- Sample critical value notifications setup
INSERT INTO critical_value_notifications (lab_result_id, patient_id, loinc_code, critical_value, notification_level) 
SELECT 
  gen_random_uuid(),
  gen_random_uuid(),
  '33747-0',
  '5.2 g/dL',
  3
WHERE NOT EXISTS (SELECT 1 FROM critical_value_notifications LIMIT 1);