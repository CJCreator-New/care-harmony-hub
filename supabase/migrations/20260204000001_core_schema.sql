-- Consolidated migration group: core_schema
-- Generated: 2026-02-04 18:14:00
-- Source migrations: 10

-- ============================================
-- Migration: 20240101000001_patient_prep_transaction.sql
-- ============================================

-- Database function for atomic patient prep completion
CREATE OR REPLACE FUNCTION complete_patient_prep(
  p_patient_id UUID,
  p_queue_entry_id UUID,
  p_vitals_data JSONB,
  p_chief_complaint TEXT,
  p_allergies TEXT DEFAULT NULL,
  p_current_medications TEXT DEFAULT NULL,
  p_nurse_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_hospital_id UUID;
BEGIN
  -- Get current user and hospital
  SELECT auth.uid() INTO v_user_id;
  SELECT hospital_id INTO v_hospital_id FROM patients WHERE id = p_patient_id;
  
  -- Start transaction
  BEGIN
    -- Insert vitals
    INSERT INTO patient_vitals (
      patient_id,
      hospital_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      weight,
      height,
      pain_scale,
      bmi,
      recorded_at,
      recorded_by
    ) VALUES (
      p_patient_id,
      v_hospital_id,
      (p_vitals_data->>'temperature')::NUMERIC,
      (p_vitals_data->>'blood_pressure_systolic')::NUMERIC,
      (p_vitals_data->>'blood_pressure_diastolic')::NUMERIC,
      (p_vitals_data->>'heart_rate')::NUMERIC,
      (p_vitals_data->>'respiratory_rate')::NUMERIC,
      (p_vitals_data->>'oxygen_saturation')::NUMERIC,
      (p_vitals_data->>'weight')::NUMERIC,
      (p_vitals_data->>'height')::NUMERIC,
      (p_vitals_data->>'pain_scale')::NUMERIC,
      (p_vitals_data->>'bmi')::NUMERIC,
      NOW(),
      v_user_id
    );
    
    -- Update or insert prep status
    INSERT INTO patient_prep_status (
      patient_id,
      queue_entry_id,
      vitals_completed,
      chief_complaint,
      allergies,
      current_medications,
      nurse_notes,
      prep_completed_at,
      prep_completed_by,
      status
    ) VALUES (
      p_patient_id,
      p_queue_entry_id,
      true,
      p_chief_complaint,
      p_allergies,
      p_current_medications,
      p_nurse_notes,
      NOW(),
      v_user_id,
      'ready_for_doctor'
    ) ON CONFLICT (patient_id, queue_entry_id) 
    DO UPDATE SET
      vitals_completed = true,
      chief_complaint = p_chief_complaint,
      allergies = p_allergies,
      current_medications = p_current_medications,
      nurse_notes = p_nurse_notes,
      prep_completed_at = NOW(),
      prep_completed_by = v_user_id,
      status = 'ready_for_doctor';
    
    -- Update queue status
    UPDATE patient_queue 
    SET 
      status = 'ready_for_doctor',
      nurse_prep_completed = true,
      updated_at = NOW()
    WHERE id = p_queue_entry_id;
    
    -- Insert notification for doctor
    INSERT INTO notifications (
      hospital_id,
      recipient_id,
      type,
      title,
      message,
      data,
      created_at
    )
    SELECT 
      v_hospital_id,
      pq.assigned_doctor_id,
      'patient_ready',
      'Patient Ready for Consultation',
      CONCAT(p.first_name, ' ', p.last_name, ' (', p.mrn, ') is ready for consultation. Chief complaint: ', p_chief_complaint),
      jsonb_build_object(
        'patient_id', p_patient_id,
        'queue_entry_id', p_queue_entry_id,
        'patient_name', CONCAT(p.first_name, ' ', p.last_name),
        'mrn', p.mrn,
        'chief_complaint', p_chief_complaint
      ),
      NOW()
    FROM patient_queue pq
    JOIN patients p ON p.id = p_patient_id
    WHERE pq.id = p_queue_entry_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction on any error
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- Migration: 20260103110000_fix_consultation_duplicates.sql
-- ============================================

-- Fix duplicate consultation creation issue
-- Add unique constraint to prevent multiple active consultations for same patient

-- First, clean up any existing duplicates (keep the latest one)
WITH duplicate_consultations AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY patient_id, doctor_id, status 
           ORDER BY created_at DESC
         ) as rn
  FROM public.consultations 
  WHERE status != 'completed'
)
DELETE FROM public.consultations 
WHERE id IN (
  SELECT id FROM duplicate_consultations WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.consultations 
ADD CONSTRAINT unique_active_consultation 
UNIQUE (patient_id, doctor_id, status) 
DEFERRABLE INITIALLY DEFERRED;


-- ============================================
-- Migration: 20260103120000_fix_patient_portal_rbac.sql
-- ============================================

-- Fix Patient Portal RBAC - Add missing RLS policies for patient access

-- Add patient access policies for appointments
CREATE POLICY "Patients can view their own appointments"
ON public.appointments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = appointments.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for consultations  
CREATE POLICY "Patients can view their own consultations"
ON public.consultations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = consultations.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for prescriptions
CREATE POLICY "Patients can view their own prescriptions"
ON public.prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescriptions.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for prescription items
CREATE POLICY "Patients can view their own prescription items"
ON public.prescription_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prescriptions pr
    JOIN public.patients p ON p.id = pr.patient_id
    WHERE pr.id = prescription_items.prescription_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for lab orders
CREATE POLICY "Patients can view their own lab orders"
ON public.lab_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = lab_orders.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access policies for vital signs
CREATE POLICY "Patients can view their own vital signs"
ON public.vital_signs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = vital_signs.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access to view their own patient record
CREATE POLICY "Patients can view their own patient record"
ON public.patients FOR SELECT
USING (user_id = auth.uid());

-- Add patient access to update their own patient record (limited fields)
CREATE POLICY "Patients can update their own contact info"
ON public.patients FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add patient access to invoices (their own)
CREATE POLICY "Patients can view their own invoices"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = invoices.patient_id 
    AND p.user_id = auth.uid()
  )
);

