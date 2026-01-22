-- ============================================================================
-- PHASE 6.2: WORKFLOW RULES OVERHAUL
-- Target: End-to-End Workflow Integration
-- Created: 2026-01-24
-- ============================================================================

-- CLEAR EXISTING DEMO RULES TO AVOID DUVALS
DELETE FROM workflow_rules WHERE hospital_id IN (SELECT id FROM hospitals);

-- 1. RECEPTIONIST -> NURSE (Check-in)
INSERT INTO workflow_rules (name, description, trigger_event, actions, hospital_id, active)
SELECT 
  'Patient Prep Task',
  'Automatically create a triage task for nurses when a patient checks in',
  'patient_check_in',
  '[
    {
      "type": "create_task",
      "target_role": "nurse",
      "message": "Complete pre-consultation prep for patient",
      "metadata": {"action": "vitals_required"}
    },
    {
      "type": "send_notification",
      "target_role": "nurse",
      "message": "New patient in queue ready for triage"
    }
  ]'::jsonb,
  id,
  true
FROM hospitals;

-- 2. NURSE -> DOCTOR (Triage Complete)
INSERT INTO workflow_rules (name, description, trigger_event, actions, hospital_id, active)
SELECT 
  'Physician Ready Alert',
  'Notify doctor that the patient is fully prepped and vitals are recorded',
  'triage_completed',
  '[
    {
      "type": "send_notification",
      "target_role": "doctor",
      "message": "Patient vitals and triage are complete. Ready for consultation.",
      "metadata": {"priority": "high"}
    },
    {
      "type": "update_status",
      "metadata": {"status": "ready_for_doctor"}
    }
  ]'::jsonb,
  id,
  true
FROM hospitals;

-- 3. DOCTOR -> PHARMACIST (Prescription Created)
INSERT INTO workflow_rules (name, description, trigger_event, actions, hospital_id, active)
SELECT 
  'Pharmacy Fulfillment Task',
  'Create a dispensing task for pharmacists when a new prescription is signed',
  'prescription_created',
  '[
    {
      "type": "create_task",
      "target_role": "pharmacist",
      "message": "New prescription needs fulfillment",
      "metadata": {"action": "dispensing_required"}
    },
    {
      "type": "trigger_function",
      "metadata": {"function_name": "clinical-pharmacy"}
    }
  ]'::jsonb,
  id,
  true
FROM hospitals;

-- 4. DOCTOR -> LAB (Lab Order Created)
INSERT INTO workflow_rules (name, description, trigger_event, actions, hospital_id, active)
SELECT 
  'Lab Collection Task',
  'Notify lab team to collect samples for new diagnostic orders',
  'lab_order_created',
  '[
    {
      "type": "create_task",
      "target_role": "lab_tech",
      "message": "Laboratory collection required",
      "metadata": {"action": "collection_required"}
    },
    {
      "type": "send_notification",
      "target_role": "lab_tech",
      "message": "New lab order submitted by physician"
    }
  ]'::jsonb,
  id,
  true
FROM hospitals;

-- 5. DOCTOR -> RECEPTIONIST (Billing/Checkout)
INSERT INTO workflow_rules (name, description, trigger_event, actions, hospital_id, active)
SELECT 
  'Patient Checkout Task',
  'Alert reception to prepare for patient discharge and billing',
  'consultation_completed',
  '[
    {
      "type": "create_task",
      "target_role": "receptionist",
      "message": "Patient ready for discharge and billing",
      "metadata": {"action": "checkout_required"}
    },
    {
      "type": "send_notification",
      "target_role": "receptionist",
      "message": "Consultation complete. Process billing."
    }
  ]'::jsonb,
  id,
  true
FROM hospitals;

-- 6. LAB -> DOCTOR (Critical Value Alert)
INSERT INTO workflow_rules (name, description, trigger_event, actions, hospital_id, active)
SELECT 
  'Critical Value Escalation',
  'Escalate critical lab values directly to the attending physician',
  'critical_lab_result',
  '[
    {
      "type": "escalate",
      "message": "CRITICAL LAB VALUE DETECTED",
      "metadata": {"severity": "critical"}
    },
    {
      "type": "send_notification",
      "target_role": "doctor",
      "message": "URGENT: Critical lab result recorded for your patient"
    }
  ]'::jsonb,
  id,
  true
FROM hospitals;

-- ============================================================================
-- COMPLETE
-- ============================================================================
