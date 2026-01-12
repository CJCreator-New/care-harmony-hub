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