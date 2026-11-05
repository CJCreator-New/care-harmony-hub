-- NEUTRALIZED (roadmap S0-05, issue DB-11). This file is intentionally a no-op.
--
-- It used to rewrite every hospital's MRNs in place with
--   UPDATE public.patients SET mrn = 'MRN' || LPAD(<digits>, 8, '0') WHERE length(mrn) <> 11
-- LPAD truncates values longer than 8 digits, so longer MRNs were silently cut
-- and could collide with UNIQUE (hospital_id, mrn). Patient identifiers must not
-- be rewritten by a schema migration. Any MRN correction is a reviewed,
-- hospital-scoped, audited data change run by an operator.
-- tests/security/s0-05-destructive-endpoints.test.ts fails if PHI DML returns.
DO $noop$ BEGIN NULL; END $noop$;
