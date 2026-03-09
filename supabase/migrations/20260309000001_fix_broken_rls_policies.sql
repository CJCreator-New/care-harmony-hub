-- Migration: 20260309000001_fix_broken_rls_policies.sql
-- Purpose: Fix all RLS policies that use `profiles.id = auth.uid()` instead of
--          `profiles.user_id = auth.uid()`. The profiles table is keyed on user_id,
--          NOT id. Every affected policy evaluates to 0 rows for all authenticated
--          users, making those tables de-facto inaccessible.
--          Also fixes monitoring tables that reference a non-existent `staff` table,
--          tables with RLS-on but zero policies (implicitly deny-all), and the
--          prediction_models policy that references a non-existent column.
--          Uses public.has_role() and public.user_belongs_to_hospital() helpers.
-- Idempotent: safe to run more than once.

-- ============================================================
-- Part 1: Pharmacy — clinical_interventions, medication_therapy_reviews,
--         dur_findings, dur_reports
-- ============================================================

DROP POLICY IF EXISTS "Clinical interventions hospital access" ON public.clinical_interventions;
CREATE POLICY "Clinical interventions hospital access"
  ON public.clinical_interventions FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Medication reviews hospital access" ON public.medication_therapy_reviews;
CREATE POLICY "Medication reviews hospital access"
  ON public.medication_therapy_reviews FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "DUR findings hospital access" ON public.dur_findings;
CREATE POLICY "DUR findings hospital access"
  ON public.dur_findings FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "DUR reports hospital access" ON public.dur_reports;
CREATE POLICY "DUR reports hospital access"
  ON public.dur_reports FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- ============================================================
-- Part 2: Laboratory — lab_samples, sample_tracking, lab_equipment,
--         quality_control, quality_control_rules, critical_results,
--         equipment_maintenance
-- ============================================================

DROP POLICY IF EXISTS "Lab samples hospital access" ON public.lab_samples;
CREATE POLICY "Lab samples hospital access"
  ON public.lab_samples FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Sample tracking hospital access" ON public.sample_tracking;
CREATE POLICY "Sample tracking hospital access"
  ON public.sample_tracking FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Lab equipment hospital access" ON public.lab_equipment;
CREATE POLICY "Lab equipment hospital access"
  ON public.lab_equipment FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Quality control hospital access" ON public.quality_control;
CREATE POLICY "Quality control hospital access"
  ON public.quality_control FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "QC rules hospital access" ON public.quality_control_rules;
CREATE POLICY "QC rules hospital access"
  ON public.quality_control_rules FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Critical results hospital access" ON public.critical_results;
CREATE POLICY "Critical results hospital access"
  ON public.critical_results FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Equipment maintenance hospital access" ON public.equipment_maintenance;
CREATE POLICY "Equipment maintenance hospital access"
  ON public.equipment_maintenance FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- ============================================================
-- Part 3: Portal — patient_consents (core_schema.sql)
-- ============================================================

DROP POLICY IF EXISTS "Users can view consents for their hospital" ON public.patient_consents;
CREATE POLICY "Users can view consents for their hospital"
  ON public.patient_consents FOR SELECT
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    OR patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can insert consents" ON public.patient_consents;
CREATE POLICY "Staff can insert consents"
  ON public.patient_consents FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Staff can update consents" ON public.patient_consents;
CREATE POLICY "Staff can update consents"
  ON public.patient_consents FOR UPDATE
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- ============================================================
-- Part 4: misc.sql tables — performance_metrics, error_tracking,
--         cpt_codes, audit_logs, abac_policies
-- ============================================================

DROP POLICY IF EXISTS "Hospital scoped performance metrics" ON public.performance_metrics;
CREATE POLICY "Hospital scoped performance metrics"
  ON public.performance_metrics FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Hospital scoped error tracking" ON public.error_tracking;
CREATE POLICY "Hospital scoped error tracking"
  ON public.error_tracking FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Hospital scoped CPT codes" ON public.cpt_codes;
