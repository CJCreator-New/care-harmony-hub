-- ============================================================================
-- Multi-tenancy fix: add hospital_id to prescription_items (audit DB-001)
-- ============================================================================
-- prescription_items had no hospital_id, so RLS could not scope it directly and
-- RLS was effectively deny-all for authenticated users (no policy existed).
-- This adds hospital_id (backfilled from the parent prescription, kept in sync by
-- a trigger), enforces NOT NULL, indexes it, and adds a hospital-isolation policy.
-- prescriptions.hospital_id is NOT NULL with ON DELETE CASCADE, so every existing
-- item has a parent hospital_id and the backfill is complete.
-- ============================================================================

ALTER TABLE public.prescription_items
  ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE;

-- Backfill from parent prescriptions.
UPDATE public.prescription_items pi
SET hospital_id = p.hospital_id
FROM public.prescriptions p
WHERE p.id = pi.prescription_id
  AND pi.hospital_id IS NULL;

-- Keep hospital_id in sync with the parent on insert/update (callers may omit it).
CREATE OR REPLACE FUNCTION public.set_prescription_item_hospital_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hospital_id IS NULL THEN
    SELECT hospital_id INTO NEW.hospital_id
    FROM public.prescriptions
    WHERE id = NEW.prescription_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_prescription_item_hospital_id ON public.prescription_items;
CREATE TRIGGER trg_set_prescription_item_hospital_id
BEFORE INSERT OR UPDATE ON public.prescription_items
FOR EACH ROW EXECUTE FUNCTION public.set_prescription_item_hospital_id();

-- Enforce NOT NULL now that the column is fully populated.
ALTER TABLE public.prescription_items
  ALTER COLUMN hospital_id SET NOT NULL;

-- Index for RLS / lookups.
CREATE INDEX IF NOT EXISTS idx_prescription_items_hospital_id
  ON public.prescription_items(hospital_id);

-- Hospital isolation. (RLS is already enabled on this table.)
DROP POLICY IF EXISTS "prescription_items_hospital_isolation" ON public.prescription_items;
CREATE POLICY "prescription_items_hospital_isolation"
  ON public.prescription_items FOR ALL TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
