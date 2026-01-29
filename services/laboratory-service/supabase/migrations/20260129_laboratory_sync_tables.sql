-- Migration: 20260129_laboratory_sync_tables.sql
-- Description: Create synchronization tables and laboratory data tables for laboratory service
-- Created: 2026-01-29

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create laboratory data tables

-- Lab Orders table
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    loinc_code VARCHAR(10),
    specimen_collected_at TIMESTAMP WITH TIME ZONE,
    specimen_type VARCHAR(100),
    collection_notes TEXT,
    priority VARCHAR(20) DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
    status VARCHAR(20) DEFAULT 'ordered' CHECK (status IN ('ordered', 'collected', 'processing', 'completed', 'cancelled')),
    notes TEXT,
    hospital_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Lab Results table
CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id),
    loinc_code VARCHAR(10),
    result_value TEXT NOT NULL,
    result_numeric DECIMAL(15,5),
    result_unit VARCHAR(50),
    reference_range VARCHAR(100),
    abnormal_flag CHAR(2) CHECK (abnormal_flag IN ('H', 'L', 'HH', 'LL', 'A')),
    critical_flag BOOLEAN DEFAULT FALSE,
    result_status VARCHAR(20) DEFAULT 'preliminary' CHECK (result_status IN ('preliminary', 'final', 'corrected', 'cancelled')),
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    interpretation TEXT,
    hospital_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Critical Value Notifications table
CREATE TABLE IF NOT EXISTS critical_value_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_result_id UUID NOT NULL REFERENCES lab_results(id),
    patient_id UUID NOT NULL,
    loinc_code VARCHAR(10),
    critical_value TEXT NOT NULL,
    notification_level INTEGER DEFAULT 1 CHECK (notification_level BETWEEN 1 AND 3),
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID,
    read_back_verified BOOLEAN DEFAULT FALSE,
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    hospital_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Specimen Tracking table
CREATE TABLE IF NOT EXISTS specimen_tracking (
    specimen_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id),
    collection_time TIMESTAMP WITH TIME ZONE NOT NULL,
    collected_by UUID NOT NULL,
    specimen_type VARCHAR(100) NOT NULL,
    collection_site VARCHAR(100),
    transport_conditions TEXT,
    received_time TIMESTAMP WITH TIME ZONE,
    received_by UUID,
    processing_started TIMESTAMP WITH TIME ZONE,
    quality_assessment JSONB NOT NULL DEFAULT '{
        "adequate_volume": true,
        "proper_labeling": true,
        "integrity_maintained": true,
        "temperature_controlled": true
    }',
    chain_of_custody JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab QC Results table
CREATE TABLE IF NOT EXISTS lab_qc_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loinc_code VARCHAR(10) NOT NULL,
    qc_level VARCHAR(20) DEFAULT 'normal' CHECK (qc_level IN ('normal', 'abnormal_low', 'abnormal_high')),
    expected_value DECIMAL(15,5) NOT NULL,
    actual_value DECIMAL(15,5) NOT NULL,
    variance_percent DECIMAL(7,4),
    within_limits BOOLEAN NOT NULL,
    run_date TIMESTAMP WITH TIME ZONE NOT NULL,
    instrument_id VARCHAR(100),
    lot_number VARCHAR(100),
    technician_id UUID,
    hospital_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lab Instruments table (for equipment tracking)
CREATE TABLE IF NOT EXISTS lab_instruments (
    instrument_id VARCHAR(100) PRIMARY KEY,
    instrument_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    serial_number VARCHAR(255) NOT NULL,
    supported_tests JSONB DEFAULT '[]', -- Array of LOINC codes
    calibration_status VARCHAR(20) DEFAULT 'current' CHECK (calibration_status IN ('current', 'due', 'overdue')),
    last_calibration TIMESTAMP WITH TIME ZONE,
    next_calibration_due TIMESTAMP WITH TIME ZONE,
    maintenance_status VARCHAR(20) DEFAULT 'operational' CHECK (maintenance_status IN ('operational', 'maintenance', 'down')),
    quality_control_status VARCHAR(20) DEFAULT 'passing' CHECK (quality_control_status IN ('passing', 'failing', 'pending')),
    location VARCHAR(255),
    hospital_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sync_conflicts table for laboratory conflicts
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('lab_order', 'lab_result', 'critical_notification', 'specimen_tracking', 'qc_result')),
    service_name VARCHAR(50) DEFAULT 'laboratory',
    conflict_type VARCHAR(50) NOT NULL,
    main_data JSONB NOT NULL,
    microservice_data JSONB NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'escalated')),
    resolution_strategy VARCHAR(50),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create data_quarantine table for invalid laboratory data
