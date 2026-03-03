-- =============================================================================
-- Migration: Definitive profiles RLS anon-deny hardening
-- Date: 2026-03-03
-- Reason: Security gate test `verifies anonymous queries cannot expose
--         null-scoped profiles` is failing because the policy created in
--         20260204000011_misc.sql used `hospital_id IS NULL OR ...` in its
--         USING clause, which evaluates to TRUE for every null-hospital row
--         and applies to ALL roles (including anon) because no TO clause was
--         specified.  Later migrations attempted to fix this but may not have
--         been applied to all environments.
--
-- This migration is idempotent: it drops every known variant of the profiles
-- SELECT policy and creates one authoritative replacement.
-- =============================================================================

-- ── 1. Drop every known SELECT policy variant on profiles ────────────────────
-- We enumerate all historical names to handle environments at any migration state.

DROP POLICY IF EXISTS "Users can view profiles in their hospital"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_only"                         ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view hospital profiles"      ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"                          ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_hospital"                     ON public.profiles;

-- ── 2. Ensure RLS is enabled (safe to repeat) ────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 3. Explicitly revoke SELECT from anon as a defence-in-depth measure ──────
-- PostgREST grants SELECT to anon by default; this explicitly blocks it at the
-- privilege layer as a second line of defence (the RLS policy below is the
-- primary guard, but belt-and-suspenders is justified for PHI).
REVOKE SELECT ON public.profiles FROM anon;

-- ── 4. Create the single authoritative SELECT policy ─────────────────────────
-- TO authenticated: the anon role is never covered, so it always gets 0 rows.
-- USING clause:
--   a) user_id = auth.uid()   → lets a user read their OWN profile, even during
--      onboarding when hospital_id is still NULL (avoids redirect loops).
--   b) hospital_id IS NOT NULL AND user_belongs_to_hospital(...)
--      → lets staff see colleagues' profiles within the same hospital, but
--        ONLY when those profiles are properly scoped to a hospital.
--      Rows with hospital_id = NULL are never exposed to other users.

CREATE POLICY "profiles_authenticated_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Own profile (works during onboarding when hospital_id may be null)
    user_id = auth.uid()
    OR
    -- Colleagues in the same hospital (null-hospital rows are excluded)
    (
      hospital_id IS NOT NULL
      AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
    )
  );

-- ── 5. Sanity comment for future auditors ────────────────────────────────────
-- The anon role: no SELECT policy + REVOKE above → always returns 0 rows.
-- The authenticated role: must either own the row OR share the hospital.
-- Profiles with hospital_id IS NULL are only visible to the profile owner.
