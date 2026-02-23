-- Fix complete_patient_prep function to use correct table names and column names
-- patient_vitals → vital_signs (pain_scale → pain_level, no hospital_id)
-- patient_prep_status → patient_prep_checklists
-- patient_queue.status 'ready_for_doctor' → 'in_service'

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

  BEGIN
    -- Insert vitals into the correct table (vital_signs, not patient_vitals)
    INSERT INTO vital_signs (
      patient_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      weight,
      height,
      pain_level,
      bmi,
      recorded_at,
      recorded_by
    ) VALUES (
      p_patient_id,
      NULLIF((p_vitals_data->>'temperature'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'blood_pressure_systolic'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'blood_pressure_diastolic'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'heart_rate'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'respiratory_rate'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'oxygen_saturation'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'weight'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'height'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'pain_scale'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'bmi'), '')::NUMERIC,
      NOW(),
      v_user_id
    );

    -- Upsert prep checklist (patient_prep_checklists, not patient_prep_status)
    INSERT INTO patient_prep_checklists (
      patient_id,
      queue_entry_id,
      hospital_id,
      vitals_completed,
      chief_complaint_recorded,
      allergies_verified,
      medications_reviewed,
      ready_for_doctor,
      notes
    ) VALUES (
      p_patient_id,
      p_queue_entry_id,
      v_hospital_id,
      true,
      true,
      (p_allergies IS NOT NULL AND p_allergies <> ''),
      (p_current_medications IS NOT NULL AND p_current_medications <> ''),
      true,
      CONCAT_WS(E'\n',
        p_chief_complaint,
        CASE WHEN p_allergies IS NOT NULL AND p_allergies <> '' THEN 'Allergies: ' || p_allergies END,
        CASE WHEN p_current_medications IS NOT NULL AND p_current_medications <> '' THEN 'Medications: ' || p_current_medications END,
        p_nurse_notes
      )
    )
    ON CONFLICT (patient_id, queue_entry_id)
    DO UPDATE SET
      vitals_completed        = true,
      chief_complaint_recorded = true,
      allergies_verified      = (p_allergies IS NOT NULL AND p_allergies <> ''),
      medications_reviewed    = (p_current_medications IS NOT NULL AND p_current_medications <> ''),
      ready_for_doctor        = true,
      notes                   = CONCAT_WS(E'\n',
        p_chief_complaint,
        CASE WHEN p_allergies IS NOT NULL AND p_allergies <> '' THEN 'Allergies: ' || p_allergies END,
        CASE WHEN p_current_medications IS NOT NULL AND p_current_medications <> '' THEN 'Medications: ' || p_current_medications END,
        p_nurse_notes
      ),
      updated_at              = NOW();

    -- Update queue status to in_service (valid status in the schema)
    UPDATE patient_queue
    SET
      status     = 'in_service',
      updated_at = NOW()
    WHERE id = p_queue_entry_id;

    -- Notify assigned doctor/staff if present
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
      pq.assigned_to,
      'patient_ready',
      'Patient Ready for Consultation',
      CONCAT(p.first_name, ' ', p.last_name, ' (', p.mrn, ') is ready. Chief complaint: ', p_chief_complaint),
      jsonb_build_object(
        'patient_id',     p_patient_id,
        'queue_entry_id', p_queue_entry_id,
        'patient_name',   CONCAT(p.first_name, ' ', p.last_name),
        'mrn',            p.mrn,
        'chief_complaint', p_chief_complaint
      ),
      NOW()
    FROM patient_queue pq
    JOIN patients p ON p.id = p_patient_id
    WHERE pq.id = p_queue_entry_id
      AND pq.assigned_to IS NOT NULL;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
