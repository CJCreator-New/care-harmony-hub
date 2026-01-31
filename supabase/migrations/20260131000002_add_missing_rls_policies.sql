-- Add RLS policies for missing roles (pharmacist, lab_technician)
-- As specified in ROLE_ENHANCEMENT_PLAN.md

-- Patients table policies
CREATE POLICY "pharmacist_view_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = patients.hospital_id
    )
  );

CREATE POLICY "lab_technician_view_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'lab_technician'
      AND user_roles.hospital_id = patients.hospital_id
    )
  );

-- Appointments table policies
CREATE POLICY "pharmacist_view_appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = appointments.hospital_id
    )
  );

-- Consultations table policies for read access
CREATE POLICY "pharmacist_view_consultations" ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = consultations.hospital_id
    )
  );

CREATE POLICY "lab_technician_view_consultations" ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'lab_technician'
      AND user_roles.hospital_id = consultations.hospital_id
    )
  );

-- Patient portal access
CREATE POLICY "patient_view_own_data" ON patients
  FOR SELECT USING (
    patients.user_id = auth.uid()
  );

CREATE POLICY "patient_view_own_appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "patient_view_own_prescriptions" ON prescriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "patient_view_own_lab_orders" ON lab_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = lab_orders.patient_id
      AND patients.user_id = auth.uid()
    )
  );