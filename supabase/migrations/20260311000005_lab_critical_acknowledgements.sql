-- ============================================================
-- Lab Critical Value Acknowledgement Tracking
-- Enhancement #5: Auto-escalate stat/critical results with
-- acknowledgement tracking and escalation if not ack'd in time.
-- HIPAA §164.312(b) — Audit controls
-- ============================================================

-- Table to track every critical-value alert and its acknowledgement
CREATE TABLE IF NOT EXISTS public.lab_critical_acknowledgements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  lab_order_id        UUID NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES public.patients(id),
  notified_physician  UUID NOT NULL REFERENCES public.profiles(id),
  critical_values     JSONB NOT NULL DEFAULT '[]',
  -- Lifecycle
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','acknowledged','escalated','cancelled')),
  acknowledged_at     TIMESTAMPTZ,
  acknowledged_by     UUID REFERENCES public.profiles(id),
  acknowledgement_note TEXT,
  -- Escalation
  escalation_level    INTEGER NOT NULL DEFAULT 0,      -- 0=primary, 1=2nd escalation, 2=charge nurse
  escalated_at        TIMESTAMPTZ,
  escalated_to        UUID REFERENCES public.profiles(id),
  escalation_reason   TEXT,
  -- Timing
  alert_sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ack_deadline        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hospital-scoped index for performance
CREATE INDEX IF NOT EXISTS lab_critical_ack_hospital_idx
  ON public.lab_critical_acknowledgements(hospital_id);

CREATE INDEX IF NOT EXISTS lab_critical_ack_status_idx
  ON public.lab_critical_acknowledgements(status, ack_deadline)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS lab_critical_ack_physician_idx
  ON public.lab_critical_acknowledgements(notified_physician, status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_lab_critical_ack_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lab_critical_ack_updated_at_trigger
  ON public.lab_critical_acknowledgements;

CREATE TRIGGER lab_critical_ack_updated_at_trigger
  BEFORE UPDATE ON public.lab_critical_acknowledgements
  FOR EACH ROW EXECUTE FUNCTION public.update_lab_critical_ack_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.lab_critical_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Doctors & lab techs within the same hospital can read
CREATE POLICY "lab_critical_ack_hospital_read" ON public.lab_critical_acknowledgements
  FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- Only lab techs and admins may INSERT (created by the edge function via service role)
-- Doctors may UPDATE (to acknowledge)
CREATE POLICY "lab_critical_ack_physician_update" ON public.lab_critical_acknowledgements
  FOR UPDATE
  USING (
    notified_physician = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','super_admin','nurse')
        AND ur.hospital_id = hospital_id
    )
  );

-- ============================================================
-- Escalation log (who was notified at each escalation level)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_critical_escalation_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ack_id            UUID NOT NULL REFERENCES public.lab_critical_acknowledgements(id) ON DELETE CASCADE,
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id),
  escalation_level  INTEGER NOT NULL,
  notified_to       UUID NOT NULL REFERENCES public.profiles(id),
  notification_id   UUID,           -- FK to notifications table if created
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_critical_escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_escalation_log_hospital_read" ON public.lab_critical_escalation_log
  FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE INDEX IF NOT EXISTS lab_escalation_log_ack_idx
  ON public.lab_critical_escalation_log(ack_id);
