-- Migration: 20260309000003_pharmacy_lab_portal_rls.sql
-- Purpose: Enable RLS and add hospital-scoped policies for pharmacy, laboratory,
--          telemedicine, and patient portal tables that currently have no RLS.
--          These tables contain PHI (prescriptions, lab results, patient portal data)
--          and are fully readable/writable by any authenticated session.
-- Idempotent: safe to run more than once.

-- ============================================================
-- PHARMACY tables
-- ============================================================

-- e_prescriptions
ALTER TABLE public.e_prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read e-prescriptions" ON public.e_prescriptions;
CREATE POLICY "Hospital staff can read e-prescriptions"
  ON public.e_prescriptions FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Pharmacists and doctors can manage e-prescriptions" ON public.e_prescriptions;
CREATE POLICY "Pharmacists and doctors can manage e-prescriptions"
  ON public.e_prescriptions FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'pharmacist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_e_prescriptions_hospital ON public.e_prescriptions(hospital_id);

-- formulary_drugs (hospital-specific drug formulary)
ALTER TABLE public.formulary_drugs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read formulary" ON public.formulary_drugs;
CREATE POLICY "Hospital staff can read formulary"
  ON public.formulary_drugs FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Pharmacists can manage formulary" ON public.formulary_drugs;
CREATE POLICY "Pharmacists can manage formulary"
  ON public.formulary_drugs FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'pharmacist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_formulary_drugs_hospital ON public.formulary_drugs(hospital_id);

-- prior_authorizations
ALTER TABLE public.prior_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read prior authorizations" ON public.prior_authorizations;
CREATE POLICY "Hospital staff can read prior authorizations"
  ON public.prior_authorizations FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Pharmacists and doctors can manage prior auths" ON public.prior_authorizations;
CREATE POLICY "Pharmacists and doctors can manage prior auths"
  ON public.prior_authorizations FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'pharmacist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_prior_authorizations_hospital ON public.prior_authorizations(hospital_id);

-- medication_counseling
ALTER TABLE public.medication_counseling ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read medication counseling" ON public.medication_counseling;
CREATE POLICY "Hospital staff can read medication counseling"
  ON public.medication_counseling FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Pharmacists can manage medication counseling" ON public.medication_counseling;
CREATE POLICY "Pharmacists can manage medication counseling"
  ON public.medication_counseling FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'pharmacist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_medication_counseling_hospital ON public.medication_counseling(hospital_id);

-- ============================================================
-- LABORATORY tables (unprotected)
-- ============================================================

-- lab_results (PHI — critical)
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read lab results" ON public.lab_results;
CREATE POLICY "Hospital staff can read lab results"
  ON public.lab_results FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Lab technicians can manage lab results" ON public.lab_results;
CREATE POLICY "Lab technicians can manage lab results"
  ON public.lab_results FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'lab_technician')
      OR public.has_role(auth.uid(), 'doctor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_lab_results_hospital ON public.lab_results(hospital_id);

-- critical_value_notifications (patient-safety — critical)
ALTER TABLE public.critical_value_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read critical notifications" ON public.critical_value_notifications;
CREATE POLICY "Hospital staff can read critical notifications"
  ON public.critical_value_notifications FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Lab and doctors can manage critical notifications" ON public.critical_value_notifications;
CREATE POLICY "Lab and doctors can manage critical notifications"
  ON public.critical_value_notifications FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'lab_technician')
      OR public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'nurse')
    )
  );

CREATE INDEX IF NOT EXISTS idx_critical_value_notifications_hospital
  ON public.critical_value_notifications(hospital_id);

-- lab_trends
ALTER TABLE public.lab_trends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read lab trends" ON public.lab_trends;
CREATE POLICY "Hospital staff can read lab trends"
  ON public.lab_trends FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Lab technicians can manage lab trends" ON public.lab_trends;
CREATE POLICY "Lab technicians can manage lab trends"
  ON public.lab_trends FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'lab_technician')
    )
  );

CREATE INDEX IF NOT EXISTS idx_lab_trends_hospital ON public.lab_trends(hospital_id);

-- lab_qc_results
ALTER TABLE public.lab_qc_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital lab staff can manage QC results" ON public.lab_qc_results;
CREATE POLICY "Hospital lab staff can manage QC results"
  ON public.lab_qc_results FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'lab_technician')
    )
  );

CREATE INDEX IF NOT EXISTS idx_lab_qc_results_hospital ON public.lab_qc_results(hospital_id);

-- ============================================================
-- PATIENT PORTAL tables (PHI — high priority)
-- ============================================================

