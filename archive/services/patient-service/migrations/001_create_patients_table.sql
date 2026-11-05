-- Migration: Create patients table for patient service
-- Created: 2024-01-01
-- Description: Initial schema for patient management microservice

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL,
    medical_record_number VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth TIMESTAMP WITH TIME ZONE NOT NULL,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB,
    emergency_contact JSONB,
    insurance_info JSONB,
    medical_history JSONB DEFAULT '[]'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    current_medications JSONB DEFAULT '[]'::jsonb,
    vital_signs JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    encrypted_data TEXT, -- For HIPAA-compliant storage of sensitive data

    -- Constraints
    CONSTRAINT patients_medical_record_unique UNIQUE (hospital_id, medical_record_number),
    CONSTRAINT patients_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT patients_phone_format CHECK (phone IS NULL OR length(phone) >= 10),
    CONSTRAINT patients_date_of_birth_valid CHECK (date_of_birth <= CURRENT_TIMESTAMP)
);

-- Indexes for performance
CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX idx_patients_medical_record ON patients(medical_record_number);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_created_at ON patients(created_at);
CREATE INDEX idx_patients_updated_at ON patients(updated_at);
CREATE INDEX idx_patients_date_of_birth ON patients(date_of_birth);

-- Partial indexes for active patients
CREATE INDEX idx_patients_active_hospital ON patients(hospital_id) WHERE status = 'active';
CREATE INDEX idx_patients_active_name ON patients(last_name, first_name) WHERE status = 'active';

-- JSONB indexes for complex queries
CREATE INDEX idx_patients_address_city ON patients USING gin ((address->'city'));
CREATE INDEX idx_patients_address_state ON patients USING gin ((address->'state'));
CREATE INDEX idx_patients_emergency_contact ON patients USING gin (emergency_contact);
CREATE INDEX idx_patients_insurance_provider ON patients USING gin ((insurance_info->'provider'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access patients from their hospital
CREATE POLICY patients_hospital_access ON patients
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access
        WHERE user_id = current_setting('app.current_user_id', true)::uuid
    ));

-- Policy: Allow service-to-service communication (internal)
CREATE POLICY patients_service_access ON patients
    FOR ALL USING (current_setting('app.service_role', false)::boolean = true);

-- Comments for documentation
COMMENT ON TABLE patients IS 'Patient records for healthcare management system';
COMMENT ON COLUMN patients.id IS 'Unique identifier for the patient';
COMMENT ON COLUMN patients.hospital_id IS 'ID of the hospital this patient belongs to';
COMMENT ON COLUMN patients.medical_record_number IS 'Unique medical record number within the hospital';
COMMENT ON COLUMN patients.encrypted_data IS 'HIPAA-compliant encrypted storage for sensitive patient data';
COMMENT ON COLUMN patients.status IS 'Patient status: active, inactive, deceased, or deleted (soft delete)';