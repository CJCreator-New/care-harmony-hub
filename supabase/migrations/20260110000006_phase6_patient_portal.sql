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