CREATE POLICY "Hospital scoped CPT codes"
  ON public.cpt_codes FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- audit_logs: read restricted to admins of same hospital; insert open to all hospital staff
DROP POLICY IF EXISTS "Hospital-scoped audit log access" ON public.audit_logs;
DROP POLICY IF EXISTS "Hospital-scoped audit log creation" ON public.audit_logs;

CREATE POLICY "Hospital-scoped audit log access"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Hospital-scoped audit log creation"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- abac_policies: same broken pattern
DROP POLICY IF EXISTS "Hospital-scoped ABAC policies" ON public.abac_policies;
CREATE POLICY "Hospital-scoped ABAC policies"
  ON public.abac_policies FOR ALL
  TO authenticated
  USING (
    hospital_id IS NULL
    OR public.user_belongs_to_hospital(auth.uid(), hospital_id)
  );

-- ============================================================
-- Part 5: Monitoring — system_metrics, alert_rules,
--         staff_productivity_metrics, patient_flow_metrics
--         (referenced non-existent `staff` table)
-- ============================================================

DROP POLICY IF EXISTS "Admins can view system metrics" ON public.system_metrics;
CREATE POLICY "Admins can view system metrics"
  ON public.system_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage alert rules" ON public.alert_rules;
CREATE POLICY "Admins can manage alert rules"
  ON public.alert_rules FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Staff can view own productivity metrics" ON public.staff_productivity_metrics;
CREATE POLICY "Staff can view own productivity metrics"
  ON public.staff_productivity_metrics FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      public.user_belongs_to_hospital(auth.uid(), hospital_id)
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'doctor')
      )
    )
  );

DROP POLICY IF EXISTS "Staff can view patient flow metrics" ON public.patient_flow_metrics;
CREATE POLICY "Staff can view patient flow metrics"
  ON public.patient_flow_metrics FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- ============================================================
-- Part 6: prediction_models — policy referenced non-existent
--         hospital_id column; fix to admin-only with no hospital scope
-- ============================================================

DROP POLICY IF EXISTS "Hospital staff can view predictions" ON public.prediction_models;
DROP POLICY IF EXISTS "Admins can manage prediction models" ON public.prediction_models;
-- prediction_models is a global table (no hospital_id) — restrict to admin read only
CREATE POLICY "Admins can manage prediction models"
  ON public.prediction_models FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Part 7: symptom_library, symptom_analyses, health_metrics,
--         health_goals, health_alerts — RLS enabled but ZERO
--         policies (default-deny blocks all access)
-- ============================================================

-- symptom_library: global reference data, read-only for all authenticated
ALTER TABLE public.symptom_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read symptom library" ON public.symptom_library;
CREATE POLICY "Anyone can read symptom library"
  ON public.symptom_library FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage symptom library" ON public.symptom_library;
CREATE POLICY "Admins can manage symptom library"
  ON public.symptom_library FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- symptom_analyses: hospital-scoped
ALTER TABLE public.symptom_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hospital staff can view symptom analyses" ON public.symptom_analyses;
CREATE POLICY "Hospital staff can view symptom analyses"
  ON public.symptom_analyses FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Hospital staff can insert symptom analyses" ON public.symptom_analyses;
CREATE POLICY "Hospital staff can insert symptom analyses"
  ON public.symptom_analyses FOR INSERT
  TO authenticated
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- health_metrics: patient-owned or hospital-staff readable
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hospital staff can manage health metrics" ON public.health_metrics;
CREATE POLICY "Hospital staff can manage health metrics"
  ON public.health_metrics FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- health_goals: hospital-scoped
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hospital staff can manage health goals" ON public.health_goals;
CREATE POLICY "Hospital staff can manage health goals"
  ON public.health_goals FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- health_alerts: hospital-scoped
ALTER TABLE public.health_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hospital staff can manage health alerts" ON public.health_alerts;
CREATE POLICY "Hospital staff can manage health alerts"
  ON public.health_alerts FOR ALL
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));
