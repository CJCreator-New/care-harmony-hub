-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    provider_id UUID NOT NULL,
    hospital_id UUID NOT NULL,
    appointment_type VARCHAR(100) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0 AND duration <= 480), -- max 8 hours in minutes
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show')),
    notes TEXT,
    reason_for_visit TEXT NOT NULL,
    location VARCHAR(255),
    virtual_meeting_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL
);

-- Create availability_slots table
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    hospital_id UUID NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_available BOOLEAN DEFAULT true,
    recurrence_rule TEXT, -- iCal RRULE format for recurring slots
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create scheduling_rules table
CREATE TABLE IF NOT EXISTS scheduling_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID, -- NULL for global rules
    hospital_id UUID NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('buffer_time', 'max_appointments_per_day', 'working_hours', 'blocked_periods')),
    rule_value JSONB NOT NULL, -- JSON with rule-specific configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_provider ON appointments(patient_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_scheduled ON appointments(provider_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_availability_provider_id ON availability_slots(provider_id);
CREATE INDEX IF NOT EXISTS idx_availability_hospital_id ON availability_slots(hospital_id);
CREATE INDEX IF NOT EXISTS idx_availability_time_range ON availability_slots(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_availability_provider_time ON availability_slots(provider_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_scheduling_rules_provider_id ON scheduling_rules(provider_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_rules_hospital_id ON scheduling_rules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_rules_type ON scheduling_rules(rule_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_slots_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduling_rules_updated_at
    BEFORE UPDATE ON scheduling_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies for appointments
CREATE POLICY appointments_hospital_access ON appointments
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = current_user_id()
    ));

-- RLS policies for availability slots
CREATE POLICY availability_hospital_access ON availability_slots
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = current_user_id()
    ));

-- RLS policies for scheduling rules
CREATE POLICY scheduling_rules_hospital_access ON scheduling_rules
    FOR ALL USING (hospital_id IN (
        SELECT hospital_id FROM user_hospital_access WHERE user_id = current_user_id()
    ));

-- Grant permissions (adjust based on your user roles)
GRANT SELECT, INSERT, UPDATE ON appointments TO appointment_service_role;
GRANT SELECT, INSERT, UPDATE ON availability_slots TO appointment_service_role;
GRANT SELECT, INSERT, UPDATE ON scheduling_rules TO appointment_service_role;