-- Add HPI structured data columns to consultations table
-- hpi_data: structured OLDCARTS/SOAP HPI template data (JSONB)
-- hpi_notes: free-text additional HPI notes (TEXT)

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS hpi_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hpi_notes TEXT DEFAULT NULL;
