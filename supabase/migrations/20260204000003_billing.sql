-- Consolidated migration group: billing
-- Generated: 2026-02-04 18:14:16
-- Source migrations: 2

-- ============================================
-- Migration: 20260103090000_create_invoice_number_function.sql
-- ============================================

-- Create RPC function for generating invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(p_hospital_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invoice_count INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get count of invoices for this hospital
  SELECT COUNT(*) INTO invoice_count
  FROM invoices
  WHERE hospital_id = p_hospital_id;
  
  -- Generate invoice number: INV-YYYYMMDD-NNNN
  invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((invoice_count + 1)::TEXT, 4, '0');
  
  RETURN invoice_number;
END;
$$;


-- ============================================
-- Migration: 20260129000004_create_invoices_table.sql
-- ============================================

-- Create invoices table for billing & checkout (Phase 3)
-- Adds RLS policies scoped by hospital and patient access
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  consultation_id uuid,
  invoice_number text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0.00,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_hospital_idx ON public.invoices (hospital_id);
CREATE INDEX IF NOT EXISTS invoices_patient_idx ON public.invoices (patient_id);
CREATE INDEX IF NOT EXISTS invoices_consultation_idx ON public.invoices (consultation_id);

COMMENT ON TABLE public.invoices IS 'Persistent invoices for consultations and billing workflows';

-- Enable RLS and policies
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated hospital staff (roles: admin, billing, receptionist) to perform operations when hospital matches
CREATE POLICY invoices_hospital_staff_policy ON public.invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.hospital_roles hr
      WHERE hr.hospital_id = invoices.hospital_id
        AND hr.user_id = auth.uid()
        AND hr.role IN ('admin','billing','receptionist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hospital_roles hr
      WHERE hr.hospital_id = invoices.hospital_id
        AND hr.user_id = auth.uid()
        AND hr.role IN ('admin','billing','receptionist')
    )
  );

-- Allow patients to SELECT their own invoices
CREATE POLICY invoices_patient_select ON public.invoices
  FOR SELECT
  USING (
    invoices.patient_id = (SELECT id FROM public.profiles WHERE profiles.auth_id = auth.uid())
  );

-- Prevent direct INSERT by unauthorised roles (patients should not insert invoices directly)
CREATE POLICY invoices_prevent_patient_insert ON public.invoices
  FOR INSERT
  TO public
  USING (false)
  WITH CHECK (false);


