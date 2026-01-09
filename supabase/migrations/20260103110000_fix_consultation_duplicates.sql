-- Fix duplicate consultation creation issue
-- Add unique constraint to prevent multiple active consultations for same patient

-- First, clean up any existing duplicates (keep the latest one)
WITH duplicate_consultations AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY patient_id, doctor_id, status 
           ORDER BY created_at DESC
         ) as rn
  FROM public.consultations 
  WHERE status != 'completed'
)
DELETE FROM public.consultations 
WHERE id IN (
  SELECT id FROM duplicate_consultations WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.consultations 
ADD CONSTRAINT unique_active_consultation 
UNIQUE (patient_id, doctor_id, status) 
DEFERRABLE INITIALLY DEFERRED;