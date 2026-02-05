-- Phase 4: Database Schema Completion
-- Add missing enhancement tables for complete healthcare workflow

-- 1. LOINC Codes Table (Lab standardization)
CREATE TABLE IF NOT EXISTS loinc_codes (
  code TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  property TEXT,
  time_aspect TEXT,
  system_type TEXT,
  scale_type TEXT,
  reference_range JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Triage Assessments Table (Nurse workflow)
CREATE TABLE IF NOT EXISTS triage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  esi_level INTEGER CHECK (esi_level BETWEEN 1 AND 5),
  chief_complaint TEXT,
  vital_signs JSONB,
  symptoms JSONB,
  immediate_attention_required BOOLEAN DEFAULT false,
  high_risk_flags TEXT[],
  notes TEXT,
  assessed_by UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Task Assignments Table (Cross-role workflow)
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID REFERENCES profiles(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Care Gaps Table (Population health)
CREATE TABLE IF NOT EXISTS care_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  measure_type TEXT NOT NULL,
  measure_name TEXT NOT NULL,
  due_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'due', 'overdue', 'completed', 'not_applicable')),
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_loinc_codes_component ON loinc_codes(component);
CREATE INDEX IF NOT EXISTS idx_loinc_codes_system ON loinc_codes(system_type);

CREATE INDEX IF NOT EXISTS idx_triage_assessments_patient ON triage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_hospital ON triage_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_esi ON triage_assessments(esi_level);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_urgent ON triage_assessments(immediate_attention_required) WHERE immediate_attention_required = true;

CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON task_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by ON task_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_task_assignments_patient ON task_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_due_date ON task_assignments(due_date) WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_care_gaps_patient ON care_gaps(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_care_gaps_hospital ON care_gaps(hospital_id);
CREATE INDEX IF NOT EXISTS idx_care_gaps_due_date ON care_gaps(due_date) WHERE status IN ('open', 'due', 'overdue');

-- Enable RLS on all new tables
ALTER TABLE loinc_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_gaps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for LOINC codes (reference data - readable by all authenticated hospital users)
CREATE POLICY "LOINC codes viewable by hospital users"
ON loinc_codes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id IS NOT NULL
  )
);

-- RLS Policies for Triage Assessments (hospital scoped)
CREATE POLICY "Triage assessments hospital scoped"
ON triage_assessments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = triage_assessments.hospital_id
  )
);

-- RLS Policies for Task Assignments (hospital scoped + assigned user access)
CREATE POLICY "Task assignments hospital scoped"
ON task_assignments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = task_assignments.hospital_id
    AND (
      p.is_staff = true OR
      p.id = task_assignments.assigned_to OR
      p.id = task_assignments.assigned_by
    )
  )
);

-- RLS Policies for Care Gaps (hospital scoped + patient access)
CREATE POLICY "Care gaps hospital scoped"
ON care_gaps FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = care_gaps.hospital_id
    AND (
      p.is_staff = true OR
      EXISTS (
        SELECT 1 FROM patients pt
        WHERE pt.id = care_gaps.patient_id
        AND pt.user_id = auth.uid()
      )
    )
  )
);

-- Insert sample LOINC codes for common lab tests
INSERT INTO loinc_codes (code, component, property, time_aspect, system_type, scale_type, reference_range) VALUES
('33747-0', 'Hemoglobin', 'MCnc', 'Pt', 'Bld', 'Qn', '{"male": "13.8-17.2 g/dL", "female": "12.1-15.1 g/dL"}'),
('4544-3', 'Hematocrit', 'VFr', 'Pt', 'Bld', 'Qn', '{"male": "40.7-50.3%", "female": "36.1-44.3%"}'),
('6690-2', 'Leukocytes', 'NCnc', 'Pt', 'Bld', 'Qn', '{"normal": "4.8-10.8 x10³/µL"}'),
('777-3', 'Platelets', 'NCnc', 'Pt', 'Bld', 'Qn', '{"normal": "150-450 x10³/µL"}'),
('2093-3', 'Cholesterol', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', '{"desirable": "<200 mg/dL", "borderline": "200-239 mg/dL", "high": "≥240 mg/dL"}'),
('2571-8', 'Triglycerides', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', '{"normal": "<150 mg/dL"}'),
('33914-3', 'GFR', 'VRat', 'Pt', 'Ser/Plas/Bld', 'Qn', '{"normal": "≥90 mL/min/1.73m²"}'),
('2160-0', 'Creatinine', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', '{"male": "0.74-1.35 mg/dL", "female": "0.59-1.04 mg/dL"}'),
('6299-2', 'BUN', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', '{"normal": "6-24 mg/dL"}'),
('4548-4', 'Hemoglobin A1c', 'MFr', 'Pt', 'Bld', 'Qn', '{"normal": "<5.7%", "prediabetes": "5.7-6.4%", "diabetes": "≥6.5%"}')
ON CONFLICT (code) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_assignments_updated_at 
    BEFORE UPDATE ON task_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_care_gaps_updated_at 
    BEFORE UPDATE ON care_gaps 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON loinc_codes TO authenticated;
GRANT ALL ON triage_assessments TO authenticated;
GRANT ALL ON task_assignments TO authenticated;
GRANT ALL ON care_gaps TO authenticated;