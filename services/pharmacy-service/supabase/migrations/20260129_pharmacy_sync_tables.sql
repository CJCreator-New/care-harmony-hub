-- Pharmacy Service Data Synchronization Tables
-- Migration: 20260129_pharmacy_sync_tables.sql

-- Sync conflicts table for pharmacy service
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id VARCHAR(255) NOT NULL,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('prescription', 'medication', 'inventory_item', 'pharmacy_order')),
    main_data JSONB NOT NULL,
    microservice_data JSONB NOT NULL,
    conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('data_mismatch', 'deletion_conflict', 'creation_conflict')),
    resolution_strategy VARCHAR(50) CHECK (resolution_strategy IN ('main_wins', 'microservice_wins', 'merge', 'manual')),
    resolved_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'auto_resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(255),
    hospital_id VARCHAR(255) NOT NULL,
    service_name VARCHAR(50) DEFAULT 'pharmacy',

    -- Indexes for efficient querying
    INDEX idx_sync_conflicts_status (status),
    INDEX idx_sync_conflicts_record_type (record_type),
    INDEX idx_sync_conflicts_hospital (hospital_id),
    INDEX idx_sync_conflicts_created_at (created_at DESC),

    -- Constraints
    CHECK (status != 'resolved' OR (resolved_at IS NOT NULL AND resolved_by IS NOT NULL)),
    CHECK (resolution_strategy IS NULL OR status IN ('resolved', 'auto_resolved'))
);

-- Data quarantine table for invalid pharmacy data
CREATE TABLE IF NOT EXISTS data_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('prescription', 'medication', 'inventory_item', 'pharmacy_order')),
    record_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    validation_errors JSONB NOT NULL,
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255),
    action VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (action IN ('pending', 'approved', 'rejected', 'corrected')),
    corrected_data JSONB,
    hospital_id VARCHAR(255) NOT NULL,
    service_name VARCHAR(50) DEFAULT 'pharmacy',

    -- Indexes
    INDEX idx_data_quarantine_action (action),
    INDEX idx_data_quarantine_record_type (record_type),
    INDEX idx_data_quarantine_hospital (hospital_id),
    INDEX idx_data_quarantine_quarantined_at (quarantined_at DESC),

    -- Constraints
    CHECK (action != 'corrected' OR corrected_data IS NOT NULL),
    CHECK (action IN ('approved', 'rejected', 'corrected') OR (reviewed_at IS NULL AND reviewed_by IS NULL))
);

-- Sync audit log for tracking all synchronization operations
CREATE TABLE IF NOT EXISTS sync_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id UUID REFERENCES sync_conflicts(id),
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('prescription', 'medication', 'inventory_item', 'pharmacy_order')),
    record_id VARCHAR(255) NOT NULL,
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'sync', 'conflict_resolution')),
    resolution_strategy VARCHAR(50) CHECK (resolution_strategy IN ('main_wins', 'microservice_wins', 'merge', 'manual')),
    original_main_data JSONB,
    original_microservice_data JSONB,
    resolved_data JSONB,
    sync_metadata JSONB, -- Additional sync context (timestamps, versions, etc.)
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_by VARCHAR(255),
    hospital_id VARCHAR(255) NOT NULL,
    service_name VARCHAR(50) DEFAULT 'pharmacy',
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,

    -- Indexes
    INDEX idx_sync_audit_log_conflict (conflict_id),
    INDEX idx_sync_audit_log_record_type (record_type),
    INDEX idx_sync_audit_log_operation (operation_type),
    INDEX idx_sync_audit_log_hospital (hospital_id),
    INDEX idx_sync_audit_log_resolved_at (resolved_at DESC),

    -- Constraints
    CHECK (success = true OR error_message IS NOT NULL)
);

-- Sync metadata table for tracking sync state
CREATE TABLE IF NOT EXISTS sync_metadata (
    service_name VARCHAR(50) PRIMARY KEY,
    last_sync TIMESTAMP WITH TIME ZONE,
    last_full_sync TIMESTAMP WITH TIME ZONE,
    last_incremental_sync TIMESTAMP WITH TIME ZONE,
    sync_version VARCHAR(50) DEFAULT '1.0',
    config JSONB, -- Service-specific sync configuration
    health_status JSONB, -- Last health check results
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hospital_id VARCHAR(255) NOT NULL,

    -- Indexes
    INDEX idx_sync_metadata_hospital (hospital_id),
    INDEX idx_sync_metadata_updated_at (updated_at DESC)
);

