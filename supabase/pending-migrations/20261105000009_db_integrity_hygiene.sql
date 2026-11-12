-- =============================================================================
-- PENDING MIGRATION (not in supabase/migrations/, so neither the Supabase CLI
-- nor the Lovable sync applies it). Read supabase/pending-migrations/README.md
-- and the sibling note 20261105000009.README.md before promoting it.
--
-- 20261105000009_db_integrity_hygiene.sql
-- Roadmap S2-08 (issues DB-12, DB-20, DB-17, SECF-24): database integrity,
-- retention and performance hygiene.
--
-- Section A  DB-12 soft delete. Adds a nullable deleted_at to patients,
--            appointments and consultations. A BEFORE DELETE trigger refuses a
--            hard DELETE of those rows, so the PHI tables have no hard-delete
--            path. The trigger fires on FK cascades too.
-- Section B  DB-12 destructive cascades. Every foreign key that points at
--            patients, appointments or consultations and uses ON DELETE CASCADE
--            is recreated with ON DELETE RESTRICT. The cascade in the child
--            table is what made a delete destructive. Existing rows already
--            satisfy the constraint, so the re-add cannot fail on them.
-- Section C  DB-12 visit uniqueness. unique_active_consultation (patient_id,
--            doctor_id, status) blocks a second completed visit between the same
--            patient and doctor. It is replaced by a partial unique index: one
--            open (not completed) consultation per patient and doctor. If open
--            duplicates exist, nothing is changed and a WARNING is raised.
-- Section D  DB-12 CHECK constraints, added NOT VALID. New and updated rows are
--            checked. Existing rows are not scanned, so this cannot fail on them.
--            A check is added only when its columns have the expected type (the
--            validation fixture stores some times as text).
-- Section E  DB-20 indexes. CREATE INDEX IF NOT EXISTS on the hot columns
--            (hospital_id, patient_id, status, created_at) of the clinical
--            tables, and on single-column foreign keys that point at hospitals,
--            patients, appointments or consultations. Plain CREATE INDEX (no
--            CONCURRENTLY, which cannot run in a transaction) takes a write lock
--            per table while it runs. See the README before promoting.
-- Section F  Retention helper public.purge_operational_logs_before(). It
--            deletes nothing on its own and runs on no schedule. It needs an
--            explicit cutoff, a 90-day floor, a table on an allow-list of
--            non-clinical logs, and p_dry_run = false to delete (the default is
--            a count only). EXECUTE goes to service_role only. Audit tables and
--            PHI tables are not on the allow-list, and the audit triggers from
--            20261105000008 would refuse their deletes anyway.
-- Section G  DB-17 storage, documents bucket. The seven policies in
--            20260204000011_misc.sql that let any hospital member read, overwrite
--            and delete any PHI document are replaced. Read and insert are
--            scoped to the hospital folder (first path segment = hospital_id) and
--            to clinical and front-desk roles. Overwrite (UPDATE) is removed.
--            Delete is admin only.
-- Section H  SECF-24 storage, telemedicine-recordings bucket. The bucket is
--            created private if it is absent (or made private if it exists as
--            public). Policies are scoped to the hospital folder and to
--            clinicians, with no UPDATE policy (overwrite disabled) and admin-only
--            delete. The client writes telemedicine/<session>/ today, so it must
--            write <hospital_id>/telemedicine/<session>/ before this is promoted.
--
-- Idempotent. Only ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, guarded
-- constraint adds, policy and trigger replacement, and function creation are
-- used. No row is deleted, updated or rewritten. Each block skips an absent
-- table or column.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. Soft delete on PHI tables.
-- -----------------------------------------------------------------------------
DO $s209a$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['patients', 'appointments', 'consultations'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '20261105000009: public.% is absent, soft-delete column skipped', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at timestamptz', t);
  END LOOP;
END
$s209a$;

CREATE OR REPLACE FUNCTION public.phi_reject_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% is a PHI table: hard DELETE is not permitted; set deleted_at instead', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

REVOKE ALL ON FUNCTION public.phi_reject_hard_delete() FROM PUBLIC;

DO $s209a2$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['patients', 'appointments', 'consultations'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_no_hard_delete ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_no_hard_delete BEFORE DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.phi_reject_hard_delete()', t, t);
  END LOOP;
END
$s209a2$;

-- -----------------------------------------------------------------------------
-- B. Destructive cascades on foreign keys to PHI parents become RESTRICT.
--    pg_get_constraintdef keeps NOT VALID and DEFERRABLE if they were set, so
--    the recreated constraint has the same validation state as before.
-- -----------------------------------------------------------------------------
DO $s209b$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname,
           con.conrelid::regclass AS child,
           pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con
      JOIN pg_class parent ON parent.oid = con.confrelid
      JOIN pg_namespace pn ON pn.oid = parent.relnamespace AND pn.nspname = 'public'
      JOIN pg_class child ON child.oid = con.conrelid
      JOIN pg_namespace cn ON cn.oid = child.relnamespace AND cn.nspname = 'public'
     WHERE con.contype = 'f'
       AND con.confdeltype = 'c'
       AND parent.relname IN ('patients', 'appointments', 'consultations')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.child, c.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',
                   c.child, c.conname,
                   replace(c.def, 'ON DELETE CASCADE', 'ON DELETE RESTRICT'));
    RAISE NOTICE '20261105000009: % on % now ON DELETE RESTRICT', c.conname, c.child;
  END LOOP;
END
$s209b$;

-- -----------------------------------------------------------------------------
-- C. Visit uniqueness: one open consultation per patient and doctor.
-- -----------------------------------------------------------------------------
DO $s209c$
BEGIN
  IF to_regclass('public.consultations') IS NULL THEN
    RAISE NOTICE '20261105000009: public.consultations is absent, C skipped';
    RETURN;
  END IF;

  IF to_regclass('public.consultations_one_open_per_patient_doctor') IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.consultations
       WHERE status IS DISTINCT FROM 'completed'
       GROUP BY patient_id, doctor_id
      HAVING count(*) > 1
    ) THEN
      RAISE WARNING '20261105000009: open duplicate consultations exist; the partial unique index and the removal of unique_active_consultation are SKIPPED until they are resolved by hand';
      RETURN;
    END IF;

    CREATE UNIQUE INDEX consultations_one_open_per_patient_doctor
      ON public.consultations (patient_id, doctor_id)
      WHERE status IS DISTINCT FROM 'completed';
  END IF;

  ALTER TABLE public.consultations DROP CONSTRAINT IF EXISTS unique_active_consultation;
