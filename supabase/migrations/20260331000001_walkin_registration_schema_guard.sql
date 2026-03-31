-- Stabilization guard migration for receptionist walk-in workflows.
-- Purpose:
-- 1) Ensure patients.encryption_metadata exists in environments with schema drift.
-- 2) Create walk_in_registrations table required by walk-in/check-in reporting flows.

-- 1) Guard for PHI encryption metadata on patients.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

COMMENT ON COLUMN public.patients.encryption_metadata IS
  'Stores encryption metadata for PHI fields (keys, versions, etc.).';

CREATE INDEX IF NOT EXISTS idx_patients_encryption_metadata
  ON public.patients USING GIN (encryption_metadata);

-- 2) Walk-in registration ledger (append + status progression).
CREATE TABLE IF NOT EXISTS public.walk_in_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  registered_by UUID,
  registration_source TEXT NOT NULL DEFAULT 'frontdesk'
    CHECK (registration_source IN ('frontdesk', 'kiosk', 'emergency', 'api')),
  status TEXT NOT NULL DEFAULT 'checked_in'
    CHECK (status IN ('checked_in', 'in_service', 'checked_out', 'cancelled')),
  queue_number INTEGER,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.walk_in_registrations IS
  'Reception walk-in registration records and status progression for queue/accountability.';

CREATE INDEX IF NOT EXISTS idx_walk_in_registrations_hospital_status
  ON public.walk_in_registrations (hospital_id, status, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_walk_in_registrations_patient
  ON public.walk_in_registrations (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_walk_in_registrations_appointment
  ON public.walk_in_registrations (appointment_id)
  WHERE appointment_id IS NOT NULL;

-- Prevent duplicate active walk-ins for the same patient at the same hospital.
CREATE UNIQUE INDEX IF NOT EXISTS uq_walk_in_active_patient
  ON public.walk_in_registrations (hospital_id, patient_id)
  WHERE status IN ('checked_in', 'in_service');

ALTER TABLE public.walk_in_registrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'walk_in_registrations'
      AND policyname = 'Hospital staff can view walk-in registrations'
  ) THEN
    CREATE POLICY "Hospital staff can view walk-in registrations"
      ON public.walk_in_registrations
      FOR SELECT
      TO authenticated
      USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'walk_in_registrations'
      AND policyname = 'Reception and admin can create walk-in registrations'
  ) THEN
    CREATE POLICY "Reception and admin can create walk-in registrations"
      ON public.walk_in_registrations
      FOR INSERT
      TO authenticated
      WITH CHECK (
        hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('receptionist', 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'walk_in_registrations'
      AND policyname = 'Hospital staff can update walk-in registrations'
  ) THEN
    CREATE POLICY "Hospital staff can update walk-in registrations"
      ON public.walk_in_registrations
      FOR UPDATE
      TO authenticated
      USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()))
      WITH CHECK (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_modified_column'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'trg_walk_in_registrations_updated_at'
    ) THEN
      CREATE TRIGGER trg_walk_in_registrations_updated_at
        BEFORE UPDATE ON public.walk_in_registrations
        FOR EACH ROW
        EXECUTE FUNCTION public.update_modified_column();
    END IF;
  END IF;
END $$;