-- Pharmacy-specific tables (if not already existing)
CREATE TABLE IF NOT EXISTS prescriptions (
    id VARCHAR(255) PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    medication_id VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration INTEGER,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    instructions TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'suspended')),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    hospital_id VARCHAR(255) NOT NULL,

    -- Indexes
    INDEX idx_prescriptions_patient (patient_id),
    INDEX idx_prescriptions_provider (provider_id),
    INDEX idx_prescriptions_medication (medication_id),
    INDEX idx_prescriptions_status (status),
    INDEX idx_prescriptions_hospital (hospital_id),
    INDEX idx_prescriptions_created_at (created_at DESC),

    -- Foreign key constraints (would reference main DB tables)
    -- FOREIGN KEY (patient_id) REFERENCES patients(id),
    -- FOREIGN KEY (provider_id) REFERENCES providers(id),
    -- FOREIGN KEY (medication_id) REFERENCES medications(id)
);

CREATE TABLE IF NOT EXISTS medications (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    brand_name VARCHAR(255),
    strength VARCHAR(100) NOT NULL,
    form VARCHAR(50) NOT NULL CHECK (form IN ('tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler')),
    category VARCHAR(100) NOT NULL,
    requires_prescription BOOLEAN DEFAULT true,
    controlled_substance BOOLEAN DEFAULT false,
    dea_schedule VARCHAR(5) CHECK (dea_schedule IN ('I', 'II', 'III', 'IV', 'V')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hospital_id VARCHAR(255) NOT NULL,

    -- Indexes
    INDEX idx_medications_name (name),
    INDEX idx_medications_category (category),
    INDEX idx_medications_controlled (controlled_substance),
    INDEX idx_medications_hospital (hospital_id),

    -- Constraints
    CHECK (controlled_substance = false OR dea_schedule IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(255) PRIMARY KEY,
    medication_id VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    expiration_date DATE NOT NULL,
    quantity_on_hand DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    selling_price DECIMAL(10,2) NOT NULL CHECK (selling_price >= 0),
    location VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'discontinued')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hospital_id VARCHAR(255) NOT NULL,

    -- Indexes
    INDEX idx_inventory_medication (medication_id),
    INDEX idx_inventory_batch (batch_number),
    INDEX idx_inventory_expiration (expiration_date),
    INDEX idx_inventory_status (status),
    INDEX idx_inventory_hospital (hospital_id),

    -- Foreign key constraints
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id VARCHAR(255) PRIMARY KEY,
    prescription_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    medication_id VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled')),
    filled_date TIMESTAMP WITH TIME ZONE,
    filled_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hospital_id VARCHAR(255) NOT NULL,

    -- Indexes
    INDEX idx_orders_prescription (prescription_id),
    INDEX idx_orders_patient (patient_id),
    INDEX idx_orders_medication (medication_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_hospital (hospital_id),
    INDEX idx_orders_created_at (created_at DESC),

    -- Foreign key constraints
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE RESTRICT
);

-- Insert initial sync metadata for pharmacy service
INSERT INTO sync_metadata (service_name, sync_version, config, hospital_id)
VALUES (
    'pharmacy',
    '1.0',
    '{
        "sync_interval_minutes": 15,
        "batch_size": 100,
        "conflict_resolution": {
            "auto_resolve_safe_conflicts": true,
            "default_strategy": "main_wins"
        },
        "data_validation": {
            "strict_mode": true,
            "quarantine_invalid_data": true
        }
    }'::jsonb,
    'default_hospital'
)
ON CONFLICT (service_name) DO UPDATE SET
    config = EXCLUDED.config,
    updated_at = NOW();

-- Create RLS policies for multi-tenant security
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (hospital_id based)
CREATE POLICY "Users can only access their hospital's sync conflicts" ON sync_conflicts
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

CREATE POLICY "Users can only access their hospital's quarantined data" ON data_quarantine
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

CREATE POLICY "Users can only access their hospital's sync audit logs" ON sync_audit_log
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

CREATE POLICY "Users can only access their hospital's sync metadata" ON sync_metadata
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

CREATE POLICY "Users can only access their hospital's prescriptions" ON prescriptions
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

CREATE POLICY "Users can only access their hospital's medications" ON medications
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

CREATE POLICY "Users can only access their hospital's inventory" ON inventory_items
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

CREATE POLICY "Users can only access their hospital's pharmacy orders" ON pharmacy_orders
    FOR ALL USING (hospital_id = current_setting('app.current_hospital_id', true));

-- Comments for documentation
COMMENT ON TABLE sync_conflicts IS 'Tracks data conflicts between main application and pharmacy microservice';
COMMENT ON TABLE data_quarantine IS 'Holds invalid pharmacy data pending review and correction';
COMMENT ON TABLE sync_audit_log IS 'Audit trail for all pharmacy data synchronization operations';
COMMENT ON TABLE sync_metadata IS 'Metadata and configuration for pharmacy service synchronization';
COMMENT ON TABLE prescriptions IS 'Prescription records in pharmacy microservice';
COMMENT ON TABLE medications IS 'Medication master data in pharmacy microservice';
COMMENT ON TABLE inventory_items IS 'Inventory tracking for pharmacy medications';
COMMENT ON TABLE pharmacy_orders IS 'Pharmacy order fulfillment records';