CREATE TABLE IF NOT EXISTS data_quarantine (
    id VARCHAR(100) PRIMARY KEY,
    entity_id UUID,
    entity_type VARCHAR(50) CHECK (entity_type IN ('lab_order', 'lab_result', 'critical_notification', 'specimen_tracking', 'qc_result')),
    service_name VARCHAR(50) DEFAULT 'laboratory',
    data JSONB NOT NULL,
    validation_errors JSONB NOT NULL,
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sync_audit_log table for laboratory sync operations
CREATE TABLE IF NOT EXISTS sync_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID,
    entity_type VARCHAR(50),
    service_name VARCHAR(50) DEFAULT 'laboratory',
    action VARCHAR(100) NOT NULL,
    details JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by VARCHAR(100),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for better performance

-- Lab data table indexes
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor_id ON lab_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_hospital_id ON lab_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_created_at ON lab_orders(created_at);

CREATE INDEX IF NOT EXISTS idx_lab_results_lab_order_id ON lab_results(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_loinc_code ON lab_results(loinc_code);
CREATE INDEX IF NOT EXISTS idx_lab_results_critical_flag ON lab_results(critical_flag);
CREATE INDEX IF NOT EXISTS idx_lab_results_result_status ON lab_results(result_status);
CREATE INDEX IF NOT EXISTS idx_lab_results_performed_at ON lab_results(performed_at);
CREATE INDEX IF NOT EXISTS idx_lab_results_hospital_id ON lab_results(hospital_id);

CREATE INDEX IF NOT EXISTS idx_critical_value_notifications_lab_result_id ON critical_value_notifications(lab_result_id);
CREATE INDEX IF NOT EXISTS idx_critical_value_notifications_patient_id ON critical_value_notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_critical_value_notifications_notification_level ON critical_value_notifications(notification_level);
CREATE INDEX IF NOT EXISTS idx_critical_value_notifications_acknowledged_at ON critical_value_notifications(acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_critical_value_notifications_hospital_id ON critical_value_notifications(hospital_id);

CREATE INDEX IF NOT EXISTS idx_specimen_tracking_lab_order_id ON specimen_tracking(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_specimen_tracking_collection_time ON specimen_tracking(collection_time);
CREATE INDEX IF NOT EXISTS idx_specimen_tracking_received_time ON specimen_tracking(received_time);

CREATE INDEX IF NOT EXISTS idx_lab_qc_results_loinc_code ON lab_qc_results(loinc_code);
CREATE INDEX IF NOT EXISTS idx_lab_qc_results_within_limits ON lab_qc_results(within_limits);
CREATE INDEX IF NOT EXISTS idx_lab_qc_results_run_date ON lab_qc_results(run_date);
CREATE INDEX IF NOT EXISTS idx_lab_qc_results_hospital_id ON lab_qc_results(hospital_id);

CREATE INDEX IF NOT EXISTS idx_lab_instruments_hospital_id ON lab_instruments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_instruments_calibration_status ON lab_instruments(calibration_status);
CREATE INDEX IF NOT EXISTS idx_lab_instruments_maintenance_status ON lab_instruments(maintenance_status);

-- Sync table indexes
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity_id ON sync_conflicts(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity_type ON sync_conflicts(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_service_name ON sync_conflicts(service_name);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_detected_at ON sync_conflicts(detected_at);

CREATE INDEX IF NOT EXISTS idx_data_quarantine_entity_id ON data_quarantine(entity_id);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_entity_type ON data_quarantine(entity_type);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_service_name ON data_quarantine(service_name);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_status ON data_quarantine(status);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_quarantined_at ON data_quarantine(quarantined_at);

CREATE INDEX IF NOT EXISTS idx_sync_audit_log_entity_id ON sync_audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_audit_log_entity_type ON sync_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_audit_log_service_name ON sync_audit_log(service_name);
CREATE INDEX IF NOT EXISTS idx_sync_audit_log_action ON sync_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_sync_audit_log_performed_at ON sync_audit_log(performed_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_lab_orders_updated_at
    BEFORE UPDATE ON lab_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at
    BEFORE UPDATE ON lab_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_critical_value_notifications_updated_at
    BEFORE UPDATE ON critical_value_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specimen_tracking_updated_at
    BEFORE UPDATE ON specimen_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_qc_results_updated_at
    BEFORE UPDATE ON lab_qc_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_instruments_updated_at
    BEFORE UPDATE ON lab_instruments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_conflicts_updated_at
    BEFORE UPDATE ON sync_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_quarantine_updated_at
    BEFORE UPDATE ON data_quarantine
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for CLIA compliance monitoring
CREATE OR REPLACE FUNCTION check_clia_compliance()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for critical results that need immediate verification
    IF NEW.critical_flag = true AND NEW.result_status = 'preliminary' THEN
        -- Log CLIA compliance event
        INSERT INTO sync_audit_log (entity_id, entity_type, service_name, action, details, performed_by)
        VALUES (NEW.id, 'lab_result', 'laboratory', 'clia_critical_result', jsonb_build_object('requires_immediate_attention', true), 'system');
    END IF;

    -- Check for QC failures
    IF TG_TABLE_NAME = 'lab_qc_results' AND NEW.within_limits = false THEN
        INSERT INTO sync_audit_log (entity_id, entity_type, service_name, action, details, performed_by)
        VALUES (NEW.id, 'qc_result', 'laboratory', 'clia_qc_failure', jsonb_build_object('requires_investigation', true), 'system');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create CLIA compliance triggers
CREATE TRIGGER check_lab_result_clia_compliance
    AFTER INSERT OR UPDATE ON lab_results
    FOR EACH ROW EXECUTE FUNCTION check_clia_compliance();

CREATE TRIGGER check_qc_result_clia_compliance
    AFTER INSERT OR UPDATE ON lab_qc_results
    FOR EACH ROW EXECUTE FUNCTION check_clia_compliance();

-- Insert initial migration record
INSERT INTO sync_audit_log (action, details, performed_by, service_name)
VALUES ('migration_applied', jsonb_build_object('migration', '20260129_laboratory_sync_tables', 'description', 'Created synchronization and laboratory data tables for laboratory service'), 'system', 'laboratory')
ON CONFLICT DO NOTHING;

-- Add Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_value_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE specimen_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_qc_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (basic hospital-based access control)
-- Note: These would be customized based on actual role requirements

CREATE POLICY "Hospital-based access for lab_orders" ON lab_orders
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = auth.uid()
    ));

CREATE POLICY "Hospital-based access for lab_results" ON lab_results
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = auth.uid()
    ));

CREATE POLICY "Patients can view their own lab results" ON lab_results
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM patients WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Hospital-based access for critical_value_notifications" ON critical_value_notifications
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = auth.uid()
    ));

CREATE POLICY "Hospital-based access for lab_qc_results" ON lab_qc_results
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = auth.uid()
    ));