END
$s209c$;

-- -----------------------------------------------------------------------------
-- D. CHECK constraints, NOT VALID (new and updated rows only).
--    Each check runs only when every column it reads exists with an expected
--    type (type_name lists the acceptable data_type values, separated by |).
--    The validation fixture stores appointment times and queue times as text,
--    and the schema allows date_of_birth as text, so those checks are skipped
--    there rather than failing or comparing text.
-- -----------------------------------------------------------------------------
DO $s209d$
DECLARE
  k record;
  v_ok boolean;
BEGIN
  FOR k IN SELECT * FROM (VALUES
      ('appointments', 'appointments_duration_positive',
       'duration_minutes IS NULL OR duration_minutes > 0',
       ARRAY['duration_minutes'], 'integer|numeric|bigint|smallint'),
      ('appointments', 'appointments_end_after_start',
       'start_time IS NULL OR end_time IS NULL OR end_time >= start_time',
       ARRAY['start_time', 'end_time'], 'timestamp with time zone'),
      ('patients', 'patients_dob_not_future',
       'date_of_birth <= CURRENT_DATE',
       ARRAY['date_of_birth'], 'date'),
      ('patient_queue', 'patient_queue_service_order',
       'service_start_time IS NULL OR service_end_time IS NULL OR service_end_time >= service_start_time',
       ARRAY['service_start_time', 'service_end_time'], 'timestamp with time zone')
    ) AS v(tbl, conname, expr, cols, type_name)
  LOOP
    IF to_regclass('public.' || k.tbl) IS NULL THEN
      RAISE NOTICE '20261105000009: public.% is absent, % skipped', k.tbl, k.conname;
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conname = k.conname AND conrelid = to_regclass('public.' || k.tbl)) THEN
      CONTINUE;
    END IF;
    SELECT bool_and(EXISTS (
             SELECT 1 FROM information_schema.columns ic
              WHERE ic.table_schema = 'public' AND ic.table_name = k.tbl
                AND ic.column_name = c
                AND ic.data_type = ANY (string_to_array(k.type_name, '|'))))
      INTO v_ok
      FROM unnest(k.cols) AS c;
    IF NOT coalesce(v_ok, false) THEN
      RAISE NOTICE '20261105000009: %.% columns are not all of type %; % skipped',
                   k.tbl, k.cols, k.type_name, k.conname;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
                   k.tbl, k.conname, k.expr);
  END LOOP;
