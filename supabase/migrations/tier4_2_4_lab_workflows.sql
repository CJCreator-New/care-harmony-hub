-- ===================================================================
-- TIER 4.2 & 4.4: Lab Notification & Critical Alert Workflows
-- ===================================================================
-- Purpose: Unified schema for lab result notifications (4.2) and 
--          critical lab value alerts with escalation (4.4)
-- Created: April 18, 2026
-- ===================================================================

-- Lab critical ranges configuration (shared foundation for 4.2 & 4.4)
CREATE TABLE IF NOT EXISTS public.lab_critical_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  test_code TEXT NOT NULL, -- LOINC code (e.g., "2345-7" for glucose)
  test_name TEXT NOT NULL,
  critical_low NUMERIC,
  critical_high NUMERIC,
  warning_low NUMERIC,
  warning_high NUMERIC,
  unit_of_measure TEXT,
  age_group TEXT, -- 'neonatal', 'infant', 'child', 'adult', 'geriatric'
  gender TEXT, -- 'M', 'F', 'both'
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(hospital_id, test_code, age_group, gender)
);

ALTER TABLE public.lab_critical_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_critical_ranges_hospital_scope" ON public.lab_critical_ranges
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "lab_critical_ranges_insert" ON public.lab_critical_ranges
  FOR INSERT WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid())
    AND auth.uid() IN (
      SELECT ur.user_id FROM user_roles ur 
      WHERE ur.role IN ('admin', 'doctor', 'lab_manager')
    )
  );

CREATE INDEX idx_lab_critical_ranges_hospital_test 
  ON public.lab_critical_ranges(hospital_id, test_code, age_group);

-- Trigger for updated_at
CREATE TRIGGER lab_critical_ranges_moddatetime BEFORE UPDATE
  ON public.lab_critical_ranges FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

-- ===================================================================
-- TIER 4.2: Lab Result Notifications
-- ===================================================================
-- State flow: pending → notified → acknowledged → acted_upon (→ cancelled)
-- Purpose: Track when doctors are notified of lab results and respond

CREATE TABLE IF NOT EXISTS public.lab_result_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  lab_result_id UUID NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  ordering_doctor_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'acknowledged', 'acted_upon', 'cancelled')),
  notification_method TEXT, -- 'sms', 'in_app', 'email', 'combined'
  is_critical BOOLEAN DEFAULT FALSE,
  requires_immediate_action BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  acted_upon_at TIMESTAMPTZ,
  action_notes TEXT,
  consent_logged BOOLEAN DEFAULT FALSE,
  consent_logged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}', -- { sms_status, email_status, delivery_timestamp, etc. }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lab_result_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_result_notifications_hospital_scope" ON public.lab_result_notifications
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "lab_result_notifications_doctor_access" ON public.lab_result_notifications
  USING (
    auth.uid() IN (
      SELECT ordering_doctor_id FROM public.lab_result_notifications WHERE id = lab_result_notifications.id
      UNION
      SELECT acknowledged_by FROM public.lab_result_notifications WHERE id = lab_result_notifications.id AND acknowledged_by IS NOT NULL
    )
    OR auth.uid() IN (
      SELECT ur.user_id FROM user_roles ur 
      WHERE ur.role IN ('admin', 'lab_manager')
    )
  );

CREATE INDEX idx_lab_result_notifications_hospital 
  ON public.lab_result_notifications(hospital_id, status);

CREATE INDEX idx_lab_result_notifications_doctor 
  ON public.lab_result_notifications(ordering_doctor_id, status);

CREATE INDEX idx_lab_result_notifications_pending 
  ON public.lab_result_notifications(hospital_id) 
  WHERE status IN ('pending', 'notified');

CREATE TRIGGER lab_result_notifications_moddatetime BEFORE UPDATE
  ON public.lab_result_notifications FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

-- Audit logging for lab notifications
CREATE TRIGGER lab_result_notifications_audit AFTER UPDATE
  ON public.lab_result_notifications FOR EACH ROW
  EXECUTE PROCEDURE log_activity_trigger('update', 'lab_result_notifications');

-- ===================================================================
-- TIER 4.4: Critical Lab Alerts with Escalation
-- ===================================================================
-- State flow: detected → primary_notified → on_call_notified → er_notified (→ resolved)
-- Purpose: Track critical lab values and multi-level escalation

