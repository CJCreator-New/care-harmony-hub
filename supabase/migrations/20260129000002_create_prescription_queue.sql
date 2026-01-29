-- Create prescription_queue for durable pharmacy queue
CREATE TABLE IF NOT EXISTS prescription_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('queued','processing','dispensed','cancelled')) DEFAULT 'queued',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prescription_queue_hospital ON prescription_queue(hospital_id);
CREATE INDEX IF NOT EXISTS idx_prescription_queue_prescription ON prescription_queue(prescription_id);

-- Enable RLS
ALTER TABLE prescription_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital staff can view prescription queue" ON prescription_queue
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Hospital staff can insert into prescription queue" ON prescription_queue
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Pharmacist can update prescription queue status" ON prescription_queue
  FOR UPDATE TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'pharmacist'
    )
  );

COMMENT ON TABLE prescription_queue IS 'Durable queue of prescriptions for pharmacy fulfillment';
