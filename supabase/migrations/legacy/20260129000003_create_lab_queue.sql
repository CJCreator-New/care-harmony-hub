-- Create lab_queue for laboratory task queue
CREATE TABLE IF NOT EXISTS lab_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  lab_order_id UUID REFERENCES lab_orders(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('queued','collected','processing','completed','cancelled')) DEFAULT 'queued',
  priority TEXT DEFAULT 'normal',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_queue_hospital ON lab_queue(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_queue_order ON lab_queue(lab_order_id);

-- Enable RLS
ALTER TABLE lab_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Hospital staff can view lab queue" ON lab_queue
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Hospital staff can insert into lab queue" ON lab_queue
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Lab techs can update lab queue" ON lab_queue
  FOR UPDATE TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'lab_technician'
    )
  );

COMMENT ON TABLE lab_queue IS 'Durable queue of lab orders for specimen collection and processing';
