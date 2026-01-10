-- Phase 1: Foundation Database Schema
-- CPT Codes and Clinical Templates for SOAP Note Enhancement

-- CPT Codes table for billing integration
CREATE TABLE IF NOT EXISTS cpt_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT,
  base_fee DECIMAL(10,2),
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical Templates for structured documentation
CREATE TABLE IF NOT EXISTS clinical_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'encounter', 'order_set', 'medication_bundle', 'hpi_template'
  specialty TEXT,
  template_data JSONB,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cpt_codes_category ON cpt_codes(category);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_hospital ON cpt_codes(hospital_id);
CREATE INDEX IF NOT EXISTS idx_clinical_templates_type ON clinical_templates(type, specialty);
CREATE INDEX IF NOT EXISTS idx_clinical_templates_hospital ON clinical_templates(hospital_id);

-- Insert sample CPT codes for common procedures
INSERT INTO cpt_codes (code, description, category, base_fee) VALUES
('99213', 'Office visit, established patient, level 3', 'Evaluation and Management', 150.00),
('99214', 'Office visit, established patient, level 4', 'Evaluation and Management', 200.00),
('99203', 'Office visit, new patient, level 3', 'Evaluation and Management', 180.00),
('99204', 'Office visit, new patient, level 4', 'Evaluation and Management', 250.00),
('36415', 'Venipuncture', 'Laboratory', 25.00),
('85025', 'Complete blood count', 'Laboratory', 35.00),
('80053', 'Comprehensive metabolic panel', 'Laboratory', 45.00)
ON CONFLICT (code) DO NOTHING;

-- Insert HPI templates
INSERT INTO clinical_templates (name, type, specialty, template_data) VALUES
('OLDCARTS Template', 'hpi_template', 'General', '{
  "name": "OLDCARTS",
  "description": "Onset, Location, Duration, Character, Aggravating factors, Relieving factors, Timing, Severity",
  "fields": [
    {"key": "onset", "label": "Onset", "type": "text", "required": true},
    {"key": "location", "label": "Location", "type": "text", "required": true},
    {"key": "duration", "label": "Duration", "type": "text", "required": true},
    {"key": "character", "label": "Character", "type": "text", "required": true},
    {"key": "aggravating", "label": "Aggravating Factors", "type": "text"},
    {"key": "relieving", "label": "Relieving Factors", "type": "text"},
    {"key": "timing", "label": "Timing", "type": "text"},
    {"key": "severity", "label": "Severity (1-10)", "type": "number", "min": 1, "max": 10}
  ]
}'),
('OPQRST Template', 'hpi_template', 'General', '{
  "name": "OPQRST",
  "description": "Onset, Provocation, Quality, Radiation, Severity, Timing",
  "fields": [
    {"key": "onset", "label": "Onset", "type": "text", "required": true},
    {"key": "provocation", "label": "Provocation/Palliation", "type": "text"},
    {"key": "quality", "label": "Quality", "type": "text", "required": true},
    {"key": "radiation", "label": "Radiation", "type": "text"},
    {"key": "severity", "label": "Severity (1-10)", "type": "number", "min": 1, "max": 10, "required": true},
    {"key": "timing", "label": "Timing", "type": "text", "required": true}
  ]
}')
ON CONFLICT (id) DO NOTHING;