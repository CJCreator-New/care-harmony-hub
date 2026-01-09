export interface ICD10Code {
  id: string;
  code: string;
  short_description: string;
  long_description?: string;
  category?: string;
  chapter?: string;
  is_billable: boolean;
}

export interface StructuredDiagnosis {
  id: string;
  icd_code: string;
  description: string;
  type: 'primary' | 'secondary' | 'differential' | 'rule-out';
  notes?: string;
  added_at: string;
}

export const DIAGNOSIS_TYPES = [
  { value: 'primary', label: 'Primary', description: 'Main diagnosis for the visit' },
  { value: 'secondary', label: 'Secondary', description: 'Additional active diagnoses' },
  { value: 'differential', label: 'Differential', description: 'Possible diagnoses to consider' },
  { value: 'rule-out', label: 'Rule Out', description: 'Diagnoses to exclude' },
] as const;

export const ICD10_CHAPTERS = [
  { code: 'I', name: 'Infectious and Parasitic Diseases', range: 'A00-B99' },
  { code: 'II', name: 'Neoplasms', range: 'C00-D49' },
  { code: 'III', name: 'Blood and Immune Mechanism', range: 'D50-D89' },
  { code: 'IV', name: 'Endocrine, Nutritional and Metabolic', range: 'E00-E89' },
  { code: 'V', name: 'Mental and Behavioral Disorders', range: 'F01-F99' },
  { code: 'VI', name: 'Nervous System', range: 'G00-G99' },
  { code: 'VII', name: 'Eye and Adnexa', range: 'H00-H59' },
  { code: 'VIII', name: 'Ear and Mastoid Process', range: 'H60-H95' },
  { code: 'IX', name: 'Circulatory System', range: 'I00-I99' },
  { code: 'X', name: 'Respiratory System', range: 'J00-J99' },
  { code: 'XI', name: 'Digestive System', range: 'K00-K95' },
  { code: 'XII', name: 'Skin and Subcutaneous Tissue', range: 'L00-L99' },
  { code: 'XIII', name: 'Musculoskeletal System', range: 'M00-M99' },
  { code: 'XIV', name: 'Genitourinary System', range: 'N00-N99' },
  { code: 'XV', name: 'Pregnancy, Childbirth', range: 'O00-O9A' },
  { code: 'XVI', name: 'Perinatal Period', range: 'P00-P96' },
  { code: 'XVII', name: 'Congenital Malformations', range: 'Q00-Q99' },
  { code: 'XVIII', name: 'Symptoms, Signs, Abnormal Findings', range: 'R00-R99' },
  { code: 'XIX', name: 'Injury, Poisoning', range: 'S00-T88' },
  { code: 'XX', name: 'External Causes of Morbidity', range: 'V00-Y99' },
  { code: 'XXI', name: 'Health Status and Services', range: 'Z00-Z99' },
] as const;
