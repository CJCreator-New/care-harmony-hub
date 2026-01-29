-- Fix patient portal access issues by adding proper RLS policies
-- Migration: 20260129000001_fix_patient_portal_rls_policies.sql

-- Add patient access policy for appointments (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'appointments'
        AND policyname = 'Patients can view their own appointments'
    ) THEN
        CREATE POLICY "Patients can view their own appointments"
        ON public.appointments FOR SELECT
        USING (
            patient_id IN (
                SELECT id FROM public.patients WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Add patient access policy for prescriptions (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'prescriptions'
        AND policyname = 'Patients can view their own prescriptions'
    ) THEN
        CREATE POLICY "Patients can view their own prescriptions"
        ON public.prescriptions FOR SELECT
        USING (
            patient_id IN (
                SELECT id FROM public.patients WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- Add patient access policy for lab_results (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'lab_results'
        AND policyname = 'Patients can view their own lab results'
    ) THEN
        CREATE POLICY "Patients can view their own lab results"
        ON lab_results FOR SELECT
        USING (
            patient_id IN (
                SELECT id FROM patients WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;