-- Add patient access to payments (their own)
CREATE POLICY "Patients can view their own payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.patients p ON p.id = i.patient_id
    WHERE i.id = payments.invoice_id 
    AND p.user_id = auth.uid()
  )
);


-- ============================================
-- Migration: 20260110000006_phase6_patient_portal.sql
-- ============================================

-- Phase 6: Patient Portal Enhancement
-- After Visit Summary & Digital Check-In

-- After Visit Summary templates and content
CREATE TABLE avs_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- visit_summary, discharge_instructions, medication_guide
  content_sections JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated After Visit Summaries
CREATE TABLE after_visit_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  consultation_id UUID REFERENCES consultations(id),
  doctor_id UUID REFERENCES profiles(id),
  visit_date DATE NOT NULL,
  chief_complaint TEXT,
  diagnosis_summary TEXT,
  treatment_plan TEXT,
  medications_prescribed JSONB,
  follow_up_instructions TEXT,
  next_appointment_date DATE,
  educational_materials JSONB,
  emergency_instructions TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  delivery_method TEXT, -- email, sms, portal, print
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient education materials
CREATE TABLE patient_education_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content_type TEXT NOT NULL, -- article, video, infographic, checklist
  category TEXT NOT NULL, -- condition, medication, procedure, lifestyle
  content_url TEXT,
  content_text TEXT,
  reading_level INTEGER, -- 1-12 grade level
  languages TEXT[] DEFAULT ARRAY['en'],
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital check-in sessions
CREATE TABLE digital_checkin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  session_token TEXT UNIQUE NOT NULL,
  checkin_status TEXT DEFAULT 'started', -- started, in_progress, completed, expired
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  checkin_data JSONB DEFAULT '{}',
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-visit questionnaires
CREATE TABLE pre_visit_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_name TEXT NOT NULL,
  specialty TEXT, -- general, cardiology, orthopedics, etc.
  questions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient questionnaire responses
CREATE TABLE questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  questionnaire_id UUID REFERENCES pre_visit_questionnaires(id),
  responses JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  clinical_notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secure messaging between patients and providers
CREATE TABLE secure_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID,
  patient_id UUID REFERENCES patients(id),
  sender_id UUID REFERENCES profiles(id),
  sender_type TEXT NOT NULL, -- patient, doctor, nurse, staff
  recipient_id UUID REFERENCES profiles(id),
  recipient_type TEXT NOT NULL,
  subject TEXT,
  message_body TEXT NOT NULL,
  message_type TEXT DEFAULT 'general', -- general, appointment, prescription, test_result
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  attachments JSONB,
  parent_message_id UUID REFERENCES secure_messages(id),
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital consent forms
CREATE TABLE consent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_name TEXT NOT NULL,
  form_type TEXT NOT NULL, -- treatment, privacy, financial, research
  form_content TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  requires_signature BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient consent records
CREATE TABLE patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  consent_form_id UUID REFERENCES consent_forms(id),
  appointment_id UUID REFERENCES appointments(id),
  consent_given BOOLEAN NOT NULL,
  digital_signature TEXT,
  witness_signature TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Symptom checker and triage
