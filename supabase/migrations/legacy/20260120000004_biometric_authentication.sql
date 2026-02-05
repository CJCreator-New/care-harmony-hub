-- Create biometric credentials table for WebAuthn support
CREATE TABLE IF NOT EXISTS biometric_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    transports TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT biometric_credentials_user_hospital_key UNIQUE (user_id, hospital_id)
);

-- Enable RLS
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own biometric credentials"
    ON biometric_credentials FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometric credentials"
    ON biometric_credentials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometric credentials"
    ON biometric_credentials FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own biometric credentials"
    ON biometric_credentials FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_biometric_credentials_user_id ON biometric_credentials(user_id);
CREATE INDEX idx_biometric_credentials_hospital_id ON biometric_credentials(hospital_id);
CREATE INDEX idx_biometric_credentials_credential_id ON biometric_credentials(credential_id);

-- Function to log biometric authentication events
CREATE OR REPLACE FUNCTION log_biometric_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_credential_id TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_details JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO security_events (
        user_id,
        hospital_id,
        event_type,
        severity,
        description,
        metadata
    )
    SELECT
        p_user_id,
        p.hospital_id,
        CASE
            WHEN p_event_type = 'biometric_register' THEN 'biometric_registration'
            WHEN p_event_type = 'biometric_auth' THEN 'biometric_authentication'
            WHEN p_event_type = 'biometric_fail' THEN 'biometric_failure'
            ELSE p_event_type
        END,
        CASE
            WHEN p_success THEN 'info'::security_severity
            ELSE 'warning'::security_severity
        END,
        CASE
            WHEN p_event_type = 'biometric_register' AND p_success THEN 'Biometric credential registered successfully'
            WHEN p_event_type = 'biometric_register' AND NOT p_success THEN 'Biometric credential registration failed'
            WHEN p_event_type = 'biometric_auth' AND p_success THEN 'Biometric authentication successful'
            WHEN p_event_type = 'biometric_auth' AND NOT p_success THEN 'Biometric authentication failed'
            ELSE 'Biometric event: ' || p_event_type
        END,
        jsonb_build_object(
            'credential_id', p_credential_id,
            'success', p_success,
            'details', p_details
        )
    FROM profiles p
    WHERE p.user_id = p_user_id;
END;
$$;