END
$s209d$;

-- -----------------------------------------------------------------------------
-- E. Indexes on hot columns and on foreign keys to PHI parents.
-- -----------------------------------------------------------------------------
DO $s209e$
DECLARE
  t text;
  c text;
  v_leading boolean;
BEGIN
  -- E.1 hot columns on clinical and billing tables.
  FOREACH t IN ARRAY ARRAY['patients', 'appointments', 'consultations', 'patient_queue',
                           'lab_orders', 'prescriptions', 'invoices', 'documents',
                           'telemedicine_sessions'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    FOREACH c IN ARRAY ARRAY['hospital_id', 'patient_id', 'status', 'created_at'] LOOP
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = t AND column_name = c) THEN
        CONTINUE;
      END IF;
      SELECT EXISTS (
        SELECT 1 FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
         WHERE i.indrelid = to_regclass('public.' || t) AND a.attname = c
      ) INTO v_leading;
      IF NOT v_leading THEN
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
                       left('idx_' || t || '_' || c, 63), t, c);
      END IF;
    END LOOP;
  END LOOP;

  -- E.2 single-column foreign keys that point at hospitals, patients,
  --     appointments or consultations.
  FOR t, c IN
    SELECT child.relname::text, a.attname::text
      FROM pg_constraint con
      JOIN pg_class child ON child.oid = con.conrelid
      JOIN pg_namespace cn ON cn.oid = child.relnamespace AND cn.nspname = 'public'
      JOIN pg_class parent ON parent.oid = con.confrelid
      JOIN pg_namespace pn ON pn.oid = parent.relnamespace AND pn.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
     WHERE con.contype = 'f'
       AND array_length(con.conkey, 1) = 1
       AND parent.relname IN ('hospitals', 'patients', 'appointments', 'consultations')
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_index i
        JOIN pg_attribute a2 ON a2.attrelid = i.indrelid AND a2.attnum = i.indkey[0]
       WHERE i.indrelid = to_regclass('public.' || t) AND a2.attname = c
    ) INTO v_leading;
    IF NOT v_leading THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
                     left('idx_' || t || '_' || c || '_fk', 63), t, c);
    END IF;
  END LOOP;
END
$s209e$;

