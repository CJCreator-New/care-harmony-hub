-- Migration: activity_logs range partitioning (DRAFT — apply after backup)
-- Ticket: T-19 (PERF-002)
-- Date: 2026-02-23
--
-- RUNBOOK SUMMARY (see docs/DATABASE.md for full procedure)
-- 1. Take a full pg_dump backup of activity_logs before running this.
-- 2. Apply in a maintenance window — existing rows are bulk-moved.
-- 3. After success: schedule quarterly partition creation via pg_cron.
-- 4. Monitor pg_stat_user_tables for partition hit rates.
--
-- NOTE: this migration converts the existing unpartitioned table to a
-- partitioned parent. Because PostgreSQL does not support ALTER TABLE ...
-- PARTITION BY on existing tables, the standard approach is:
--   a) rename the current table,
--   b) create the new partitioned parent,
--   c) attach old table as a partition covering its actual date range,
--   d) create current + future partitions.
-- This migration implements that approach.

BEGIN;

-- Step 1: Rename the existing unpartitioned table
ALTER TABLE activity_logs RENAME TO activity_logs_legacy;

-- Step 2: Create the partitioned parent (identical schema, no data)
CREATE TABLE activity_logs (
  id             UUID        NOT NULL DEFAULT gen_random_uuid(),
  hospital_id    UUID,
  user_id        UUID,
  action_type    TEXT        NOT NULL,
  entity_type    TEXT,
  entity_id      UUID,
  details        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Preserve any additional columns from the original table
  ip_address     TEXT,
  user_agent     TEXT
) PARTITION BY RANGE (created_at);

-- Step 3: Attach the legacy table as a catch-all for historical data
-- Determine the actual min/max range from legacy data before running:
--   SELECT min(created_at), max(created_at) FROM activity_logs_legacy;
-- Replace the dates below with the real range from that query.
ALTER TABLE activity_logs_legacy
  ADD CONSTRAINT activity_logs_legacy_created_at_check
  CHECK (created_at < '2026-04-01');

ALTER TABLE activity_logs
  ATTACH PARTITION activity_logs_legacy
  FOR VALUES FROM (MINVALUE) TO ('2026-04-01');

-- Step 4: Create current quarter partition (2026 Q2)
CREATE TABLE activity_logs_2026_q2
  PARTITION OF activity_logs
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- Step 5: Create next quarter partition (2026 Q3)
CREATE TABLE activity_logs_2026_q3
  PARTITION OF activity_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

-- Step 6: Create next quarter partition (2026 Q4)
CREATE TABLE activity_logs_2026_q4
  PARTITION OF activity_logs
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Step 7: Rebuild indexes on the partitioned table
CREATE INDEX idx_activity_logs_hospital_created
  ON activity_logs (hospital_id, created_at DESC);

CREATE INDEX idx_activity_logs_user_created
  ON activity_logs (user_id, created_at DESC);

CREATE INDEX idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id)
  WHERE entity_id IS NOT NULL;

-- Step 8: Re-apply RLS (Supabase requires this after table recreation)
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can read own hospital logs"
  ON activity_logs FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

COMMIT;

-- ============================================================
-- ARCHIVAL RUNBOOK — document in docs/DATABASE.md
-- ============================================================
-- After quarterly partition is stable (> 3 months old):
--
-- 1. Export partition to cold storage:
--    pg_dump -t activity_logs_2026_q2 caresync > activity_logs_2026_q2.dump
--
-- 2. Detach the partition:
--    ALTER TABLE activity_logs DETACH PARTITION activity_logs_2026_q2;
--
-- 3. Archive the detached table:
--    ALTER TABLE activity_logs_2026_q2 RENAME TO activity_logs_archive_2026_q2;
--    -- Optionally move to a separate schema:
--    -- ALTER TABLE activity_logs_archive_2026_q2 SET SCHEMA archive;
--
-- 4. Create the next future quarter partition before old one fills:
--    CREATE TABLE activity_logs_2027_q1
--      PARTITION OF activity_logs
--      FOR VALUES FROM ('2027-01-01') TO ('2027-04-01');
--
-- Automate via pg_cron:
--   SELECT cron.schedule(
--     'create-next-quarter-partition',
--     '0 0 25 3,6,9,12 *',
--     $$CALL create_next_activity_partition();$$
--   );
