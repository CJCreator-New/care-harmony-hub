-- Optimized doctor stats function (replaces 7 queries with 1)
CREATE OR REPLACE FUNCTION get_doctor_stats(
  p_doctor_id UUID,
  p_hospital_id UUID,
  p_date DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'todaysPatients', (
      SELECT COUNT(*) FROM appointments 
      WHERE hospital_id = p_hospital_id 
      AND doctor_id = p_doctor_id 
      AND scheduled_date = p_date
    ),
    'completedConsultations', (
      SELECT COUNT(*) FROM consultations 
      WHERE hospital_id = p_hospital_id 
      AND doctor_id = p_doctor_id 
      AND status = 'completed'
      AND completed_at::date = p_date
    ),
    'pendingLabs', (
      SELECT COUNT(*) FROM lab_orders 
      WHERE hospital_id = p_hospital_id 
      AND ordered_by = p_doctor_id 
      AND status IN ('pending', 'in_progress', 'collected')
    ),
    'avgConsultationDuration', (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60), 0)::INT
      FROM consultations 
      WHERE hospital_id = p_hospital_id 
      AND doctor_id = p_doctor_id 
      AND status = 'completed'
      AND completed_at::date = p_date
      AND started_at IS NOT NULL
    ),
    'pendingLabReviews', (
      SELECT COUNT(*) FROM lab_orders 
      WHERE hospital_id = p_hospital_id 
      AND ordered_by = p_doctor_id 
      AND status = 'completed'
    ),
    'pendingPrescriptions', (
      SELECT COUNT(*) FROM prescriptions 
      WHERE hospital_id = p_hospital_id 
      AND prescribed_by = p_doctor_id 
      AND dispensed_at IS NULL
    ),
    'pendingFollowUps', (
      SELECT COUNT(*) FROM consultations 
      WHERE hospital_id = p_hospital_id 
      AND doctor_id = p_doctor_id 
      AND status = 'completed'
      AND follow_up_date IS NOT NULL
      AND follow_up_notes IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
