ho---
name: supabase-migration
description: "Write, review, and apply Supabase migrations, RLS policies, and RPCs for the CareSync HIMS codebase. Use when asked to add a table, alter a schema, write RLS policies, create a database function/RPC, enable Realtime on a table, or regenerate Supabase TypeScript types. Produces a correctly-named SQL migration file following codebase conventions, with idempotent structure, proper multi-tenant scoping, and a types-regen reminder."
argument-hint: "Describe what schema change is needed: new table, column addition, RLS policy, RPC function, Realtime publication, or type regen. Mention which roles should access it and whether it needs multi-tenant (hospital) scoping."
---

# CareSync — Supabase Migration Skill

Produces complete, deployment-ready migration files for the CareSync HIMS Supabase backend. Every output is a single `.sql` file dropped into `supabase/migrations/` with a timestamp filename, plus any required `ALTER PUBLICATION` and type-regen commands.

## When to Use

- "Add a table for [X]"
- "Write RLS policies for [table]"
- "Enable Realtime on [table]"
- "Fix the RLS on [table] — [role] can't read their own rows"
- "Regenerate Supabase types"
- "Alter [table] to add [column]"

---

## Project Constants

| Key | Value |
|-----|-------|
| Project ID | `wmxtzkrkscjwixafumym` |
| Types file | `src/integrations/supabase/types.ts` |
| Migration dir | `supabase/migrations/` |
| Role enum | `public.app_role` |

## Codebase-Specific Rules (MUST follow)

| Rule | Reason |
|------|--------|
| Use `public.has_role(auth.uid(), 'role')` for role checks | Defined helper in misc.sql — consistent, avoids diverged JWT claims |
| Use `public.user_belongs_to_hospital(auth.uid(), hospital_id)` for hospital scope | Defined helper — preferred over inline subquery |
| Use `public.get_user_hospital_id(uuid)` to resolve a user's hospital | Defined helper — use in RPCs |
| Hospital scoping: every clinical table needs `hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL` | Multi-tenant isolation — missing scope = cross-tenant data leak |
| Standard `app_role` values: `'admin'`, `'doctor'`, `'nurse'`, `'receptionist'`, `'pharmacist'`, `'lab_technician'`, `'patient'` | Match existing `app_role` enum |
| Do NOT use `auth.jwt() ->> 'role'` | JWT claims can lag after role change — use `has_role()` instead |
| All new tables need `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` | Consistency + audit trail |
| Trigger for `updated_at`: use existing `moddatetime()` extension function | Already wired in core schema |
| Migration filename format: `YYYYMMDDHHMMSS_snake_case_description.sql` | Supabase CLI ordering |
| Existing migration range: `20260204000001` → `20260303000001` | New files must have a later timestamp — check folder before choosing |

---

## Step 1 — Understand the Request

Identify which of these the user needs:

| Type | Output |
|------|--------|
| **New table** | `CREATE TABLE`, indexes, `ENABLE ROW LEVEL SECURITY`, RLS policies, `ALTER PUBLICATION` if Realtime needed, `updated_at` trigger |
| **Alter table** | `ALTER TABLE ... ADD COLUMN / DROP COLUMN / ALTER COLUMN`, update indexes if needed |
| **RLS only** | `DROP POLICY IF EXISTS` + `CREATE POLICY` blocks for the specified table/role |
| **Realtime** | `ALTER PUBLICATION supabase_realtime ADD TABLE <table>;` |
| **Type regen** | Shell command only — no SQL |

---

## Step 2 — RLS Policy Patterns

Use these exact patterns. Never use `USING (true)` — that was a known vulnerability in this codebase.

**Always precede each `CREATE POLICY` with `DROP POLICY IF EXISTS` to make migrations idempotent.**

### Staff read own hospital's data
```sql
DROP POLICY IF EXISTS "hospital_staff_select_<table>" ON public.<table_name>;
CREATE POLICY "hospital_staff_select_<table>" ON public.<table_name>
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));
```

### Role-gated write
```sql
DROP POLICY IF EXISTS "<role>_insert_<table>" ON public.<table_name>;
CREATE POLICY "<role>_insert_<table>" ON public.<table_name>
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), '<role>')
  );
```

### Patient reads own rows (patient portal)
```sql
DROP POLICY IF EXISTS "patient_select_own_<table>" ON public.<table_name>;
CREATE POLICY "patient_select_own_<table>" ON public.<table_name>
  FOR SELECT TO authenticated
  USING (
    patient_id IN (
      SELECT p.id FROM public.patients p
      JOIN public.profiles pr ON pr.id = p.profile_id
      WHERE pr.user_id = auth.uid()
    )
  );
```

### Admin full access
```sql
DROP POLICY IF EXISTS "admin_all_<table>" ON public.<table_name>;
CREATE POLICY "admin_all_<table>" ON public.<table_name>
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );
```