CREATE TABLE symptom_checker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  session_data JSONB NOT NULL,
  symptoms_reported TEXT[],
  severity_score INTEGER,
  triage_recommendation TEXT, -- self_care, schedule_appointment, urgent_care, emergency
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_avs_patient_date ON after_visit_summaries(patient_id, visit_date);
CREATE INDEX idx_checkin_sessions_token ON digital_checkin_sessions(session_token);
CREATE INDEX idx_checkin_sessions_appointment ON digital_checkin_sessions(appointment_id);
CREATE INDEX idx_questionnaire_responses_patient ON questionnaire_responses(patient_id);
CREATE INDEX idx_secure_messages_thread ON secure_messages(thread_id);
CREATE INDEX idx_secure_messages_patient ON secure_messages(patient_id);
CREATE INDEX idx_secure_messages_unread ON secure_messages(recipient_id, is_read);
CREATE INDEX idx_patient_consents_patient ON patient_consents(patient_id);
CREATE INDEX idx_symptom_checker_patient ON symptom_checker_sessions(patient_id);

-- Sample AVS templates
INSERT INTO avs_templates (template_name, template_type, content_sections, hospital_id) VALUES
('General Visit Summary', 'visit_summary', '{
  "sections": [
    {"id": "visit_info", "title": "Visit Information", "required": true},
    {"id": "chief_complaint", "title": "Reason for Visit", "required": true},
    {"id": "diagnosis", "title": "Diagnosis", "required": true},
    {"id": "treatment", "title": "Treatment Plan", "required": true},
    {"id": "medications", "title": "Medications", "required": false},
    {"id": "follow_up", "title": "Follow-up Instructions", "required": true},
    {"id": "emergency", "title": "When to Seek Emergency Care", "required": true}
  ]
}', gen_random_uuid()),
('Medication Instructions', 'medication_guide', '{
  "sections": [
    {"id": "new_medications", "title": "New Medications", "required": true},
    {"id": "changed_medications", "title": "Changed Medications", "required": false},
    {"id": "stopped_medications", "title": "Stopped Medications", "required": false},
    {"id": "side_effects", "title": "Possible Side Effects", "required": true},
    {"id": "interactions", "title": "Drug Interactions to Avoid", "required": false}
  ]
}', gen_random_uuid());

-- Sample pre-visit questionnaires
INSERT INTO pre_visit_questionnaires (questionnaire_name, specialty, questions, hospital_id) VALUES
('General Health Assessment', 'general', '{
  "questions": [
    {"id": "chief_complaint", "type": "text", "question": "What is the main reason for your visit today?", "required": true},
    {"id": "pain_scale", "type": "scale", "question": "Rate your pain level (0-10)", "min": 0, "max": 10, "required": false},
    {"id": "symptoms_duration", "type": "select", "question": "How long have you had these symptoms?", "options": ["Less than 1 day", "1-3 days", "1 week", "2-4 weeks", "More than 1 month"], "required": false},
    {"id": "medications_changed", "type": "boolean", "question": "Have any of your medications changed since your last visit?", "required": true},
    {"id": "allergies_changed", "type": "boolean", "question": "Have you developed any new allergies?", "required": true}
  ]
}', gen_random_uuid()),
('Cardiology Pre-Visit', 'cardiology', '{
  "questions": [
    {"id": "chest_pain", "type": "boolean", "question": "Have you experienced chest pain since your last visit?", "required": true},
    {"id": "shortness_breath", "type": "boolean", "question": "Have you had shortness of breath?", "required": true},
    {"id": "exercise_tolerance", "type": "select", "question": "How is your exercise tolerance?", "options": ["Better", "Same", "Worse"], "required": true},
    {"id": "medication_compliance", "type": "select", "question": "How often do you take your heart medications?", "options": ["Always", "Most of the time", "Sometimes", "Rarely"], "required": true}
  ]
}', gen_random_uuid());

-- Sample patient education materials
INSERT INTO patient_education_materials (title, content_type, category, content_text, reading_level, languages, tags) VALUES
('Understanding Your Blood Pressure', 'article', 'condition', 'Blood pressure is the force of blood pushing against your artery walls...', 8, ARRAY['en', 'es'], ARRAY['hypertension', 'cardiovascular']),
('How to Take Your Medications Safely', 'checklist', 'medication', 'Follow these steps to ensure you take your medications correctly...', 6, ARRAY['en'], ARRAY['medication_safety', 'adherence']),
('Preparing for Surgery', 'article', 'procedure', 'Here is what you need to know before your surgical procedure...', 9, ARRAY['en'], ARRAY['surgery', 'preparation']);

