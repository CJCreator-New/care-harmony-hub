-- Ensure every current frontend workflow event has at least one active rule
-- per hospital. Existing active rules are preserved; this only backfills
-- missing event coverage.

WITH event_seed AS (
  SELECT *
  FROM (
    VALUES
      ('patient.checked_in', 'Patient checked in handoff', 'Routes newly checked-in patients to the nursing workflow.', 'nurse', 'New patient checked in and waiting for triage.', 90, 2),
      ('vitals.recorded', 'Vitals recorded handoff', 'Notifies the doctor that vitals are available for review.', 'doctor', 'Patient vitals have been recorded and are ready for review.', 85, 5),
      ('patient.ready_for_doctor', 'Patient ready for doctor handoff', 'Alerts the assigned doctor that the patient is ready.', 'doctor', 'Patient is ready for consultation.', 95, 2),
      ('consultation.started', 'Consultation started audit', 'Broadcasts that a consultation is now in progress.', 'receptionist', 'Consultation has started.', 70, 10),
      ('consultation.completed', 'Consultation completed follow-up', 'Signals post-consultation operational follow-up.', 'receptionist', 'Consultation has been completed and downstream steps can continue.', 80, 10),
      ('lab.order_created', 'Lab order handoff', 'Routes new lab orders to laboratory staff.', 'lab_technician', 'A new lab order requires collection or processing.', 90, 2),
      ('lab.sample_collected', 'Lab sample collected update', 'Keeps clinicians informed that a specimen has been collected.', 'doctor', 'Lab sample has been collected and is awaiting processing.', 75, 10),
      ('lab.results_ready', 'Lab results ready handoff', 'Notifies the ordering clinician that results are ready.', 'doctor', 'Lab results are ready for review.', 95, 2),
      ('lab.critical_alert', 'Critical lab alert escalation', 'Escalates critical lab findings to clinicians.', 'doctor', 'Critical lab result requires immediate review.', 100, 1),
      ('prescription.created', 'Prescription verification handoff', 'Routes new prescriptions to pharmacy.', 'pharmacist', 'A new prescription is ready for verification.', 90, 2),
      ('prescription.verified', 'Prescription verified notification', 'Updates the prescribing clinician once pharmacy verification is complete.', 'doctor', 'Prescription has been verified by pharmacy.', 80, 5),
      ('medication.dispensed', 'Medication dispensed update', 'Confirms medication dispensing for the clinical team.', 'nurse', 'Medication has been dispensed to the patient.', 70, 10),
      ('invoice.created', 'Invoice created notification', 'Alerts front-desk staff that billing is ready.', 'receptionist', 'A new invoice has been created for patient billing.', 80, 5),
      ('payment.received', 'Payment received notification', 'Confirms payment receipt to administrative staff.', 'admin', 'Patient payment has been received.', 75, 10),
      ('staff.invited', 'Staff invitation audit', 'Tracks new staff onboarding invitations.', 'admin', 'A new staff invitation has been issued.', 60, 30),
      ('role.assigned', 'Role assignment audit', 'Tracks staff role changes.', 'admin', 'A staff role assignment has been updated.', 60, 30),
      ('escalation.triggered', 'Workflow escalation alert', 'Escalates workflow bottlenecks to administrators.', 'admin', 'A workflow escalation requires review.', 100, 1)
  ) AS seed(trigger_event, name, description, target_role, message, priority, cooldown_minutes)
),
missing_coverage AS (
  SELECT
    h.id AS hospital_id,
    seed.trigger_event,
    seed.name,
    seed.description,
    seed.target_role,
    seed.message,
    seed.priority,
    seed.cooldown_minutes
  FROM public.hospitals h
  CROSS JOIN event_seed seed
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.workflow_rules wr
    WHERE wr.hospital_id = h.id
      AND wr.trigger_event = seed.trigger_event
      AND wr.active = TRUE
  )
)
INSERT INTO public.workflow_rules (
  hospital_id,
  name,
  description,
  trigger_event,
  trigger_conditions,
  actions,
  active,
  priority,
  cooldown_minutes
)
SELECT
  missing_coverage.hospital_id,
  missing_coverage.name,
  missing_coverage.description,
  missing_coverage.trigger_event,
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'type', 'send_notification',
      'target_role', missing_coverage.target_role,
      'message', missing_coverage.message
    )
  ),
  TRUE,
  missing_coverage.priority,
  missing_coverage.cooldown_minutes
FROM missing_coverage;
