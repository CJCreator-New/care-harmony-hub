-- Migration: 20260129_clinical_sync_tables.sql
-- Description: Create synchronization tables for clinical service
-- Created: 2026-01-29

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sync_conflicts table for clinical conflicts
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID NOT NULL,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('consultation', 'clinical_workflow', 'medical_record', 'clinical_decision_support')),
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

-- Create data_quarantine table for invalid clinical data
CREATE TABLE IF NOT EXISTS data_quarantine (
    id VARCHAR(100) PRIMARY KEY,
    record_id UUID NOT NULL,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('consultation', 'clinical_workflow', 'medical_record', 'clinical_decision_support')),
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

-- Create sync_audit_log table for clinical sync operations
CREATE TABLE IF NOT EXISTS sync_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id UUID,
    record_type VARCHAR(50) CHECK (record_type IN ('consultation', 'clinical_workflow', 'medical_record', 'clinical_decision_support')),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    performed_by VARCHAR(100),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_record_id ON sync_conflicts(record_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_record_type ON sync_conflicts(record_type);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_detected_at ON sync_conflicts(detected_at);

CREATE INDEX IF NOT EXISTS idx_data_quarantine_record_id ON data_quarantine(record_id);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_record_type ON data_quarantine(record_type);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_status ON data_quarantine(status);
CREATE INDEX IF NOT EXISTS idx_data_quarantine_quarantined_at ON data_quarantine(quarantined_at);

CREATE INDEX IF NOT EXISTS idx_sync_audit_log_record_id ON sync_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_sync_audit_log_record_type ON sync_audit_log(record_type);
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
CREATE TRIGGER update_sync_conflicts_updated_at
    BEFORE UPDATE ON sync_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_quarantine_updated_at
    BEFORE UPDATE ON data_quarantine
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for clinical data conflict detection
CREATE OR REPLACE FUNCTION detect_clinical_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- This function would be called when clinical data changes
    -- For now, just log the change
    INSERT INTO sync_audit_log (record_id, record_type, action, details, performed_by)
    VALUES (NEW.id, TG_TABLE_NAME, 'record_updated', jsonb_build_object('changes', 'detected'), 'system');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert initial migration record
INSERT INTO sync_audit_log (action, details, performed_by)
VALUES ('migration_applied', jsonb_build_object('migration', '20260129_clinical_sync_tables', 'description', 'Created synchronization tables for clinical service'), 'system')
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE sync_conflicts IS 'Stores conflicts detected during clinical data synchronization between main DB and microservice';
COMMENT ON TABLE data_quarantine IS 'Stores invalid clinical data that requires manual review before insertion';
COMMENT ON TABLE sync_audit_log IS 'Audit log for all clinical synchronization operations and changes';

COMMENT ON COLUMN sync_conflicts.record_type IS 'Type of clinical record: consultation, clinical_workflow, medical_record, clinical_decision_support';
COMMENT ON COLUMN sync_conflicts.conflict_type IS 'Type of conflict: data_mismatch, version_conflict, etc.';
COMMENT ON COLUMN sync_conflicts.resolution_strategy IS 'How the conflict was resolved: main_wins, microservice_wins, merge, manual';
COMMENT ON COLUMN data_quarantine.record_type IS 'Type of quarantined clinical record';
COMMENT ON COLUMN data_quarantine.validation_errors IS 'JSON array of validation errors that caused the quarantine';
COMMENT ON COLUMN sync_audit_log.record_type IS 'Type of clinical record being audited';
COMMENT ON COLUMN sync_audit_log.details IS 'Additional details about the action in JSON format';