-- Sample consent forms
INSERT INTO consent_forms (form_name, form_type, form_content, requires_signature) VALUES
('General Treatment Consent', 'treatment', 'I consent to the medical treatment and procedures recommended by my healthcare provider...', true),
('HIPAA Privacy Notice', 'privacy', 'This notice describes how medical information about you may be used and disclosed...', true),
('Financial Responsibility Agreement', 'financial', 'I understand that I am financially responsible for all charges...', true);


-- ============================================
-- Migration: 20260117000003_phase7_patient_portal_enhancement.sql
-- ============================================

-- Phase 7: Patient Portal Enhancement
-- Migration: 20260117000003_phase7_patient_portal_enhancement.sql

-- Enable RLS
ALTER TABLE IF EXISTS symptom_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS health_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS symptom_library ENABLE ROW LEVEL SECURITY;

-- Symptom Library Table
CREATE TABLE IF NOT EXISTS symptom_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Symptom Analyses Table
CREATE TABLE IF NOT EXISTS symptom_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    symptoms JSONB NOT NULL,
    possible_conditions JSONB NOT NULL,
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'emergency')),
    recommendations TEXT[] NOT NULL,
    disclaimer TEXT NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_model_version TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Vital Signs Table
CREATE TABLE IF NOT EXISTS vital_signs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('blood_pressure', 'heart_rate', 'temperature', 'weight', 'blood_glucose', 'oxygen_saturation', 'respiratory_rate')),
    value DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID NOT NULL REFERENCES profiles(id),
    device_type TEXT,
    notes TEXT,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Health Metrics Table
CREATE TABLE IF NOT EXISTS health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('steps', 'sleep_hours', 'water_intake', 'calories_burned', 'mood', 'pain_level', 'energy_level')),
    value DECIMAL(8,2) NOT NULL,
    unit TEXT NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    UNIQUE(patient_id, metric_type, date)
);

-- Health Goals Table
CREATE TABLE IF NOT EXISTS health_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('weight_loss', 'exercise', 'blood_pressure', 'blood_glucose', 'medication_adherence', 'appointment_attendance')),
    target_value DECIMAL(8,2) NOT NULL,
    current_value DECIMAL(8,2) DEFAULT 0,
    unit TEXT NOT NULL,
    deadline DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Health Alerts Table
CREATE TABLE IF NOT EXISTS health_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('abnormal_vital', 'missed_medication', 'upcoming_appointment', 'goal_deadline', 'health_reminder')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    message TEXT NOT NULL,
    action_required BOOLEAN DEFAULT false,
    action_taken BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_symptom_analyses_patient_id ON symptom_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_symptom_analyses_analyzed_at ON symptom_analyses(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON vital_signs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_vital_signs_type ON vital_signs(type);
CREATE INDEX IF NOT EXISTS idx_health_metrics_patient_id ON health_metrics(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_date ON health_metrics(date);
CREATE INDEX IF NOT EXISTS idx_health_goals_patient_id ON health_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_goals_status ON health_goals(status);
CREATE INDEX IF NOT EXISTS idx_health_alerts_patient_id ON health_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_alerts_resolved ON health_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_symptom_library_category ON symptom_library(category);
CREATE INDEX IF NOT EXISTS idx_symptom_library_active ON symptom_library(active);

-- Row Level Security Policies

-- Symptom Library (public read for active symptoms)
CREATE POLICY "Symptom library is viewable by authenticated users" ON symptom_library
    FOR SELECT USING (active = true AND auth.role() = 'authenticated');

-- Symptom Analyses
CREATE POLICY "Users can view their own symptom analyses" ON symptom_analyses
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own symptom analyses" ON symptom_analyses
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Vital Signs
CREATE POLICY "Users can view their own vital signs" ON vital_signs
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Healthcare staff can view patient vital signs" ON vital_signs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('doctor', 'nurse', 'lab_technician', 'pharmacist', 'admin')
            AND hospital_id = vital_signs.hospital_id
        )
    );

CREATE POLICY "Users can insert their own vital signs" ON vital_signs
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Healthcare staff can insert patient vital signs" ON vital_signs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('doctor', 'nurse', 'lab_technician', 'pharmacist', 'admin')
            AND hospital_id = vital_signs.hospital_id
        )
    );

-- Health Metrics
CREATE POLICY "Users can view their own health metrics" ON health_metrics
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own health metrics" ON health_metrics
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their own health metrics" ON health_metrics
    FOR UPDATE USING (auth.uid() = patient_id);

-- Health Goals
CREATE POLICY "Users can view their own health goals" ON health_metrics
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own health goals" ON health_goals
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their own health goals" ON health_goals
    FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Healthcare staff can view patient health goals" ON health_goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('doctor', 'nurse', 'pharmacist', 'admin')
            AND hospital_id = health_goals.hospital_id
        )
    );

