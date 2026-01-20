-- Add missing database indexes for performance optimization
-- DB-004: Critical indexes for query performance

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date ON appointments(hospital_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);

-- Consultations indexes
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_hospital_status ON consultations(hospital_id, status);

-- Prescriptions indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created ON prescriptions(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_hospital_created ON prescriptions(hospital_id, created_at DESC);

-- Lab orders indexes
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_ordered ON lab_orders(patient_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_orders_hospital_ordered ON lab_orders(hospital_id, ordered_at DESC);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_created ON activity_logs(entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_hospital_created ON activity_logs(hospital_id, created_at DESC);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_hospital_status ON invoices(hospital_id, status);

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_hospital_active ON patients(hospital_id, is_active);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);

-- Queue entries indexes
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_hospital_status ON queue_entries(hospital_id, status);

-- Comment for tracking
COMMENT ON INDEX idx_appointments_date IS 'DB-004: Performance optimization - Added Jan 2026';
