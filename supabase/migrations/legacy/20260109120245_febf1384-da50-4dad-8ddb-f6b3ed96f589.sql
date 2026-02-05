-- Create ICD-10 codes reference table
CREATE TABLE IF NOT EXISTS public.icd10_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  long_description TEXT,
  category TEXT,
  chapter TEXT,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast code lookups
CREATE INDEX idx_icd10_codes_code ON public.icd10_codes(code);
CREATE INDEX idx_icd10_codes_search ON public.icd10_codes USING gin(to_tsvector('english', short_description || ' ' || COALESCE(long_description, '')));
CREATE INDEX idx_icd10_codes_category ON public.icd10_codes(category);

-- Add structured diagnoses column to consultations
ALTER TABLE public.consultations 
ADD COLUMN IF NOT EXISTS diagnoses JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN public.consultations.diagnoses IS 'Structured diagnoses: [{icd_code, description, type: primary|secondary|differential, notes}]';

-- Enable RLS on icd10_codes (read-only for authenticated users)
ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read ICD-10 codes
CREATE POLICY "ICD-10 codes are viewable by authenticated users"
ON public.icd10_codes
FOR SELECT
TO authenticated
USING (true);

-- Insert common ICD-10 codes for immediate use
INSERT INTO public.icd10_codes (code, short_description, long_description, category, chapter, is_billable) VALUES
-- Infectious Diseases
('A09', 'Infectious gastroenteritis and colitis', 'Infectious gastroenteritis and colitis, unspecified', 'Intestinal infectious diseases', 'I', true),
('B34.9', 'Viral infection, unspecified', 'Viral infection, unspecified', 'Other viral diseases', 'I', true),

-- Neoplasms
('C50.919', 'Malignant neoplasm of breast', 'Malignant neoplasm of unspecified site of unspecified female breast', 'Malignant neoplasms', 'II', true),
('D50.9', 'Iron deficiency anemia', 'Iron deficiency anemia, unspecified', 'Nutritional anemias', 'III', true),

-- Endocrine/Metabolic
('E03.9', 'Hypothyroidism', 'Hypothyroidism, unspecified', 'Thyroid disorders', 'IV', true),
('E04.9', 'Nontoxic goiter', 'Nontoxic goiter, unspecified', 'Thyroid disorders', 'IV', true),
('E11.9', 'Type 2 diabetes mellitus', 'Type 2 diabetes mellitus without complications', 'Diabetes mellitus', 'IV', true),
('E11.65', 'Type 2 DM with hyperglycemia', 'Type 2 diabetes mellitus with hyperglycemia', 'Diabetes mellitus', 'IV', true),
('E66.9', 'Obesity', 'Obesity, unspecified', 'Overweight and obesity', 'IV', true),
('E78.0', 'Pure hypercholesterolemia', 'Pure hypercholesterolemia, unspecified', 'Metabolic disorders', 'IV', true),
('E78.5', 'Hyperlipidemia', 'Hyperlipidemia, unspecified', 'Metabolic disorders', 'IV', true),
('E87.6', 'Hypokalemia', 'Hypokalemia', 'Metabolic disorders', 'IV', true),

-- Mental/Behavioral
('F32.9', 'Major depressive disorder', 'Major depressive disorder, single episode, unspecified', 'Mood disorders', 'V', true),
('F33.0', 'Major depressive disorder, recurrent', 'Major depressive disorder, recurrent, mild', 'Mood disorders', 'V', true),
('F41.1', 'Generalized anxiety disorder', 'Generalized anxiety disorder', 'Anxiety disorders', 'V', true),
('F41.9', 'Anxiety disorder', 'Anxiety disorder, unspecified', 'Anxiety disorders', 'V', true),
('F51.01', 'Primary insomnia', 'Primary insomnia', 'Sleep disorders', 'V', true),

-- Nervous System
('G43.909', 'Migraine', 'Migraine, unspecified, not intractable, without status migrainosus', 'Migraine', 'VI', true),
('G47.00', 'Insomnia', 'Insomnia, unspecified', 'Sleep disorders', 'VI', true),
('G89.29', 'Chronic pain', 'Other chronic pain', 'Pain', 'VI', true),

-- Eye/Ear
('H10.9', 'Conjunctivitis', 'Unspecified conjunctivitis', 'Conjunctiva disorders', 'VII', true),
('H66.90', 'Otitis media', 'Otitis media, unspecified, unspecified ear', 'Otitis media', 'VIII', true),

-- Circulatory System
('I10', 'Essential hypertension', 'Essential (primary) hypertension', 'Hypertensive diseases', 'IX', true),
('I20.9', 'Angina pectoris', 'Angina pectoris, unspecified', 'Ischemic heart diseases', 'IX', true),
('I25.10', 'Coronary artery disease', 'Atherosclerotic heart disease of native coronary artery without angina pectoris', 'Ischemic heart diseases', 'IX', true),
('I48.91', 'Atrial fibrillation', 'Unspecified atrial fibrillation', 'Cardiac arrhythmias', 'IX', true),
('I50.9', 'Heart failure', 'Heart failure, unspecified', 'Heart failure', 'IX', true),
('I63.9', 'Cerebral infarction', 'Cerebral infarction, unspecified', 'Cerebrovascular diseases', 'IX', true),

