-- Migration: Workflow State Management Tables
-- Description: Creates tables for comprehensive workflow state management with versioning, history, and recovery
-- Date: 2024-01-28
-- Version: 1.0.0

-- Create workflow_states table for state persistence and versioning
CREATE TABLE IF NOT EXISTS workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES clinical_workflows(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'failed')),
    current_step TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum TEXT NOT NULL,

    -- Constraints
    CONSTRAINT workflow_states_version_unique UNIQUE (workflow_id, version),
    CONSTRAINT workflow_states_version_positive CHECK (version > 0)
);

-- Create workflow_state_history table for audit trail
CREATE TABLE IF NOT EXISTS workflow_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES clinical_workflows(id) ON DELETE CASCADE,
    state_id UUID NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
    previous_state_id UUID REFERENCES workflow_states(id) ON DELETE SET NULL,
    transition TEXT NOT NULL,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_states_workflow_id ON workflow_states(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_version ON workflow_states(workflow_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_states_state ON workflow_states(state);
CREATE INDEX IF NOT EXISTS idx_workflow_states_created_at ON workflow_states(created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_state_history_workflow_id ON workflow_state_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_state_history_created_at ON workflow_state_history(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_state_history_transition ON workflow_state_history(transition);

-- Create RLS policies for workflow_states
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see workflow states for workflows they have access to
CREATE POLICY "Users can view workflow states for accessible workflows" ON workflow_states
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clinical_workflows cw
            WHERE cw.id = workflow_states.workflow_id
            AND (
                cw.created_by = auth.uid()
                OR cw.patient_id IN (
                    SELECT p.id FROM patients p
                    WHERE p.hospital_id IN (
                        SELECT ha.hospital_id FROM hospital_assignments ha
                        WHERE ha.user_id = auth.uid()
                    )
                )
            )
        )
    );

-- Policy: Users can insert workflow states for workflows they can modify
CREATE POLICY "Users can create workflow states for modifiable workflows" ON workflow_states
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM clinical_workflows cw
            WHERE cw.id = workflow_states.workflow_id
            AND (
                cw.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid()
                    AND r.name IN ('doctor', 'nurse', 'admin')
                )
            )
        )
    );

-- Policy: Users can update workflow states for workflows they can modify
CREATE POLICY "Users can update workflow states for modifiable workflows" ON workflow_states
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM clinical_workflows cw
            WHERE cw.id = workflow_states.workflow_id
            AND (
                cw.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid()
                    AND r.name IN ('doctor', 'nurse', 'admin')
                )
            )
        )
    );

-- Create RLS policies for workflow_state_history
ALTER TABLE workflow_state_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history for workflows they have access to
CREATE POLICY "Users can view workflow state history for accessible workflows" ON workflow_state_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM clinical_workflows cw
            WHERE cw.id = workflow_state_history.workflow_id
            AND (
                cw.created_by = auth.uid()
                OR cw.patient_id IN (
                    SELECT p.id FROM patients p
                    WHERE p.hospital_id IN (
                        SELECT ha.hospital_id FROM hospital_assignments ha
                        WHERE ha.user_id = auth.uid()
                    )
                )
            )
        )
    );

-- Policy: Users can insert history entries for workflows they can modify
CREATE POLICY "Users can create workflow state history for modifiable workflows" ON workflow_state_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM clinical_workflows cw
            WHERE cw.id = workflow_state_history.workflow_id
            AND (
                cw.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = auth.uid()
                    AND r.name IN ('doctor', 'nurse', 'admin')
                )
            )
        )
    );

-- Create function to get latest workflow state
CREATE OR REPLACE FUNCTION get_latest_workflow_state(workflow_uuid UUID)
RETURNS TABLE (
    id UUID,
    workflow_id UUID,
    version INTEGER,
    state TEXT,
    current_step TEXT,
    steps JSONB,
    metadata JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    checksum TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ws.id, ws.workflow_id, ws.version, ws.state, ws.current_step,
           ws.steps, ws.metadata, ws.created_by, ws.created_at, ws.checksum
    FROM workflow_states ws
    WHERE ws.workflow_id = workflow_uuid
    ORDER BY ws.version DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate state checksum
CREATE OR REPLACE FUNCTION validate_workflow_state_checksum(state_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    state_record RECORD;
    computed_checksum TEXT;
BEGIN
    SELECT * INTO state_record FROM workflow_states WHERE id = state_uuid;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Compute checksum
    SELECT encode(sha256((
        state_record.state ||
        state_record.current_step ||
        state_record.steps::text ||
        state_record.metadata::text
    )::bytea), 'hex') INTO computed_checksum;

    RETURN computed_checksum = state_record.checksum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get workflow state history with pagination
CREATE OR REPLACE FUNCTION get_workflow_state_history(
    workflow_uuid UUID,
    page_limit INTEGER DEFAULT 50,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    workflow_id UUID,
    state_id UUID,
    previous_state_id UUID,
    transition TEXT,
    reason TEXT,
    metadata JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT wsh.id, wsh.workflow_id, wsh.state_id, wsh.previous_state_id,
           wsh.transition, wsh.reason, wsh.metadata, wsh.created_by, wsh.created_at
    FROM workflow_state_history wsh
    WHERE wsh.workflow_id = workflow_uuid
    ORDER BY wsh.created_at DESC
    LIMIT page_limit
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create initial state when workflow is created
CREATE OR REPLACE FUNCTION create_initial_workflow_state()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial state
    INSERT INTO workflow_states (
        workflow_id,
        version,
        state,
        current_step,
        steps,
        metadata,
        created_by,
        checksum
    ) VALUES (
        NEW.id,
        1,
        'pending',
        COALESCE(NEW.current_step, 'assessment'),
        COALESCE(NEW.steps, '[]'::jsonb),
        jsonb_build_object(
            'initial_creation', true,
            'workflow_type', NEW.workflow_type,
            'created_via_trigger', true
        ),
        NEW.created_by,
        encode(sha256(('pending' || COALESCE(NEW.current_step, 'assessment') || COALESCE(NEW.steps, '[]'::jsonb)::text || '{}'::text)::bytea), 'hex')
    );

    -- Insert history entry
    INSERT INTO workflow_state_history (
        workflow_id,
        state_id,
        transition,
        reason,
        metadata,
        created_by
    ) VALUES (
        NEW.id,
        (SELECT id FROM workflow_states WHERE workflow_id = NEW.id AND version = 1),
        'created',
        'Initial workflow state created via trigger',
        jsonb_build_object('auto_created', true),
        NEW.created_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on clinical_workflows table
DROP TRIGGER IF EXISTS trigger_create_initial_workflow_state ON clinical_workflows;
CREATE TRIGGER trigger_create_initial_workflow_state
    AFTER INSERT ON clinical_workflows
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_workflow_state();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON workflow_states TO authenticated;
GRANT SELECT, INSERT ON workflow_state_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_workflow_state(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_workflow_state_checksum(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_state_history(UUID, INTEGER, INTEGER) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE workflow_states IS 'Stores versioned workflow states with integrity checksums for state management and recovery';
COMMENT ON TABLE workflow_state_history IS 'Audit trail for all workflow state transitions and changes';
COMMENT ON COLUMN workflow_states.checksum IS 'SHA-256 checksum of state data for integrity validation';
COMMENT ON COLUMN workflow_states.version IS 'Incremental version number for optimistic concurrency control';