-- Health Alerts
CREATE POLICY "Users can view their own health alerts" ON health_alerts
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Users can update their own health alerts" ON health_alerts
    FOR UPDATE USING (auth.uid() = patient_id);

CREATE POLICY "Healthcare staff can manage patient health alerts" ON health_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('doctor', 'nurse', 'pharmacist', 'admin')
            AND hospital_id = health_alerts.hospital_id
        )
    );

-- Functions

-- Function to get health trends
CREATE OR REPLACE FUNCTION get_health_trends(
    p_patient_id UUID,
    p_period TEXT DEFAULT '30d'
)
RETURNS TABLE (
    metric TEXT,
    current_value DECIMAL,
    previous_value DECIMAL,
    change_percentage DECIMAL,
    trend TEXT,
    period TEXT
) AS $$
DECLARE
    period_days INTEGER;
BEGIN
    -- Convert period to days
    period_days := CASE
        WHEN p_period = '7d' THEN 7
        WHEN p_period = '30d' THEN 30
        WHEN p_period = '90d' THEN 90
        ELSE 30
    END;

    RETURN QUERY
    WITH current_period AS (
        SELECT
            metric_type,
            AVG(value) as avg_value
        FROM health_metrics
        WHERE patient_id = p_patient_id
        AND date >= CURRENT_DATE - INTERVAL '1 day' * period_days
        GROUP BY metric_type
    ),
    previous_period AS (
        SELECT
            metric_type,
            AVG(value) as avg_value
        FROM health_metrics
        WHERE patient_id = p_patient_id
        AND date >= CURRENT_DATE - INTERVAL '1 day' * (period_days * 2)
        AND date < CURRENT_DATE - INTERVAL '1 day' * period_days
        GROUP BY metric_type
    )
    SELECT
        COALESCE(cp.metric_type, pp.metric_type) as metric,
        COALESCE(cp.avg_value, 0) as current_value,
        COALESCE(pp.avg_value, 0) as previous_value,
        CASE
            WHEN pp.avg_value > 0 THEN
                ROUND(((cp.avg_value - pp.avg_value) / pp.avg_value) * 100, 2)
            ELSE 0
        END as change_percentage,
        CASE
            WHEN cp.avg_value > pp.avg_value THEN 'improving'
            WHEN cp.avg_value < pp.avg_value THEN 'declining'
            ELSE 'stable'
        END as trend,
        p_period as period
    FROM current_period cp
    FULL OUTER JOIN previous_period pp ON cp.metric_type = pp.metric_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for abnormal vital signs and create alerts
CREATE OR REPLACE FUNCTION check_vital_sign_abnormality()
RETURNS TRIGGER AS $$
DECLARE
    normal_ranges JSONB;
    vital_value DECIMAL;
    is_abnormal BOOLEAN := false;
    alert_message TEXT;
