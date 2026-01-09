-- Add detailed fields to patient_prep_checklists table
ALTER TABLE public.patient_prep_checklists 
ADD COLUMN IF NOT EXISTS allergies_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS medications_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS chief_complaint_data JSONB DEFAULT '{}'::jsonb;