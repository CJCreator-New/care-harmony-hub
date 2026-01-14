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