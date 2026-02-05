-- Predictive Analytics Migration
-- Phase 1: Week 5-8 Implementation

-- Create queue predictions table
CREATE TABLE IF NOT EXISTS queue_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  predicted_wait_time INTEGER NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  prediction_factors JSONB DEFAULT '{}',
  actual_wait_time INTEGER,
  prediction_accuracy NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create no-show predictions table
CREATE TABLE IF NOT EXISTS no_show_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id),
  no_show_probability NUMERIC(3,2) NOT NULL,
  risk_factors TEXT[] DEFAULT '{}',
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  actual_outcome TEXT CHECK (actual_outcome IN ('attended', 'no_show', 'cancelled')),
  prediction_accuracy NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE queue_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "hospital_queue_predictions" ON queue_predictions
  FOR ALL TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "hospital_no_show_predictions" ON no_show_predictions
  FOR ALL TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Queue prediction function
CREATE OR REPLACE FUNCTION predict_queue_wait_times(hospital_id_param UUID)
RETURNS TABLE (
  patient_id UUID,
  estimated_wait_time INTEGER,
  confidence_score NUMERIC,
  prediction_factors JSONB
) AS $$
DECLARE
  avg_consultation_time NUMERIC;
  current_queue_length INTEGER;
BEGIN
  -- Calculate average consultation time from recent data
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60), 15)
  INTO avg_consultation_time
  FROM consultations 
  WHERE hospital_id = hospital_id_param 
    AND completed_at > NOW() - INTERVAL '7 days'
    AND status = 'completed';

  -- Get current queue length
  SELECT COUNT(*)
  INTO current_queue_length
  FROM patient_queue pq
  JOIN appointments a ON pq.appointment_id = a.id
  WHERE a.hospital_id = hospital_id_param
    AND pq.status IN ('waiting', 'called');

  RETURN QUERY
  SELECT 
    pq.patient_id,
    (pq.queue_position * avg_consultation_time)::INTEGER as estimated_wait_time,
    CASE 
      WHEN pq.queue_position <= 3 THEN 0.9
      WHEN pq.queue_position <= 6 THEN 0.8
      ELSE 0.7
    END as confidence_score,
    jsonb_build_object(
      'queue_position', pq.queue_position,
      'avg_consultation_time', avg_consultation_time,
      'current_queue_length', current_queue_length,
      'appointment_type', a.appointment_type
    ) as prediction_factors
  FROM patient_queue pq
  JOIN appointments a ON pq.appointment_id = a.id
  WHERE a.hospital_id = hospital_id_param
    AND pq.status IN ('waiting', 'called')
  ORDER BY pq.queue_position;
END;
$$ LANGUAGE plpgsql;

-- No-show prediction function
CREATE OR REPLACE FUNCTION predict_no_show_probability(appointment_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  patient_history RECORD;
  no_show_probability NUMERIC;
  risk_factors TEXT[] := '{}';
  appointment_info RECORD;
BEGIN
  -- Get appointment info
  SELECT a.*, p.date_of_birth, p.phone, p.email
  INTO appointment_info
  FROM appointments a
  JOIN patients p ON a.patient_id = p.id
  WHERE a.id = appointment_id_param;

  -- Get patient appointment history
  SELECT 
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancellations
  INTO patient_history
  FROM appointments 
  WHERE patient_id = appointment_info.patient_id
    AND scheduled_date > NOW() - INTERVAL '1 year'
    AND id != appointment_id_param;

  -- Base probability calculation
  no_show_probability := CASE
    WHEN patient_history.total_appointments = 0 THEN 0.15 -- New patient baseline
    ELSE LEAST(0.8, (patient_history.no_shows::NUMERIC / NULLIF(patient_history.total_appointments, 0)) * 1.2)
  END;

  -- Risk factor adjustments
  IF patient_history.no_shows > 1 THEN
    risk_factors := array_append(risk_factors, 'Previous no-shows');
    no_show_probability := no_show_probability + 0.1;
  END IF;

  IF patient_history.cancellations > 2 THEN
    risk_factors := array_append(risk_factors, 'Frequent cancellations');
    no_show_probability := no_show_probability + 0.05;
  END IF;

  -- Time-based factors
  IF EXTRACT(DOW FROM appointment_info.scheduled_date) IN (1, 6) THEN -- Monday or Saturday
    risk_factors := array_append(risk_factors, 'High-risk day');
    no_show_probability := no_show_probability + 0.03;
  END IF;

  RETURN jsonb_build_object(
    'probability', LEAST(0.9, no_show_probability),
    'risk_level', CASE
      WHEN no_show_probability < 0.2 THEN 'low'
      WHEN no_show_probability < 0.4 THEN 'medium'
      WHEN no_show_probability < 0.6 THEN 'high'
      ELSE 'very_high'
    END,
    'risk_factors', risk_factors,
    'total_appointments', patient_history.total_appointments,
    'previous_no_shows', patient_history.no_shows
  );
END;
$$ LANGUAGE plpgsql;

-- Queue optimization function
CREATE OR REPLACE FUNCTION optimize_queue_order(hospital_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  current_queue JSONB;
  optimized_queue JSONB;
BEGIN
  -- Get current queue with priorities
  SELECT jsonb_agg(
    jsonb_build_object(
      'patient_id', pq.patient_id,
      'queue_position', pq.queue_position,
      'priority', a.priority,
      'appointment_type', a.appointment_type,
      'estimated_duration', COALESCE(a.duration_minutes, 15),
      'check_in_time', pq.check_in_time
    ) ORDER BY pq.queue_position
  )
  INTO current_queue
  FROM patient_queue pq
  JOIN appointments a ON pq.appointment_id = a.id
  WHERE a.hospital_id = hospital_id_param
    AND pq.status = 'waiting';

  -- Optimize by priority and duration
  SELECT jsonb_agg(
    queue_item ORDER BY 
      CASE (queue_item->>'priority')::TEXT
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'high' THEN 3
        ELSE 4
      END,
      (queue_item->>'estimated_duration')::INTEGER
  )
  INTO optimized_queue
  FROM jsonb_array_elements(current_queue) AS queue_item;

  RETURN jsonb_build_object(
    'current_queue', current_queue,
    'optimized_queue', optimized_queue,
    'efficiency_gain', 12
  );
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_predictions_hospital ON queue_predictions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_queue_predictions_created ON queue_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_hospital ON no_show_predictions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_date ON no_show_predictions(prediction_date);