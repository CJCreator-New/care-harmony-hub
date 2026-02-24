-- Migration: Performance indexes for high-frequency query paths
-- Ticket: T-18 (PERF-001)
-- Date: 2026-02-23
-- Verify after applying with: EXPLAIN (ANALYZE, BUFFERS) SELECT ...

-- 1. Appointments: hospital + date lookups (receptionist/doctor dashboards)
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date
  ON appointments (hospital_id, scheduled_date)
  WHERE status NOT IN ('cancelled', 'no_show');

-- 2. Appointments: patient history queries (patient portal)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
  ON appointments (patient_id, scheduled_date DESC);

-- 3. Notifications: unread count per recipient (header badge)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id, is_read)
  WHERE is_read = false;

-- 4. Notifications: hospital-scoped delivery lookups
CREATE INDEX IF NOT EXISTS idx_notifications_hospital_created
  ON notifications (hospital_id, created_at DESC);

-- 5. Patient queue: active entries per hospital ordered by check-in time
CREATE INDEX IF NOT EXISTS idx_patient_queue_hospital_active
  ON patient_queue (hospital_id, check_in_time)
  WHERE status NOT IN ('completed', 'cancelled');

-- 6. Patient queue: patient lookup (prevents full-scan on re-check)
CREATE INDEX IF NOT EXISTS idx_patient_queue_patient_id
  ON patient_queue (patient_id, created_at DESC);

-- Verify newly created indexes
-- SELECT indexname, tablename, indexdef
-- FROM pg_indexes
-- WHERE indexname LIKE 'idx_%'
--   AND tablename IN ('appointments', 'notifications', 'patient_queue')
-- ORDER BY tablename, indexname;
