-- Normalize MRN format: ensure all MRNs use 8-digit zero-padded format (MRN00000001 … MRN99999999)
-- Fixes Admin #29 / DATA-03: inconsistent MRN lengths in existing seed/test data

UPDATE public.patients
SET mrn = 'MRN' || LPAD(
  CAST(NULLIF(REGEXP_REPLACE(mrn, '^MRN', ''), '') AS TEXT),
  8,
  '0'
)
WHERE mrn ~ '^MRN\d+$'         -- only standard auto-generated MRNs
  AND length(mrn) <> 11;        -- skip those already in the correct 11-char format (MRN + 8 digits)
