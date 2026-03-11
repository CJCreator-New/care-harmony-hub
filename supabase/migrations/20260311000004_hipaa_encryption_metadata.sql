-- F2.3 + F2.4: Add encryption_metadata columns to consultations and prescription_items
-- Required for HIPAA §164.312(a)(2)(iv) field-level encryption of clinical narratives.
-- F5.3: Add hospital_id to vital_signs for direct hospital scoping (defence-in-depth).

-- Consultations: store AES-GCM metadata for encrypted clinical text fields
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB DEFAULT '{}'::JSONB;

-- Prescriptions: store AES-GCM metadata for encrypted item fields  
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB DEFAULT '{}'::JSONB;

-- F5.3: Add hospital_id directly to vital_signs for independent RLS scoping
ALTER TABLE public.vital_signs
  ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id);

-- Backfill hospital_id from the joined patients table
UPDATE public.vital_signs vs
SET hospital_id = p.hospital_id
FROM public.patients p
WHERE p.id = vs.patient_id
  AND vs.hospital_id IS NULL;

-- Create index for improved RLS performance on the new column
CREATE INDEX IF NOT EXISTS vital_signs_hospital_id_idx ON public.vital_signs(hospital_id);

-- Drop existing vital_signs RLS policies that rely on subquery join and replace with direct column check
DO $$
BEGIN
  -- Only replace if the table has RLS enabled
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'vital_signs' AND relrowsecurity = true) THEN
    -- Drop old join-based policies for vital_signs (they'll be recreated with direct hospital_id)
    DROP POLICY IF EXISTS "Staff can view vital signs" ON public.vital_signs;
    DROP POLICY IF EXISTS "Staff can insert vital signs" ON public.vital_signs;
    DROP POLICY IF EXISTS "Staff can update vital signs" ON public.vital_signs;

    -- Recreate with direct hospital_id column (faster + independent of patients RLS)
    CREATE POLICY "Staff can view vital signs" ON public.vital_signs FOR SELECT
      USING (
        hospital_id IS NOT NULL AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
        OR EXISTS (
          SELECT 1 FROM public.patients p
          WHERE p.id = patient_id
            AND public.user_belongs_to_hospital(auth.uid(), p.hospital_id)
        )
      );

    CREATE POLICY "Staff can insert vital signs" ON public.vital_signs FOR INSERT
      WITH CHECK (
        hospital_id IS NOT NULL AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
        OR EXISTS (
          SELECT 1 FROM public.patients p
          WHERE p.id = patient_id
            AND public.user_belongs_to_hospital(auth.uid(), p.hospital_id)
        )
      );

    CREATE POLICY "Staff can update vital signs" ON public.vital_signs FOR UPDATE
      USING (
        hospital_id IS NOT NULL AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
        OR EXISTS (
          SELECT 1 FROM public.patients p
          WHERE p.id = patient_id
            AND public.user_belongs_to_hospital(auth.uid(), p.hospital_id)
        )
      );
  END IF;
END $$;