CREATE TABLE IF NOT EXISTS public.lab_critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  lab_result_id UUID NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  result_value NUMERIC NOT NULL,
  critical_range_id UUID REFERENCES public.lab_critical_ranges(id),
  severity TEXT NOT NULL 
    CHECK (severity IN ('critical_high', 'critical_low', 'warning'))
    DEFAULT 'critical_high',
  
  -- Primary doctor escalation
  primary_doctor_id UUID NOT NULL REFERENCES profiles(id),
  primary_notified_at TIMESTAMPTZ,
  primary_acknowledged_at TIMESTAMPTZ,
  primary_action_taken BOOLEAN DEFAULT FALSE,
  primary_action_notes TEXT,
  
  -- On-call escalation (triggered if no response within 5 min)
  on_call_id UUID REFERENCES profiles(id),
  on_call_notified_at TIMESTAMPTZ,
  on_call_acknowledged_at TIMESTAMPTZ,
  on_call_action_taken BOOLEAN DEFAULT FALSE,
  on_call_action_notes TEXT,
  
  -- ER escalation (triggered if no response within 10 min total)
  er_notified_at TIMESTAMPTZ,
  er_acknowledged_at TIMESTAMPTZ,
  er_action_taken BOOLEAN DEFAULT FALSE,
  er_action_notes TEXT,
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  
  metadata JSONB DEFAULT '{}', -- { escalation_chain, retry_count, etc. }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lab_critical_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_critical_alerts_hospital_scope" ON public.lab_critical_alerts
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "lab_critical_alerts_clinical_access" ON public.lab_critical_alerts
  USING (
    auth.uid() IN (
      SELECT primary_doctor_id FROM public.lab_critical_alerts WHERE id = lab_critical_alerts.id
      UNION
      SELECT on_call_id FROM public.lab_critical_alerts WHERE id = lab_critical_alerts.id AND on_call_id IS NOT NULL
    )
    OR auth.uid() IN (
      SELECT ur.user_id FROM user_roles ur 
      WHERE ur.role IN ('admin', 'doctor', 'nurse', 'er_staff')
    )
  );

CREATE INDEX idx_lab_critical_alerts_hospital 
  ON public.lab_critical_alerts(hospital_id, is_resolved);

CREATE INDEX idx_lab_critical_alerts_unresolved 
  ON public.lab_critical_alerts(hospital_id) 
  WHERE is_resolved = FALSE;

CREATE INDEX idx_lab_critical_alerts_primary_doctor 
  ON public.lab_critical_alerts(primary_doctor_id, is_resolved);

CREATE TRIGGER lab_critical_alerts_moddatetime BEFORE UPDATE
  ON public.lab_critical_alerts FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);

-- Audit logging for critical alerts
CREATE TRIGGER lab_critical_alerts_audit AFTER UPDATE
  ON public.lab_critical_alerts FOR EACH ROW
  EXECUTE PROCEDURE log_activity_trigger('update', 'lab_critical_alerts');

-- ===================================================================
-- Seed Data: Common Lab Critical Ranges
-- ===================================================================

INSERT INTO public.lab_critical_ranges 
  (hospital_id, test_code, test_name, critical_low, critical_high, warning_low, warning_high, unit_of_measure, age_group, gender, notes)
SELECT 
  id,
  '2345-7',
  'Glucose',
  40,
  400,
  70,
  200,
  'mg/dL',
  'adult',
  'both',
  'Hypoglycemia or hyperglycemia crisis threshold'
FROM hospitals
WHERE name LIKE '%CareSync%' OR TRUE
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.lab_critical_ranges 
  (hospital_id, test_code, test_name, critical_low, critical_high, warning_low, warning_high, unit_of_measure, age_group, gender, notes)
SELECT 
  id,
  '2757-9',
  'Potassium (K+)',
  2.5,
  6.5,
  3.5,
  5.5,
  'mEq/L',
  'adult',
  'both',
  'Severe hypokalemia/hyperkalemia risk arrhythmia'
FROM hospitals
WHERE name LIKE '%CareSync%' OR TRUE
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.lab_critical_ranges 
  (hospital_id, test_code, test_name, critical_low, critical_high, warning_low, warning_high, unit_of_measure, age_group, gender, notes)
SELECT 
  id,
  '2951-2',
  'Sodium (Na+)',
  120,
  160,
  130,
  150,
  'mEq/L',
  'adult',
  'both',
  'Severe hyponatremia/hypernatremia seizure risk'
FROM hospitals
WHERE name LIKE '%CareSync%' OR TRUE
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.lab_critical_ranges 
  (hospital_id, test_code, test_name, critical_low, critical_high, warning_low, warning_high, unit_of_measure, age_group, gender, notes)
SELECT 
  id,
  '1975-2',
  'Troponin I',
  NULL,
  0.04,
  NULL,
  0.02,
  'ng/mL',
  'adult',
  'both',
  'Acute MI indicator — critical if >0.04'
FROM hospitals
WHERE name LIKE '%CareSync%' OR TRUE
LIMIT 1
ON CONFLICT DO NOTHING;

-- ===================================================================
-- Grants & Final Setup
-- ===================================================================

-- Enable moddatetime extension if not already enabled
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Ensure audit_logs table exists for trigger logging
-- (This should already exist from earlier migrations)

COMMIT;
