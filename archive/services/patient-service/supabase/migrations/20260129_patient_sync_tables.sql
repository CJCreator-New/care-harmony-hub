-- Migration: Patient Data Synchronization Tables
-- Description: Creates tables for patient data synchronization, conflict resolution, and data validation
-- Created: 2026-01-29

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sync conflicts table
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(255) NOT NULL,
    conflict_type VARCHAR(100) NOT NULL,
    main_data JSONB NOT NULL,
    microservice_data JSONB NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'escalated')),
    resolution JSONB,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data quarantine table for invalid data
CREATE TABLE IF NOT EXISTS data_quarantine (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(255),
    patient_data JSONB NOT NULL,
    validation_errors JSONB NOT NULL,
    validation_warnings JSONB,
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by VARCHAR(255),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync audit log table
CREATE TABLE IF NOT EXISTS sync_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(50) NOT NULL, -- 'full_sync', 'incremental_sync', 'conflict_resolution', etc.
    patient_id VARCHAR(255),
    details JSONB,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
    error_message TEXT,
    records_processed INTEGER DEFAULT 0,
    conflicts_found INTEGER DEFAULT 0,
    duration_ms INTEGER,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by VARCHAR(255) -- 'auto', 'manual', or user ID
);

-- Data validation cache table
CREATE TABLE IF NOT EXISTS validation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(255) NOT NULL,
    validation_result JSONB NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_patient_id ON sync_conflicts(patient_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_detected_at ON sync_conflicts(detected_at);

CREATE INDEX IF NOT EXISTS idx_data_quarantine_status ON data_quarantine(status);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_patient_id ON data_quarantine(patient_id);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_quarantined_at ON data_quarantine(quarantined_at);

CREATE INDEX IF NOT EXISTS idx_sync_audit_log_operation ON sync_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_sync_audit_log_performed_at ON sync_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_sync_audit_log_patient_id ON sync_audit_log(patient_id);

CREATE INDEX IF NOT EXISTS idx_validation_cache_patient_id ON validation_cache(patient_id);
CREATE INDEX IF NOT EXISTS idx_validation_cache_expires_at ON validation_cache(expires_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_sync_conflicts_updated_at BEFORE UPDATE ON sync_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_quarantine_updated_at BEFORE UPDATE ON data_quarantine
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired validation cache
CREATE OR REPLACE FUNCTION cleanup_expired_validation_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM validation_cache WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Function to get sync statistics
CREATE OR REPLACE FUNCTION get_sync_statistics(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() - INTERVAL '30 days'),
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_syncs BIGINT,
    successful_syncs BIGINT,
    failed_syncs BIGINT,
    total_records_processed BIGINT,
    total_conflicts BIGINT,
    avg_duration_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs,
        COALESCE(SUM(records_processed), 0) as total_records_processed,
        COALESCE(SUM(conflicts_found), 0) as total_conflicts,
        ROUND(AVG(duration_ms), 2) as avg_duration_ms
    FROM sync_audit_log
    WHERE performed_at BETWEEN start_date AND end_date
    AND operation IN ('full_sync', 'incremental_sync');
END;
$$ language 'plpgsql';

-- Comments for documentation
COMMENT ON TABLE sync_conflicts IS 'Stores conflicts detected during patient data synchronization';
COMMENT ON TABLE data_quarantine IS 'Stores invalid patient data pending review or correction';
COMMENT ON TABLE sync_audit_log IS 'Audit log for all synchronization operations';
COMMENT ON TABLE validation_cache IS 'Caches data validation results to improve performance';

COMMENT ON COLUMN sync_conflicts.conflict_type IS 'Type of conflict: data_mismatch, deletion_conflict, etc.';
COMMENT ON COLUMN sync_conflicts.resolution IS 'JSON object describing how the conflict was resolved';
COMMENT ON COLUMN data_quarantine.patient_data IS 'Original patient data that failed validation';
COMMENT ON COLUMN data_quarantine.validation_errors IS 'Array of validation errors that caused quarantine';
COMMENT ON COLUMN sync_audit_log.operation IS 'Type of sync operation performed';
COMMENT ON COLUMN sync_audit_log.details IS 'Additional details about the operation in JSON format';