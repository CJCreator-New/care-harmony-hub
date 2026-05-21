-- Migration: Add append-only trigger for audit_events
-- Up: create function and trigger
BEGIN;

-- Function: fn_audit_append_only()
CREATE OR REPLACE FUNCTION fn_audit_append_only()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_events table is append-only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: tr_audit_append on audit_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tr_audit_append'
  ) THEN
    CREATE TRIGGER tr_audit_append
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION fn_audit_append_only();
  END IF;
END;
$$;

COMMIT;

-- Down (reversible): drop trigger and function
-- To revert: run the following statements
-- DROP TRIGGER IF EXISTS tr_audit_append ON audit_events;
-- DROP FUNCTION IF EXISTS fn_audit_append_only();