### `app_role` Enum Values
```
'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'patient'
```

---

## Step 3 — New Table Template

```sql
-- Migration: YYYYMMDDHHMMSS_<description>.sql
-- Purpose: <one-line description>
-- Idempotent: safe to run more than once

CREATE TABLE IF NOT EXISTS public.<table_name> (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,

  -- <domain columns here>

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance index on multi-tenant FK (required)
CREATE INDEX IF NOT EXISTS idx_<table_name>_hospital ON public.<table_name>(hospital_id);
-- <add selective indexes for FK columns and common filter columns>

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_<table_name>_updated_at'
  ) THEN
    CREATE TRIGGER set_<table_name>_updated_at
      BEFORE UPDATE ON public.<table_name>
      FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
  END IF;
END;
$$;

-- RLS
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hospital_staff_select_<table>" ON public.<table_name>;
CREATE POLICY "hospital_staff_select_<table>" ON public.<table_name>
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- <add role-specific write policies using has_role() helper>
```

---

## Step 4 — RPC / Database Function Template

```sql
CREATE OR REPLACE FUNCTION public.<function_name>(
  p_param1 <type>,
  p_param2 <type> DEFAULT NULL
)
RETURNS <return_type>
LANGUAGE plpgsql
SECURITY DEFINER          -- required: runs as DB owner
SET search_path = public  -- required: prevents search_path injection
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_hospital_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT public.get_user_hospital_id(v_user_id) INTO v_hospital_id;

  -- ... business logic ...

  RETURN <value>;
END;
$$;

-- Grant to authenticated only
GRANT EXECUTE ON FUNCTION public.<function_name> TO authenticated;
REVOKE EXECUTE ON FUNCTION public.<function_name> FROM anon;
```

---

## Step 5 — Realtime

When a table needs live updates (e.g., patient_queue, notifications, secure_messages):

```sql
-- Idempotent Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = '<table_name>'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.<table_name>;
  END IF;
END;
$$;
```

Add this at the end of the migration file. Do NOT add it for tables that don't need live push (static reference tables, audit logs, etc.).

Tables already in supabase_realtime (do not duplicate):
- `notifications`, `patient_queue`, `appointments`, `consultations`, `lab_orders`, `prescriptions`, `secure_messages`

---

## Step 6 — Type Regeneration

After any schema change, always regenerate TypeScript types:

```bash
npx supabase gen types typescript \
  --project-id wmxtzkrkscjwixafumym \
  > src/integrations/supabase/types.ts
```

Then verify no regressions:
```bash
npx tsc --noEmit
```

---

## Step 7 — Output Format & Checklist

Always produce:

1. **Migration file content** — complete SQL, ready to save as `supabase/migrations/<timestamp>_<description>.sql`
2. **Checklist** at the end:
   - [ ] Migration filename follows `YYYYMMDDHHMMSS_description.sql`, placed in `supabase/migrations/`
   - [ ] `hospital_id` FK + index present on all clinical/PHI tables
   - [ ] `ENABLE ROW LEVEL SECURITY` present
   - [ ] All policies use `has_role()` / `user_belongs_to_hospital()` helpers — no raw JWT claims
   - [ ] No `USING (true)` or `WITH CHECK (true)` on sensitive tables
   - [ ] All `CREATE POLICY` preceded by `DROP POLICY IF EXISTS` (idempotent)
   - [ ] RPCs use `SECURITY DEFINER SET search_path = public` with `GRANT`/`REVOKE`
   - [ ] Realtime publication added if table needs live UI updates
   - [ ] `updated_at` trigger added
   - [ ] Type regen command (`npx supabase gen types typescript --project-id wmxtzkrkscjwixafumym`) provided

---

## Common Mistakes to Avoid

| Mistake | Correct Pattern |
|---------|----------------|
| `auth.jwt() ->> 'role' = 'admin'` | `public.has_role(auth.uid(), 'admin')` |
| Inline subquery for hospital scope | `public.user_belongs_to_hospital(auth.uid(), hospital_id)` |
| `USING (true)` or `WITH CHECK (true)` | Always scope to `hospital_id` + role |
| Missing `ON DELETE CASCADE` on `hospital_id` FK | Add it — orphaned rows break multi-tenant cleanup |
| `CREATE POLICY` without `DROP POLICY IF EXISTS` | Always prefix with `DROP POLICY IF EXISTS` for idempotency |
| `SECURITY INVOKER` on RPCs with auth | Use `SECURITY DEFINER SET search_path = public` |
| Missing `GRANT EXECUTE` on new functions | Always `GRANT` to `authenticated` and `REVOKE` from `anon` |
| No index on `hospital_id` FK | Always `CREATE INDEX IF NOT EXISTS idx_<table>_hospital` |
| Adding table to `supabase_realtime` that's already there | Check the list in Step 5 first |