CREATE POLICY "Hospital-based access for lab_instruments" ON lab_instruments
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = auth.uid()
    ));

-- Sync tables policies (more restrictive)
CREATE POLICY "Service access for sync_conflicts" ON sync_conflicts
    FOR ALL USING (service_name = 'laboratory' AND
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'lab_admin', 'system')));

CREATE POLICY "Service access for data_quarantine" ON data_quarantine
    FOR ALL USING (service_name = 'laboratory' AND
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'lab_admin', 'system')));

CREATE POLICY "Service access for sync_audit_log" ON sync_audit_log
    FOR ALL USING (service_name = 'laboratory' AND
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'lab_admin', 'system')));

-- Add comments for documentation
COMMENT ON TABLE lab_orders IS 'Laboratory test orders with CLIA compliance tracking';
COMMENT ON TABLE lab_results IS 'Laboratory test results with critical value flagging';
COMMENT ON TABLE critical_value_notifications IS 'Critical value notifications with escalation tracking';
COMMENT ON TABLE specimen_tracking IS 'Specimen collection, transport, and processing tracking';
COMMENT ON TABLE lab_qc_results IS 'Quality control results for CLIA compliance';
COMMENT ON TABLE lab_instruments IS 'Laboratory equipment and instrument tracking';
COMMENT ON TABLE sync_conflicts IS 'Stores conflicts detected during laboratory data synchronization';
COMMENT ON TABLE data_quarantine IS 'Stores invalid laboratory data that requires manual review';
COMMENT ON TABLE sync_audit_log IS 'Audit log for all laboratory synchronization operations and changes';

COMMENT ON COLUMN lab_results.critical_flag IS 'CLIA requirement: Critical results must be flagged and communicated immediately';
COMMENT ON COLUMN lab_results.result_status IS 'CLIA requirement: Preliminary results need final verification';
COMMENT ON COLUMN critical_value_notifications.read_back_verified IS 'CLIA requirement: Critical value communication must be verified';
COMMENT ON COLUMN lab_qc_results.within_limits IS 'CLIA requirement: QC must be within acceptable limits';
COMMENT ON COLUMN specimen_tracking.quality_assessment IS 'CLIA requirement: Specimen quality must be assessed and documented';
COMMENT ON COLUMN specimen_tracking.chain_of_custody IS 'CLIA requirement: Chain of custody must be maintained for all specimens';