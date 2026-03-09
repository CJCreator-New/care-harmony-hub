-- Migration: 20260309000002_scheduling_rls.sql
-- Purpose: Enable RLS and add hospital-scoped policies for all 7 scheduling tables
--          that were shipped with no RLS whatsoever. These tables contain PHI-adjacent
--          data (waitlists, insurance verifications, pre-registrations) accessible by
--          any authenticated session from any hospital — a critical multi-tenant isolation gap.
-- Idempotent: safe to run more than once.

-- ============================================================
-- resource_types
-- ============================================================
ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read resource types" ON public.resource_types;
CREATE POLICY "Hospital staff can read resource types"
  ON public.resource_types FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Admins can manage resource types" ON public.resource_types;
CREATE POLICY "Admins can manage resource types"
  ON public.resource_types FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_resource_types_hospital ON public.resource_types(hospital_id);

-- ============================================================
-- resource_bookings
-- ============================================================
ALTER TABLE public.resource_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read resource bookings" ON public.resource_bookings;
CREATE POLICY "Hospital staff can read resource bookings"
  ON public.resource_bookings FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Receptionist and above can manage bookings" ON public.resource_bookings;
CREATE POLICY "Receptionist and above can manage bookings"
  ON public.resource_bookings FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'receptionist')
      OR public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'nurse')
    )
  );

CREATE INDEX IF NOT EXISTS idx_resource_bookings_hospital ON public.resource_bookings(hospital_id);

-- ============================================================
-- appointment_waitlist
-- ============================================================
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read appointment waitlist" ON public.appointment_waitlist;
CREATE POLICY "Hospital staff can read appointment waitlist"
  ON public.appointment_waitlist FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Receptionist can manage appointment waitlist" ON public.appointment_waitlist;
CREATE POLICY "Receptionist can manage appointment waitlist"
  ON public.appointment_waitlist FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'receptionist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_appointment_waitlist_hospital ON public.appointment_waitlist(hospital_id);

-- ============================================================
-- recurring_appointments
-- ============================================================
ALTER TABLE public.recurring_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read recurring appointments" ON public.recurring_appointments;
CREATE POLICY "Hospital staff can read recurring appointments"
  ON public.recurring_appointments FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Doctors and receptionists can manage recurring appointments" ON public.recurring_appointments;
CREATE POLICY "Doctors and receptionists can manage recurring appointments"
  ON public.recurring_appointments FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'receptionist')
      OR public.has_role(auth.uid(), 'doctor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_recurring_appointments_hospital ON public.recurring_appointments(hospital_id);

-- ============================================================
-- insurance_verifications (PHI-adjacent — high priority)
-- ============================================================
ALTER TABLE public.insurance_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read insurance verifications" ON public.insurance_verifications;
CREATE POLICY "Hospital staff can read insurance verifications"
  ON public.insurance_verifications FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Receptionist can manage insurance verifications" ON public.insurance_verifications;
CREATE POLICY "Receptionist can manage insurance verifications"
  ON public.insurance_verifications FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'receptionist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_insurance_verifications_hospital ON public.insurance_verifications(hospital_id);

-- ============================================================
-- pre_registration_forms (PHI — high priority)
-- ============================================================
ALTER TABLE public.pre_registration_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read pre-registration forms" ON public.pre_registration_forms;
CREATE POLICY "Hospital staff can read pre-registration forms"
  ON public.pre_registration_forms FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Receptionist can manage pre-registration forms" ON public.pre_registration_forms;
CREATE POLICY "Receptionist can manage pre-registration forms"
  ON public.pre_registration_forms FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'receptionist')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pre_registration_forms_hospital ON public.pre_registration_forms(hospital_id);

-- ============================================================
-- appointment_buffer_rules
-- ============================================================
ALTER TABLE public.appointment_buffer_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hospital staff can read buffer rules" ON public.appointment_buffer_rules;
CREATE POLICY "Hospital staff can read buffer rules"
  ON public.appointment_buffer_rules FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

DROP POLICY IF EXISTS "Admins can manage buffer rules" ON public.appointment_buffer_rules;
CREATE POLICY "Admins can manage buffer rules"
  ON public.appointment_buffer_rules FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_appointment_buffer_rules_hospital ON public.appointment_buffer_rules(hospital_id);