-- Respiratory System
('J00', 'Common cold', 'Acute nasopharyngitis (common cold)', 'Acute upper respiratory infections', 'X', true),
('J02.9', 'Acute pharyngitis', 'Acute pharyngitis, unspecified', 'Acute upper respiratory infections', 'X', true),
('J06.9', 'Upper respiratory infection', 'Acute upper respiratory infection, unspecified', 'Acute upper respiratory infections', 'X', true),
('J18.9', 'Pneumonia', 'Pneumonia, unspecified organism', 'Pneumonia', 'X', true),
('J20.9', 'Acute bronchitis', 'Acute bronchitis, unspecified', 'Bronchitis', 'X', true),
('J40', 'Bronchitis', 'Bronchitis, not specified as acute or chronic', 'Bronchitis', 'X', true),
('J44.1', 'COPD with acute exacerbation', 'Chronic obstructive pulmonary disease with acute exacerbation', 'COPD', 'X', true),
('J45.909', 'Asthma', 'Unspecified asthma, uncomplicated', 'Asthma', 'X', true),

-- Digestive System
('K21.0', 'GERD with esophagitis', 'Gastro-esophageal reflux disease with esophagitis', 'GERD', 'XI', true),
('K29.70', 'Gastritis', 'Gastritis, unspecified, without bleeding', 'Gastritis', 'XI', true),
('K30', 'Dyspepsia', 'Functional dyspepsia', 'Gastric disorders', 'XI', true),
('K58.9', 'Irritable bowel syndrome', 'Irritable bowel syndrome without diarrhea', 'Intestinal disorders', 'XI', true),
('K59.00', 'Constipation', 'Constipation, unspecified', 'Intestinal disorders', 'XI', true),

-- Skin
('L03.90', 'Cellulitis', 'Cellulitis, unspecified', 'Skin infections', 'XII', true),
('L30.9', 'Dermatitis', 'Dermatitis, unspecified', 'Dermatitis', 'XII', true),
('L70.0', 'Acne vulgaris', 'Acne vulgaris', 'Acne', 'XII', true),

-- Musculoskeletal
('M25.50', 'Joint pain', 'Pain in unspecified joint', 'Joint disorders', 'XIII', true),
('M54.2', 'Cervicalgia', 'Cervicalgia (neck pain)', 'Dorsopathies', 'XIII', true),
('M54.5', 'Low back pain', 'Low back pain', 'Dorsopathies', 'XIII', true),
('M79.3', 'Panniculitis', 'Panniculitis, unspecified', 'Soft tissue disorders', 'XIII', true),

-- Genitourinary
('N30.00', 'Acute cystitis', 'Acute cystitis without hematuria', 'Urinary system diseases', 'XIV', true),
('N39.0', 'Urinary tract infection', 'Urinary tract infection, site not specified', 'Urinary system diseases', 'XIV', true),
('N94.6', 'Dysmenorrhea', 'Dysmenorrhea, unspecified', 'Female genital disorders', 'XIV', true),

-- Pregnancy (Chapter XV - O codes)
('O80', 'Normal delivery', 'Encounter for full-term uncomplicated delivery', 'Delivery', 'XV', true),

-- Symptoms/Signs (R codes)
('R05', 'Cough', 'Cough', 'Respiratory symptoms', 'XVIII', true),
('R06.02', 'Shortness of breath', 'Shortness of breath', 'Respiratory symptoms', 'XVIII', true),
('R10.9', 'Abdominal pain', 'Unspecified abdominal pain', 'Abdominal symptoms', 'XVIII', true),
('R11.2', 'Nausea with vomiting', 'Nausea with vomiting, unspecified', 'GI symptoms', 'XVIII', true),
('R50.9', 'Fever', 'Fever, unspecified', 'General symptoms', 'XVIII', true),
('R51', 'Headache', 'Headache', 'Nervous system symptoms', 'XVIII', true),
('R53.83', 'Fatigue', 'Other fatigue', 'General symptoms', 'XVIII', true),
('R63.4', 'Abnormal weight loss', 'Abnormal weight loss', 'Nutritional symptoms', 'XVIII', true),

-- Injury/External Causes
('S00.93XA', 'Head contusion', 'Contusion of unspecified part of head, initial encounter', 'Head injuries', 'XIX', true),
('S61.409A', 'Hand laceration', 'Unspecified open wound of unspecified hand, initial encounter', 'Hand injuries', 'XIX', true),

-- Health Status/Services (Z codes)
('Z00.00', 'General adult exam', 'Encounter for general adult medical examination without abnormal findings', 'General examinations', 'XXI', true),
('Z00.129', 'Child routine exam', 'Encounter for routine child health examination without abnormal findings', 'General examinations', 'XXI', true),
('Z12.31', 'Colonoscopy screening', 'Encounter for screening mammogram for malignant neoplasm of breast', 'Screening exams', 'XXI', true),
('Z23', 'Immunization encounter', 'Encounter for immunization', 'Preventive care', 'XXI', true),
('Z71.3', 'Dietary counseling', 'Dietary counseling and surveillance', 'Counseling', 'XXI', true),
('Z79.4', 'Long-term insulin use', 'Long term (current) use of insulin', 'Medication management', 'XXI', true),
('Z87.891', 'History of nicotine dependence', 'Personal history of nicotine dependence', 'Personal history', 'XXI', true)
ON CONFLICT (code) DO NOTHING;