-- -----------------------------------------------------------------------------
-- F. Retention helper. Deletes nothing unless called with an explicit cutoff,
--    a table on the allow-list, and p_dry_run = false.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_operational_logs_before(
  p_table   text,
  p_cutoff  timestamptz,
  p_dry_run boolean DEFAULT true
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_col   text;
  v_count bigint;
BEGIN
  IF p_cutoff IS NULL THEN
    RAISE EXCEPTION 'retention: an explicit p_cutoff is required';
  END IF;
  IF p_cutoff > now() - interval '90 days' THEN
    RAISE EXCEPTION 'retention: cutoff % is inside the 90-day floor', p_cutoff;
  END IF;

  -- Allow-list: operational, non-clinical logs only. Audit and PHI tables are
  -- not listed.
  v_col := CASE p_table
             WHEN 'error_logs'       THEN 'created_at'
             WHEN 'performance_logs' THEN 'created_at'
             ELSE NULL
           END;
  IF v_col IS NULL THEN
    RAISE EXCEPTION 'retention: % is not on the operational allow-list', p_table;
  END IF;
  IF to_regclass('public.' || p_table) IS NULL THEN
    RAISE EXCEPTION 'retention: public.% does not exist', p_table;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE %I < $1', p_table, v_col)
    INTO v_count USING p_cutoff;

  IF p_dry_run THEN
    RETURN v_count;
  END IF;

  EXECUTE format('DELETE FROM public.%I WHERE %I < $1', p_table, v_col)
    USING p_cutoff;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$fn$;

REVOKE ALL ON FUNCTION public.purge_operational_logs_before(text, timestamptz, boolean) FROM PUBLIC;
DO $s209f$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.purge_operational_logs_before(text, timestamptz, boolean) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.purge_operational_logs_before(text, timestamptz, boolean) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.purge_operational_logs_before(text, timestamptz, boolean) TO service_role;
  END IF;
END
$s209f$;

-- -----------------------------------------------------------------------------
-- G and H. Storage. Staff-role helper for the hospital folder check.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storage_staff_hospital_ids(p_roles text[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ur.hospital_id
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
   WHERE ur.user_id = auth.uid()
     AND ur.hospital_id IS NOT NULL
     AND ur.role::text = ANY (p_roles)
     AND coalesce((to_jsonb(p) ->> 'is_active')::boolean, true)
$$;

REVOKE ALL ON FUNCTION public.storage_staff_hospital_ids(text[]) FROM PUBLIC;
DO $s209gh$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.storage_staff_hospital_ids(text[]) TO authenticated;
  END IF;
END
$s209gh$;

DO $s209g$
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE '20261105000009: storage.objects is absent, G and H skipped';
    RETURN;
  END IF;

  -- G. documents bucket. Drop the seven policies from 20260204000011_misc.sql.
  DROP POLICY IF EXISTS "Users can view documents from their hospital" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload documents to their hospital" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete documents from their hospital" ON storage.objects;
  DROP POLICY IF EXISTS "Hospital staff can upload documents" ON storage.objects;
  DROP POLICY IF EXISTS "Hospital staff can read documents" ON storage.objects;
  DROP POLICY IF EXISTS "Hospital staff can update documents" ON storage.objects;
  DROP POLICY IF EXISTS "Hospital staff can delete documents" ON storage.objects;
  DROP POLICY IF EXISTS "s209_documents_staff_select" ON storage.objects;
  DROP POLICY IF EXISTS "s209_documents_staff_insert" ON storage.objects;
  DROP POLICY IF EXISTS "s209_documents_admin_delete" ON storage.objects;

  CREATE POLICY "s209_documents_staff_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] IN (
        SELECT h::text FROM public.storage_staff_hospital_ids(
          ARRAY['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician']::text[]) AS h)
    );

  CREATE POLICY "s209_documents_staff_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] IN (
        SELECT h::text FROM public.storage_staff_hospital_ids(
          ARRAY['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician']::text[]) AS h)
    );

  CREATE POLICY "s209_documents_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'documents'
      AND (storage.foldername(name))[1] IN (
        SELECT h::text FROM public.storage_staff_hospital_ids(ARRAY['admin']::text[]) AS h)
    );
  -- No UPDATE policy on documents: overwrite is refused for clients.

  -- H. telemedicine-recordings bucket: private, hospital-scoped, no overwrite.
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
    VALUES ('telemedicine-recordings', 'telemedicine-recordings', false, ARRAY['video/webm']::text[])
    ON CONFLICT (id) DO UPDATE SET public = false;
  END IF;

  DROP POLICY IF EXISTS "s209_telemedicine_clinical_select" ON storage.objects;
  DROP POLICY IF EXISTS "s209_telemedicine_clinical_insert" ON storage.objects;
  DROP POLICY IF EXISTS "s209_telemedicine_admin_delete" ON storage.objects;

  CREATE POLICY "s209_telemedicine_clinical_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'telemedicine-recordings'
      AND (storage.foldername(name))[1] IN (
        SELECT h::text FROM public.storage_staff_hospital_ids(
          ARRAY['doctor', 'nurse', 'admin']::text[]) AS h)
    );

  CREATE POLICY "s209_telemedicine_clinical_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'telemedicine-recordings'
      AND (storage.foldername(name))[1] IN (
        SELECT h::text FROM public.storage_staff_hospital_ids(
          ARRAY['doctor', 'nurse', 'admin']::text[]) AS h)
    );

  CREATE POLICY "s209_telemedicine_admin_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'telemedicine-recordings'
      AND (storage.foldername(name))[1] IN (
        SELECT h::text FROM public.storage_staff_hospital_ids(ARRAY['admin']::text[]) AS h)
    );
END
$s209g$;
