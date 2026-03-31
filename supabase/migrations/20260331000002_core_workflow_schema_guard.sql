-- Core workflow schema guard for drifted environments.
-- Ensures critical tables/columns exist for receptionist, pharmacy, and workflow orchestration.

-- Patients PHI metadata guard
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

COMMENT ON COLUMN public.patients.encryption_metadata IS
  'Stores encryption metadata for PHI fields (keys, versions, etc.).';

CREATE INDEX IF NOT EXISTS idx_patients_encryption_metadata
  ON public.patients USING GIN (encryption_metadata);

-- Durable pharmacy queue guard
CREATE TABLE IF NOT EXISTS public.prescription_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'dispensed', 'cancelled', 'completed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescription_queue_hospital
  ON public.prescription_queue(hospital_id);
CREATE INDEX IF NOT EXISTS idx_prescription_queue_prescription
  ON public.prescription_queue(prescription_id);

ALTER TABLE public.prescription_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prescription_queue'
      AND policyname = 'Hospital staff can view prescription queue'
  ) THEN
    CREATE POLICY "Hospital staff can view prescription queue"
      ON public.prescription_queue
      FOR SELECT TO authenticated
      USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prescription_queue'
      AND policyname = 'Hospital staff can insert into prescription queue'
  ) THEN
    CREATE POLICY "Hospital staff can insert into prescription queue"
      ON public.prescription_queue
      FOR INSERT TO authenticated
      WITH CHECK (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'prescription_queue'
      AND policyname = 'Pharmacist can update prescription queue status'
  ) THEN
    CREATE POLICY "Pharmacist can update prescription queue status"
      ON public.prescription_queue
      FOR UPDATE TO authenticated
      USING (
        hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'pharmacist'
        )
      );
  END IF;
END $$;

-- Durable laboratory queue guard
CREATE TABLE IF NOT EXISTS public.lab_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  lab_order_id UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'assigned', 'collecting', 'processing', 'resulted', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'emergency')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_queue_hospital_status
  ON public.lab_queue(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_queue_lab_order
  ON public.lab_queue(lab_order_id);

ALTER TABLE public.lab_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_queue'
      AND policyname = 'Hospital staff can view lab queue'
  ) THEN
    CREATE POLICY "Hospital staff can view lab queue"
      ON public.lab_queue
      FOR SELECT TO authenticated
      USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_queue'
      AND policyname = 'Hospital staff can insert into lab queue'
  ) THEN
    CREATE POLICY "Hospital staff can insert into lab queue"
      ON public.lab_queue
      FOR INSERT TO authenticated
      WITH CHECK (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lab_queue'
      AND policyname = 'Lab techs can update lab queue'
  ) THEN
    CREATE POLICY "Lab techs can update lab queue"
      ON public.lab_queue
      FOR UPDATE TO authenticated
      USING (
        hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'lab_technician'
        )
      );
  END IF;
END $$;

-- Workflow orchestration event log guard
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  source_user UUID REFERENCES public.profiles(user_id),
  source_role public.app_role,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_hospital_type
  ON public.workflow_events(hospital_id, event_type, created_at DESC);

ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workflow_events'
      AND policyname = 'hospital_staff_events_access'
  ) THEN
    CREATE POLICY hospital_staff_events_access
      ON public.workflow_events
      FOR ALL TO authenticated
      USING (hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

GRANT ALL ON public.workflow_events TO authenticated;