BEGIN
    -- Define normal ranges
    normal_ranges := '{
        "blood_pressure": {"systolic": {"min": 90, "max": 140}, "diastolic": {"min": 60, "max": 90}},
        "heart_rate": {"min": 60, "max": 100},
        "temperature": {"min": 97.0, "max": 99.0},
        "blood_glucose": {"min": 70, "max": 140},
        "oxygen_saturation": {"min": 95, "max": 100},
        "respiratory_rate": {"min": 12, "max": 20}
    }'::jsonb;

    -- Check for abnormal values
    CASE NEW.type
        WHEN 'blood_pressure' THEN
            -- Handle systolic/diastolic format (e.g., "120/80")
            IF NEW.value::text LIKE '%/%' THEN
                vital_value := split_part(NEW.value::text, '/', 1)::decimal; -- systolic
                IF vital_value < (normal_ranges->'blood_pressure'->'systolic'->>'min')::decimal OR
                   vital_value > (normal_ranges->'blood_pressure'->'systolic'->>'max')::decimal THEN
                    is_abnormal := true;
                    alert_message := 'Abnormal systolic blood pressure: ' || vital_value || ' mmHg';
                END IF;

                vital_value := split_part(NEW.value::text, '/', 2)::decimal; -- diastolic
                IF vital_value < (normal_ranges->'blood_pressure'->'diastolic'->>'min')::decimal OR
                   vital_value > (normal_ranges->'blood_pressure'->'diastolic'->>'max')::decimal THEN
                    is_abnormal := true;
                    alert_message := 'Abnormal diastolic blood pressure: ' || vital_value || ' mmHg';
                END IF;
            END IF;
        WHEN 'heart_rate', 'temperature', 'blood_glucose', 'oxygen_saturation', 'respiratory_rate' THEN
            IF NEW.value < (normal_ranges->NEW.type->>'min')::decimal OR
               NEW.value > (normal_ranges->NEW.type->>'max')::decimal THEN
                is_abnormal := true;
                alert_message := 'Abnormal ' || REPLACE(NEW.type, '_', ' ') || ': ' || NEW.value || ' ' || NEW.unit;
            END IF;
    END CASE;

    -- Create alert if abnormal
    IF is_abnormal THEN
        INSERT INTO health_alerts (
            patient_id,
            alert_type,
            severity,
            message,
            action_required,
            hospital_id
        ) VALUES (
            NEW.patient_id,
            'abnormal_vital',
            CASE
                WHEN NEW.type IN ('blood_pressure', 'heart_rate') AND NEW.value > (normal_ranges->NEW.type->>'max')::decimal * 1.5 THEN 'high'
                WHEN NEW.type = 'oxygen_saturation' AND NEW.value < 90 THEN 'high'
                ELSE 'medium'
            END,
            alert_message,
            true,
            NEW.hospital_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for vital sign abnormality checking
DROP TRIGGER IF EXISTS trigger_check_vital_abnormality ON vital_signs;
CREATE TRIGGER trigger_check_vital_abnormality
    AFTER INSERT ON vital_signs
    FOR EACH ROW EXECUTE FUNCTION check_vital_sign_abnormality();

-- Function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate progress percentage
    IF NEW.target_value > 0 THEN
        NEW.progress_percentage := LEAST((NEW.current_value / NEW.target_value) * 100, 100);
    END IF;

    -- Auto-complete goals that reach target
    IF NEW.current_value >= NEW.target_value AND NEW.status = 'active' THEN
        NEW.status := 'completed';
        NEW.updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for goal progress updates
DROP TRIGGER IF EXISTS trigger_update_goal_progress ON health_goals;
CREATE TRIGGER trigger_update_goal_progress
    BEFORE UPDATE ON health_goals
    FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

-- Insert sample symptom library data
INSERT INTO symptom_library (name, category, description) VALUES
-- General symptoms
('Fatigue', 'general', 'Feeling tired or lacking energy'),
('Fever', 'general', 'Elevated body temperature'),
('Chills', 'general', 'Feeling cold and shivering'),
('Sweating', 'general', 'Excessive sweating'),
('Weight loss', 'general', 'Unintended weight loss'),
('Weight gain', 'general', 'Unintended weight gain'),
('Loss of appetite', 'general', 'Reduced desire to eat'),
('Nausea', 'general', 'Feeling like vomiting'),
('Vomiting', 'general', 'Expelling stomach contents'),
('Dizziness', 'general', 'Feeling lightheaded or unsteady'),
('Headache', 'general', 'Pain in the head'),

-- Cardiovascular symptoms
('Chest pain', 'cardiovascular', 'Pain or discomfort in the chest'),
('Palpitations', 'cardiovascular', 'Awareness of heartbeat'),
('Shortness of breath', 'cardiovascular', 'Difficulty breathing'),
('Swelling in legs', 'cardiovascular', 'Edema in lower extremities'),
('High blood pressure', 'cardiovascular', 'Elevated blood pressure'),
('Irregular heartbeat', 'cardiovascular', 'Abnormal heart rhythm'),
('Fainting', 'cardiovascular', 'Loss of consciousness'),

-- Respiratory symptoms
('Cough', 'respiratory', 'Expelling air from lungs'),
('Sore throat', 'respiratory', 'Pain or irritation in throat'),
('Runny nose', 'respiratory', 'Excess nasal discharge'),
('Congestion', 'respiratory', 'Stuffy nose or chest'),
('Wheezing', 'respiratory', 'High-pitched breathing sound'),
('Difficulty breathing', 'respiratory', 'Labored breathing'),
('Chest tightness', 'respiratory', 'Feeling of pressure in chest'),

-- Neurological symptoms
('Headache', 'neurological', 'Pain in the head'),
('Dizziness', 'neurological', 'Feeling lightheaded'),
('Confusion', 'neurological', 'Mental confusion'),
('Memory problems', 'neurological', 'Difficulty remembering'),
('Seizures', 'neurological', 'Abnormal electrical activity in brain'),
('Numbness', 'neurological', 'Loss of sensation'),
('Tingling', 'neurological', 'Pins and needles sensation'),
('Weakness', 'neurological', 'Loss of strength'),
('Vision changes', 'neurological', 'Changes in eyesight'),

-- Gastrointestinal symptoms
('Abdominal pain', 'gastrointestinal', 'Pain in the abdomen'),
('Diarrhea', 'gastrointestinal', 'Loose or watery stools'),
('Constipation', 'gastrointestinal', 'Difficulty passing stools'),
('Heartburn', 'gastrointestinal', 'Burning sensation in chest'),
('Nausea', 'gastrointestinal', 'Feeling like vomiting'),
('Vomiting', 'gastrointestinal', 'Expelling stomach contents'),
('Blood in stool', 'gastrointestinal', 'Blood in feces'),
('Difficulty swallowing', 'gastrointestinal', 'Trouble swallowing'),

-- Musculoskeletal symptoms
('Joint pain', 'musculoskeletal', 'Pain in joints'),
('Muscle pain', 'musculoskeletal', 'Pain in muscles'),
('Back pain', 'musculoskeletal', 'Pain in the back'),
('Neck pain', 'musculoskeletal', 'Pain in the neck'),
('Stiffness', 'musculoskeletal', 'Reduced flexibility'),
('Swelling', 'musculoskeletal', 'Increased size of body part'),
('Limited mobility', 'musculoskeletal', 'Reduced movement'),
('Muscle weakness', 'musculoskeletal', 'Reduced muscle strength'),

-- Skin symptoms
('Rash', 'skin', 'Skin irritation or eruption'),
('Itching', 'skin', 'Itchy sensation'),
('Redness', 'skin', 'Skin redness'),
('Swelling', 'skin', 'Increased skin size'),
('Bruising', 'skin', 'Skin discoloration from injury'),
('Ulcers', 'skin', 'Open sores'),
('Hair loss', 'skin', 'Loss of hair'),
('Nail changes', 'skin', 'Changes in fingernails/toenails'),

-- Mental health symptoms
('Anxiety', 'mental', 'Feeling of worry or nervousness'),
('Depression', 'mental', 'Persistent sadness'),
('Insomnia', 'mental', 'Difficulty sleeping'),
('Mood changes', 'mental', 'Changes in emotional state'),
('Confusion', 'mental', 'Mental confusion'),
('Memory loss', 'mental', 'Loss of memory'),
('Hallucinations', 'mental', 'Seeing or hearing things that aren\'t there'),
('Suicidal thoughts', 'mental', 'Thoughts of self-harm')
ON CONFLICT (name, category) DO NOTHING;


-- ============================================
-- Migration: 20260124000005_role_workflow_enhancements.sql
-- ============================================

-- ============================================================================
-- PHASE 6: LAB AUTOMATION & WORKFLOW ENHANCEMENTS
-- Target: Lab Equipment Tracking & Missing Tables
-- Created: 2026-01-24
-- ============================================================================

-- 1. LAB EQUIPMENT MANAGEMENT
-- Tracks analyzer status, maintenance schedules, and integration metadata
CREATE TABLE IF NOT EXISTS lab_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Equipment Identity
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  type TEXT CHECK (type IN ('hematology', 'chemistry', 'immunoassay', 'urinalysis', 'microbiology', 'molecular', 'other')),
  location TEXT,
  
  -- Operational Status
  status TEXT CHECK (status IN ('online', 'offline', 'maintenance', 'error', 'calibrating')) DEFAULT 'online',
  utilization_rate INTEGER DEFAULT 0, -- 0-100 percentage
  temperature DECIMAL(5,2), -- monitoring metric
  
  -- Maintenance Tracking
  last_maintenance_date TIMESTAMPTZ,
  next_maintenance_due TIMESTAMPTZ,
  last_calibration_date TIMESTAMPTZ,
  calibration_due_date TIMESTAMPTZ,
  
  -- QC Status
  qc_status TEXT CHECK (qc_status IN ('passed', 'failed', 'pending', 'expired')) DEFAULT 'pending',
  
  -- Health & Prediction (for predictive maintenance)
  health_score INTEGER DEFAULT 100,
  predicted_failure_prob INTEGER DEFAULT 0,
  
  -- Integration
  ip_address TEXT,
  port INTEGER,
  protocol TEXT DEFAULT 'hl7',
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EQUIPMENT ERROR LOGS
-- Detailed error tracking for maintenance analysis
CREATE TABLE IF NOT EXISTS lab_equipment_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES lab_equipment(id) ON DELETE CASCADE NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  error_code TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(user_id),
  
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QC TEST RUNS
-- Stores Levey-Jennings data points
CREATE TABLE IF NOT EXISTS lab_qc_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES lab_equipment(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  test_code TEXT NOT NULL,
  
  -- Results
  run_time TIMESTAMPTZ DEFAULT NOW(),
  value DECIMAL(10,4) NOT NULL,
  target_mean DECIMAL(10,4),
  target_sd DECIMAL(10,4),
  deviation_index DECIMAL(10,4), -- Z-score
  
  -- Evaluation
  result_status TEXT CHECK (result_status IN ('pass', 'fail', 'warning')),
  westgard_violation TEXT, -- e.g., '1:3s'
  
  operator_id UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_equipment_hospital ON lab_equipment(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_equipment_status ON lab_equipment(status);
CREATE INDEX IF NOT EXISTS idx_lab_qc_runs_equipment_time ON lab_qc_runs(equipment_id, run_time DESC);

-- RLS
ALTER TABLE lab_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_equipment_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_qc_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_staff_view_equipment" ON lab_equipment
  FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "lab_admins_manage_equipment" ON lab_equipment
  FOR ALL TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'lab_tech'))
  );

