-- Migration: 20260309000004_hospital_id_indexes.sql
-- Purpose: Add missing hospital_id indexes on high-frequency tables where the
--          column exists but no index was created. Without these indexes, every
--          RLS policy evaluation and every filtered query does a full table scan,
--          causing O(n) growth in query time as data volume increases.
--          Priority: high-frequency tables (messages, doctor_availability,
--          time_slots, medication_administrations) first.
-- Idempotent: all use CREATE INDEX IF NOT EXISTS.

-- High frequency / patient-safety
CREATE INDEX IF NOT EXISTS idx_messages_hospital
  ON public.messages(hospital_id);

CREATE INDEX IF NOT EXISTS idx_doctor_availability_hospital
  ON public.doctor_availability(hospital_id);

CREATE INDEX IF NOT EXISTS idx_time_slots_hospital
  ON public.time_slots(hospital_id);

CREATE INDEX IF NOT EXISTS idx_medication_administrations_hospital
  ON public.medication_administrations(hospital_id);

CREATE INDEX IF NOT EXISTS idx_prescription_refill_requests_hospital
  ON public.prescription_refill_requests(hospital_id);

-- Medium frequency
CREATE INDEX IF NOT EXISTS idx_suppliers_hospital
  ON public.suppliers(hospital_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_hospital
  ON public.purchase_orders(hospital_id);

CREATE INDEX IF NOT EXISTS idx_system_config_hospital
  ON public.system_config(hospital_id);

CREATE INDEX IF NOT EXISTS idx_documents_hospital
  ON public.documents(hospital_id);

CREATE INDEX IF NOT EXISTS idx_departments_hospital
  ON public.departments(hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospital_resources_hospital
  ON public.hospital_resources(hospital_id);

CREATE INDEX IF NOT EXISTS idx_shift_schedules_hospital
  ON public.shift_schedules(hospital_id);

CREATE INDEX IF NOT EXISTS idx_shift_handovers_hospital
  ON public.shift_handovers(hospital_id);

CREATE INDEX IF NOT EXISTS idx_patient_prep_checklists_hospital
  ON public.patient_prep_checklists(hospital_id);

CREATE INDEX IF NOT EXISTS idx_reorder_rules_hospital
  ON public.reorder_rules(hospital_id);

CREATE INDEX IF NOT EXISTS idx_task_assignments_hospital
  ON public.task_assignments(hospital_id);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_hospital
  ON public.workflow_tasks(hospital_id);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_hospital
  ON public.workflow_rules(hospital_id);

CREATE INDEX IF NOT EXISTS idx_workflow_events_hospital
  ON public.workflow_events(hospital_id);

-- Analytics tables
CREATE INDEX IF NOT EXISTS idx_care_gaps_hospital
  ON public.care_gaps(hospital_id);

CREATE INDEX IF NOT EXISTS idx_provider_scorecards_hospital
  ON public.provider_scorecards(hospital_id);

CREATE INDEX IF NOT EXISTS idx_population_cohorts_hospital
  ON public.population_cohorts(hospital_id);

CREATE INDEX IF NOT EXISTS idx_clinical_outcomes_hospital
  ON public.clinical_outcomes(hospital_id);

CREATE INDEX IF NOT EXISTS idx_risk_scores_hospital
  ON public.risk_scores(hospital_id);

CREATE INDEX IF NOT EXISTS idx_predictive_alerts_hospital
  ON public.predictive_alerts(hospital_id);

CREATE INDEX IF NOT EXISTS idx_ai_clinical_insights_hospital
  ON public.ai_clinical_insights(hospital_id);

CREATE INDEX IF NOT EXISTS idx_workflow_automation_rules_hospital
  ON public.workflow_automation_rules(hospital_id);

CREATE INDEX IF NOT EXISTS idx_automated_task_executions_hospital
  ON public.automated_task_executions(hospital_id);

CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_hospital
  ON public.ai_performance_metrics(hospital_id);

CREATE INDEX IF NOT EXISTS idx_staff_productivity_metrics_hospital
  ON public.staff_productivity_metrics(hospital_id);

CREATE INDEX IF NOT EXISTS idx_patient_flow_metrics_hospital
  ON public.patient_flow_metrics(hospital_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_messages_hospital_created
  ON public.messages(hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_medication_administrations_hospital_patient
  ON public.medication_administrations(hospital_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_doctor_availability_hospital_doctor
  ON public.doctor_availability(hospital_id, doctor_id);
