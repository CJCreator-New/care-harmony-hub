-- ============================================================================
-- Make activity_logs append-only / immutable (audit DB-002)
-- ============================================================================
-- activity_logs is an audit trail and must be tamper-evident. RLS already denies
-- UPDATE/DELETE to authenticated users (no such policy exists), but the service
-- role bypasses RLS, so edge functions / privileged code could still mutate or
-- delete history. A BEFORE UPDATE OR DELETE trigger enforces immutability against
-- ALL writers (including service role). BEFORE ROW triggers on a partitioned
-- parent propagate to every partition (PG13+), so this holds whether or not the
-- partitioning migration has been applied.
--
-- INSERT remains allowed (the log must keep growing). If a legitimate retention
-- policy ever needs to purge old partitions, that is done by DROP/DETACH PARTITION
-- as a superuser maintenance task, which this trigger does not block.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_activity_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'activity_logs is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_logs_immutable ON public.activity_logs;
CREATE TRIGGER trg_activity_logs_immutable
BEFORE UPDATE OR DELETE ON public.activity_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_mutation();

-- Belt-and-suspenders at the RLS layer for authenticated users: explicitly deny
-- UPDATE and DELETE (no-op policies that never match).
DROP POLICY IF EXISTS "activity_logs_no_update" ON public.activity_logs;
CREATE POLICY "activity_logs_no_update" ON public.activity_logs
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "activity_logs_no_delete" ON public.activity_logs;
CREATE POLICY "activity_logs_no_delete" ON public.activity_logs
  FOR DELETE TO authenticated USING (false);