CREATE POLICY "hospital_staff_view_qc" ON lab_qc_runs
  FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_lab_equipment_modtime
    BEFORE UPDATE ON lab_equipment
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Seed some mock equipment data for development
INSERT INTO lab_equipment (hospital_id, name, model, type, status, health_score) 
SELECT 
  id, 
  'Hematology X100', 
  'Sysmex-XN', 
  'hematology', 
  'online', 
  98 
FROM hospitals 
LIMIT 1;


-- ============================================
-- Migration: 20260129000001_fix_patient_portal_rls_policies.sql
-- ============================================

-- Fix patient portal access issues by adding proper RLS policies
-- Migration: 20260129000001_fix_patient_portal_rls_policies.sql

-- Add patient access policy for appointments (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'appointments'
        AND policyname = 'Patients can view their own appointments'
    ) THEN
        CREATE POLICY "Patients can view their own appointments"
        ON public.appointments FOR SELECT
        USING (
            patient_id IN (
                SELECT id FROM public.patients WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Add patient access policy for prescriptions (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'prescriptions'
        AND policyname = 'Patients can view their own prescriptions'
    ) THEN
        CREATE POLICY "Patients can view their own prescriptions"
        ON public.prescriptions FOR SELECT
        USING (
            patient_id IN (
                SELECT id FROM public.patients WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Add patient access policy for lab_results (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'lab_results'
        AND policyname = 'Patients can view their own lab results'
    ) THEN
        CREATE POLICY "Patients can view their own lab results"
        ON lab_results FOR SELECT
        USING (
            patient_id IN (
                SELECT id FROM patients WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;


-- ============================================
-- Migration: 20260129000002_create_prescription_queue.sql
-- ============================================

-- Create prescription_queue for durable pharmacy queue
CREATE TABLE IF NOT EXISTS prescription_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('queued','processing','dispensed','cancelled')) DEFAULT 'queued',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prescription_queue_hospital ON prescription_queue(hospital_id);
CREATE INDEX IF NOT EXISTS idx_prescription_queue_prescription ON prescription_queue(prescription_id);

-- Enable RLS
ALTER TABLE prescription_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital staff can view prescription queue" ON prescription_queue
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Hospital staff can insert into prescription queue" ON prescription_queue
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacist can update prescription queue status" ON prescription_queue
  FOR UPDATE TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'pharmacist'
    )
  );

COMMENT ON TABLE prescription_queue IS 'Durable queue of prescriptions for pharmacy fulfillment';


-- ============================================
-- Migration: 20260129000003_create_lab_queue.sql
-- ============================================

-- Create lab_queue for laboratory task queue
CREATE TABLE IF NOT EXISTS lab_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  lab_order_id UUID REFERENCES lab_orders(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('queued','collected','processing','completed','cancelled')) DEFAULT 'queued',
  priority TEXT DEFAULT 'normal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_queue_hospital ON lab_queue(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_queue_order ON lab_queue(lab_order_id);

-- Enable RLS
ALTER TABLE lab_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital staff can view lab queue" ON lab_queue
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Hospital staff can insert into lab queue" ON lab_queue
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Lab techs can update lab queue" ON lab_queue
  FOR UPDATE TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'lab_technician'
    )
  );

COMMENT ON TABLE lab_queue IS 'Durable queue of lab orders for specimen collection and processing';


-- ============================================
-- Migration: 20260130000000_create_patient_consents.sql
-- ============================================

-- Create patient_consents table for ConsentForm.tsx
CREATE TABLE IF NOT EXISTS patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_consent BOOLEAN DEFAULT FALSE,
  data_processing_consent BOOLEAN DEFAULT FALSE,
  telemedicine_consent BOOLEAN DEFAULT FALSE,
  data_sharing_consent BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ DEFAULT NOW(),
  consented_by UUID REFERENCES profiles(id),
  witness_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hospital_id UUID REFERENCES hospitals(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_hospital ON patient_consents(hospital_id);

-- Enable RLS
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view consents for their hospital"
  ON patient_consents FOR SELECT
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Staff can insert consents"
  ON patient_consents FOR INSERT
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Staff can update consents"
  ON patient_consents FOR UPDATE
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));