-- secure_messages (patient↔provider portal messaging)
ALTER TABLE public.secure_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read secure messages" ON public.secure_messages;
CREATE POLICY "Hospital staff can read secure messages"
  ON public.secure_messages FOR SELECT
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    OR sender_id = auth.uid()
    OR recipient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can send secure messages" ON public.secure_messages;
CREATE POLICY "Authenticated users can send secure messages"
  ON public.secure_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND sender_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_secure_messages_hospital ON public.secure_messages(hospital_id);

-- consent_forms (template library, admin-managed)
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read consent forms" ON public.consent_forms;
CREATE POLICY "Hospital staff can read consent forms"
  ON public.consent_forms FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Admins can manage consent forms" ON public.consent_forms;
CREATE POLICY "Admins can manage consent forms"
  ON public.consent_forms FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_consent_forms_hospital ON public.consent_forms(hospital_id);

-- digital_checkin_sessions
ALTER TABLE public.digital_checkin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read checkin sessions" ON public.digital_checkin_sessions;
CREATE POLICY "Hospital staff can read checkin sessions"
  ON public.digital_checkin_sessions FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Receptionists can manage checkin sessions" ON public.digital_checkin_sessions;
CREATE POLICY "Receptionists can manage checkin sessions"
  ON public.digital_checkin_sessions FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'receptionist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_digital_checkin_sessions_hospital
  ON public.digital_checkin_sessions(hospital_id);

-- pre_visit_questionnaires
ALTER TABLE public.pre_visit_questionnaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can manage questionnaires" ON public.pre_visit_questionnaires;
CREATE POLICY "Hospital staff can manage questionnaires"
  ON public.pre_visit_questionnaires FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE INDEX IF NOT EXISTS idx_pre_visit_questionnaires_hospital
  ON public.pre_visit_questionnaires(hospital_id);

-- questionnaire_responses (PHI)
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read questionnaire responses" ON public.questionnaire_responses;
CREATE POLICY "Hospital staff can read questionnaire responses"
  ON public.questionnaire_responses FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Patients can submit questionnaire responses" ON public.questionnaire_responses;
CREATE POLICY "Patients can submit questionnaire responses"
  ON public.questionnaire_responses FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_hospital
  ON public.questionnaire_responses(hospital_id);

-- after_visit_summaries
ALTER TABLE public.after_visit_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can manage after visit summaries" ON public.after_visit_summaries;
CREATE POLICY "Hospital staff can manage after visit summaries"
  ON public.after_visit_summaries FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE INDEX IF NOT EXISTS idx_after_visit_summaries_hospital
  ON public.after_visit_summaries(hospital_id);

-- avs_templates (admin-managed AVS templates)
ALTER TABLE public.avs_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read AVS templates" ON public.avs_templates;
CREATE POLICY "Hospital staff can read AVS templates"
  ON public.avs_templates FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Admins can manage AVS templates" ON public.avs_templates;
CREATE POLICY "Admins can manage AVS templates"
  ON public.avs_templates FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_avs_templates_hospital ON public.avs_templates(hospital_id);

-- symptom_checker_sessions
ALTER TABLE public.symptom_checker_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read symptom checker sessions" ON public.symptom_checker_sessions;
CREATE POLICY "Hospital staff can read symptom checker sessions"
  ON public.symptom_checker_sessions FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Patients can create symptom checker sessions" ON public.symptom_checker_sessions;
CREATE POLICY "Patients can create symptom checker sessions"
  ON public.symptom_checker_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE INDEX IF NOT EXISTS idx_symptom_checker_sessions_hospital
  ON public.symptom_checker_sessions(hospital_id);

-- ============================================================
-- TELEMEDICINE original tables (the no-hospital_id versions)
-- These tables are superseded by misc.sql versions; disable
-- public access to the unscoped originals.
-- ============================================================

-- telemedicine_prescriptions: no hospital_id, scope by session participant
ALTER TABLE public.telemedicine_prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all telemedicine_prescriptions access" ON public.telemedicine_prescriptions;
CREATE POLICY "Deny all telemedicine_prescriptions access"
  ON public.telemedicine_prescriptions FOR ALL
  TO authenticated
  USING (false);

-- virtual_waiting_room: no hospital_id, disable
ALTER TABLE public.virtual_waiting_room ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all virtual_waiting_room access" ON public.virtual_waiting_room;
CREATE POLICY "Deny all virtual_waiting_room access"
  ON public.virtual_waiting_room FOR ALL
  TO authenticated
  USING (false);

-- monitoring_alert_thresholds: no hospital_id, disable
ALTER TABLE public.monitoring_alert_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny all monitoring_alert_thresholds access" ON public.monitoring_alert_thresholds;
CREATE POLICY "Deny all monitoring_alert_thresholds access"
  ON public.monitoring_alert_thresholds FOR ALL
  TO authenticated
  USING (false);
