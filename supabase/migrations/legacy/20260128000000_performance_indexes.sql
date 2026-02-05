-- Performance Optimization Indexes
-- Created: 2026-01-28
-- Purpose: Optimize database queries for hospital-scale operations

-- Enable timing for migration verification
SET statement_timeout = '5min';

-- ============================================================================
-- PATIENT TABLE INDEXES
-- ============================================================================

-- Composite index for common patient queries with hospital filtering
CREATE INDEX IF NOT EXISTS idx_patients_hospital_active 
ON patients(hospital_id, is_active, created_at);

-- Index for MRN lookups (frequent in patient searches)
CREATE INDEX IF NOT EXISTS idx_patients_mrn 
ON patients(mrn) 
WHERE mrn IS NOT NULL;

-- Partial index for recently created patients (dashboard stats)
CREATE INDEX IF NOT EXISTS idx_patients_recent 
ON patients(hospital_id, created_at DESC) 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================================================
-- APPOINTMENT TABLE INDEXES
-- ============================================================================

-- Composite index for appointment scheduling queries
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date 
ON appointments(hospital_id, scheduled_date, status);

-- Index for doctor's daily schedule
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date 
ON appointments(doctor_id, scheduled_date, scheduled_time);

-- Partial index for pending appointments
CREATE INDEX IF NOT EXISTS idx_appointments_pending 
ON appointments(hospital_id, scheduled_date) 
WHERE status = 'scheduled';

-- Partial index for today's appointments (frequently queried)
CREATE INDEX IF NOT EXISTS idx_appointments_today 
ON appointments(hospital_id, status) 
WHERE scheduled_date = CURRENT_DATE;

-- ============================================================================
-- INVOICE & BILLING INDEXES
-- ============================================================================

-- Composite index for revenue calculations
CREATE INDEX IF NOT EXISTS idx_invoices_hospital_status 
ON invoices(hospital_id, status, created_at);

-- Partial index for pending invoices (outstanding payments)
CREATE INDEX IF NOT EXISTS idx_invoices_pending 
ON invoices(hospital_id, total) 
WHERE status = 'pending';

-- Index for monthly revenue reports
CREATE INDEX IF NOT EXISTS idx_invoices_monthly 
ON invoices(hospital_id, created_at, paid_amount) 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- ============================================================================
-- ACTIVITY LOGS INDEXES
-- ============================================================================

-- Composite index for audit queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_hospital_time 
ON activity_logs(hospital_id, created_at DESC);

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_activity_logs_user 
ON activity_logs(user_id, created_at DESC);

-- Partial index for recent activity (last 7 days)
CREATE INDEX IF NOT EXISTS idx_activity_logs_recent 
ON activity_logs(hospital_id, action_type, created_at) 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

-- ============================================================================
-- PATIENT QUEUE INDEXES
-- ============================================================================

-- Composite index for queue management
CREATE INDEX IF NOT EXISTS idx_queue_hospital_status 
ON patient_queue(hospital_id, status, check_in_time);

-- Index for department queue views
CREATE INDEX IF NOT EXISTS idx_queue_department 
ON patient_queue(hospital_id, department, status, check_in_time);

-- Partial index for waiting patients (real-time queue display)
CREATE INDEX IF NOT EXISTS idx_queue_waiting 
ON patient_queue(hospital_id, priority, check_in_time) 
WHERE status IN ('waiting', 'called');

-- ============================================================================
-- PRESCRIPTION & LAB ORDER INDEXES
-- ============================================================================

-- Partial index for pending prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_pending 
ON prescriptions(hospital_id, created_at) 
WHERE status = 'pending';

-- Partial index for critical lab orders
CREATE INDEX IF NOT EXISTS idx_lab_orders_critical 
ON lab_orders(hospital_id, status, created_at) 
WHERE is_critical = true AND status != 'completed';

-- Index for pending lab orders
CREATE INDEX IF NOT EXISTS idx_lab_orders_pending 
ON lab_orders(hospital_id, status) 
WHERE status IN ('pending', 'in_progress');

-- ============================================================================
-- USER & PROFILE INDEXES
-- ============================================================================

-- Composite index for staff queries
CREATE INDEX IF NOT EXISTS idx_profiles_hospital_staff 
ON profiles(hospital_id, is_staff, is_active);

-- Index for online status checks
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen 
ON profiles(hospital_id, last_seen DESC) 
WHERE last_seen >= CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Index for user role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup 
ON user_roles(user_id, hospital_id, role);

-- ============================================================================
-- SECURITY & AUDIT INDEXES
-- ============================================================================

-- Index for security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts 
ON security_alerts(hospital_id, acknowledged, timestamp DESC);

-- Index for audit logs (HIPAA compliance queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs(entity_type, entity_id, created_at DESC);

-- Partial index for unacknowledged alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_unacknowledged 
ON security_alerts(hospital_id, severity, timestamp) 
WHERE acknowledged = false;

-- ============================================================================
-- DASHBOARD OPTIMIZATION INDEXES
-- ============================================================================

-- Covering index for admin dashboard stats
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_patients 
ON patients(hospital_id, is_active, created_at) 
INCLUDE (first_name, last_name, mrn);

-- Covering index for appointment dashboard
CREATE INDEX IF NOT EXISTS idx_dashboard_stats_appointments 
ON appointments(hospital_id, scheduled_date, status) 
INCLUDE (doctor_id, patient_id, scheduled_time);

-- ============================================================================
-- ANALYTICS & REPORTING INDEXES
-- ============================================================================

-- Index for consultation analytics
CREATE INDEX IF NOT EXISTS idx_consultations_analytics 
ON consultations(hospital_id, doctor_id, created_at);

-- Index for billing reports
CREATE INDEX IF NOT EXISTS idx_payments_date 
ON payments(hospital_id, payment_date);

-- ============================================================================
-- CLEANUP: Remove redundant indexes (if any exist from previous migrations)
-- ============================================================================

-- Note: These are commented out as they should be reviewed before removal
-- DROP INDEX IF EXISTS idx_patients_hospital_id; -- Covered by composite index
-- DROP INDEX IF EXISTS idx_appointments_hospital_id; -- Covered by composite index

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Analyze tables to update statistics
ANALYZE patients;
ANALYZE appointments;
ANALYZE invoices;
ANALYZE activity_logs;
ANALYZE patient_queue;
ANALYZE prescriptions;
ANALYZE lab_orders;
ANALYZE profiles;
ANALYZE user_roles;
