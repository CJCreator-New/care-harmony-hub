-- Fix MRN format
UPDATE patients
SET mrn = 'MRN' || LPAD(SUBSTRING(mrn FROM 4), 8, '0')
WHERE mrn LIKE 'MRN%' AND LENGTH(mrn) < 11;

-- Fix gender mismatches based on first name
UPDATE patients
SET gender = 'female'
WHERE first_name IN ('Jane', 'Sarah', 'Emily', 'Lisa', 'Maria', 'Jennifer', 'Patricia', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica');

UPDATE patients
SET gender = 'male'
WHERE first_name IN ('John', 'Michael', 'David', 'Robert', 'James', 'William', 'Richard', 'Charles', 'Joseph', 'Thomas', 'Christopher', 'Daniel');

-- Remove "CJ_Creator's Org" from patients and cascade
DELETE FROM patients
WHERE first_name LIKE '%Creator%' OR last_name LIKE '%Creator%' OR first_name = 'CJ_Creator''s Org';

-- Remove duplicate patient_queue entries (keep earliest for each patient that is not completed)
DELETE FROM patient_queue
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY patient_id 
             ORDER BY created_at ASC
           ) as row_num
    FROM patient_queue
    WHERE status IN ('waiting', 'called', 'in_prep')
  ) t
  WHERE t.row_num > 1
);
