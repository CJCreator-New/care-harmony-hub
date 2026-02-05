-- Pharmacist Module Database Schema
-- 9 tables with RLS policies and indexes

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  prescriber_id UUID NOT NULL REFERENCES auth.users(id),
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  quantity INTEGER,
  route VARCHAR(50),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  refills_remaining INTEGER DEFAULT 0,
  prescription_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiry_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) CHECK (status IN ('received', 'verified', 'filled', 'dispensed', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_prescriber ON prescriptions(prescriber_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_expiry ON prescriptions(expiry_date);

-- Prescription Verifications Table
CREATE TABLE IF NOT EXISTS prescription_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES auth.users(id),
  verification_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  drug_interaction_check JSONB,
  allergy_check JSONB,
  dosage_verification JSONB,
  formulary_compliance BOOLEAN,
  duplicate_therapy_check BOOLEAN,
  is_valid BOOLEAN,
  issues JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prescription_verifications_prescription ON prescription_verifications(prescription_id);
CREATE INDEX idx_prescription_verifications_pharmacist ON prescription_verifications(pharmacist_id);
CREATE INDEX idx_prescription_verifications_is_valid ON prescription_verifications(is_valid);

-- Dispensing Records Table
CREATE TABLE IF NOT EXISTS dispensing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES auth.users(id),
  dispensing_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  medication_name VARCHAR(255),
  quantity INTEGER,
  batch_number VARCHAR(100),
  expiry_date DATE,
  label_generated BOOLEAN DEFAULT FALSE,
  quality_checked BOOLEAN DEFAULT FALSE,
  counseling_provided BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) CHECK (status IN ('pending', 'dispensed', 'verified', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dispensing_records_prescription ON dispensing_records(prescription_id);
CREATE INDEX idx_dispensing_records_patient ON dispensing_records(patient_id);
CREATE INDEX idx_dispensing_records_pharmacist ON dispensing_records(pharmacist_id);
CREATE INDEX idx_dispensing_records_status ON dispensing_records(status);

-- Patient Counseling Table
CREATE TABLE IF NOT EXISTS patient_counseling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES auth.users(id),
  counseling_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  medication_name VARCHAR(255),
  topics TEXT[],
  adherence_support TEXT,
  side_effects TEXT[],
  drug_interactions TEXT[],
  storage_instructions TEXT,
  refill_instructions TEXT,
  follow_up_needed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patient_counseling_prescription ON patient_counseling(prescription_id);
CREATE INDEX idx_patient_counseling_patient ON patient_counseling(patient_id);
CREATE INDEX idx_patient_counseling_pharmacist ON patient_counseling(pharmacist_id);

-- Pharmacy Alerts Table
CREATE TABLE IF NOT EXISTS pharmacy_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) CHECK (alert_type IN ('drug_interaction', 'allergy_warning', 'dosage_issue', 'inventory_low', 'expiry_warning', 'quality_issue')),
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  message TEXT NOT NULL,
  related_prescription_id UUID REFERENCES prescriptions(id),
  related_patient_id UUID REFERENCES patient_registrations(id),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pharmacy_alerts_type ON pharmacy_alerts(alert_type);
CREATE INDEX idx_pharmacy_alerts_severity ON pharmacy_alerts(severity);
CREATE INDEX idx_pharmacy_alerts_acknowledged ON pharmacy_alerts(acknowledged);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name VARCHAR(255) NOT NULL,
  ndc VARCHAR(50),
  strength VARCHAR(100),
  form VARCHAR(50),
  quantity INTEGER,
  reorder_level INTEGER,
  reorder_quantity INTEGER,
  unit_cost DECIMAL(10, 2),
  expiry_date DATE,
  location VARCHAR(100),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_medication ON inventory_items(medication_name);
CREATE INDEX idx_inventory_items_ndc ON inventory_items(ndc);
CREATE INDEX idx_inventory_items_quantity ON inventory_items(quantity);
CREATE INDEX idx_inventory_items_expiry ON inventory_items(expiry_date);

-- Inventory Reorder Requests Table
CREATE TABLE IF NOT EXISTS inventory_reorder_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name VARCHAR(255) NOT NULL,
  ndc VARCHAR(50),
  current_quantity INTEGER,
  reorder_quantity INTEGER,
  estimated_cost DECIMAL(10, 2),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_reorder_requests_status ON inventory_reorder_requests(status);
CREATE INDEX idx_inventory_reorder_requests_requested_by ON inventory_reorder_requests(requested_by);

-- Clinical Interventions Table
CREATE TABLE IF NOT EXISTS clinical_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES auth.users(id),
  intervention_type VARCHAR(50) CHECK (intervention_type IN ('dosage_adjustment', 'drug_substitution', 'interaction_resolution', 'allergy_alert', 'other')),
  description TEXT NOT NULL,
  recommendation TEXT,
  prescriber_notified BOOLEAN DEFAULT FALSE,
  prescriber_response TEXT,
  intervention_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) CHECK (status IN ('pending', 'implemented', 'rejected', 'pending_response')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_clinical_interventions_prescription ON clinical_interventions(prescription_id);
CREATE INDEX idx_clinical_interventions_patient ON clinical_interventions(patient_id);
CREATE INDEX idx_clinical_interventions_pharmacist ON clinical_interventions(pharmacist_id);
CREATE INDEX idx_clinical_interventions_status ON clinical_interventions(status);

-- Medication Therapy Management Table
CREATE TABLE IF NOT EXISTS medication_therapy_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  pharmacist_id UUID NOT NULL REFERENCES auth.users(id),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  medications TEXT[],
  goals TEXT[],
  interventions TEXT[],
  outcomes TEXT[],
  follow_up_schedule TIMESTAMP WITH TIME ZONE[],
  status VARCHAR(20) CHECK (status IN ('active', 'completed', 'discontinued')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_medication_therapy_management_patient ON medication_therapy_management(patient_id);
CREATE INDEX idx_medication_therapy_management_pharmacist ON medication_therapy_management(pharmacist_id);
CREATE INDEX idx_medication_therapy_management_status ON medication_therapy_management(status);

-- RLS Policies

-- Prescriptions RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view prescriptions"
  ON prescriptions FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin', 'doctor', 'nurse'));

CREATE POLICY "Pharmacists can insert prescriptions"
  ON prescriptions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can update prescriptions"
  ON prescriptions FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Prescription Verifications RLS
ALTER TABLE prescription_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view verifications"
  ON prescription_verifications FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can insert verifications"
  ON prescription_verifications FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Dispensing Records RLS
ALTER TABLE dispensing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view dispensing records"
  ON dispensing_records FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can insert dispensing records"
  ON dispensing_records FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Patient Counseling RLS
ALTER TABLE patient_counseling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view counseling records"
  ON patient_counseling FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can insert counseling records"
  ON patient_counseling FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Pharmacy Alerts RLS
ALTER TABLE pharmacy_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view alerts"
  ON pharmacy_alerts FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Inventory Items RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view inventory"
  ON inventory_items FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can update inventory"
  ON inventory_items FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Inventory Reorder Requests RLS
ALTER TABLE inventory_reorder_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view reorder requests"
  ON inventory_reorder_requests FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can insert reorder requests"
  ON inventory_reorder_requests FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Clinical Interventions RLS
ALTER TABLE clinical_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view interventions"
  ON clinical_interventions FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can insert interventions"
  ON clinical_interventions FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Medication Therapy Management RLS
ALTER TABLE medication_therapy_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacists can view MTM"
  ON medication_therapy_management FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

CREATE POLICY "Pharmacists can insert MTM"
  ON medication_therapy_management FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));
