import { z } from 'zod';

/**
 * Clinical Prescription Validation Schema
 * Enforces HIPAA-compliant, medically safe medication ordering per CareSync playbook
 */

// Severity levels for drug interactions
const INTERACTION_SEVERITY = z.enum(['contraindicated', 'major', 'moderate', 'minor']);

// Dosage calculation validation
const DOSAGE_PATTERNS = {
  mg: /^\d+(\.\d+)?$/,           // mg
  mcg: /^\d+(\.\d+)?$/,          // mcg
  ml: /^\d+(\.\d+)?$/,           // ml
  unit: /^\d+(\.\d+)?$/,         // units
  IU: /^\d+(\.\d+)?$/,           // international units
};

// Clinical frequency patterns - standard NIST medication administrations
const FREQUENCY_VALUES = [
  'once_daily',
  'twice_daily',
  'three_times_daily',
  'four_times_daily',
  'every_4_hours',
  'every_6_hours',
  'every_8_hours',
  'every_12_hours',
  'every_24_hours',
  'as_needed',
  'before_meals',
  'after_meals',
  'with_meals',
  'at_bedtime',
] as const;

// Duration validation - realistic medication courses
const DURATION_VALUES = [
  '3_days',
  '5_days',
  '7_days',
  '10_days',
  '14_days',
  '1_month',
  '2_months',
  '3_months',
  '6_months',
  'ongoing',
] as const;

// Route of administration per pharmacology standards
const DRUG_ROUTES = [
  'oral',
  'iv',
  'im',
  'sc',
  'topical',
  'inhaled',
  'rectal',
  'sublingual',
  'transdermal',
  'ophthalmic',
  'otic',
  'intranasal',
] as const;

// Drug interaction schema
export const DrugInteractionSchema = z.object({
  severity: INTERACTION_SEVERITY,
  drug: z.string().min(1, 'Drug name required'),
  description: z.string().min(10, 'Interaction description required'),
});

// Individual drug schema
export const DrugSchema = z.object({
  id: z.string().uuid('Invalid drug ID'),
  name: z.string().min(2, 'Drug name must be at least 2 characters'),
  genericName: z.string().min(2, 'Generic name required'),
  dosageForms: z.array(z.string()).min(1, 'At least one dosage form required'),
  strengths: z.array(z.string()).min(1, 'At least one strength required'),
  interactions: z.array(DrugInteractionSchema).optional().default([]),
  // Clinical properties for validation
  ageRestrictions: z.object({
    minAge: z.number().int().min(0).optional(),
    maxAge: z.number().int().max(150).optional(),
    category: z.enum(['pediatric', 'adult', 'geriatric', 'unrestricted']).optional(),
  }).optional(),
  pregnancyCategory: z.enum(['A', 'B', 'C', 'D', 'X', 'not_classified']).optional(),
  renalClearance: z.boolean().optional(),
  hepaticMetabolism: z.boolean().optional(),
});

// Prescription item (individual medication line in prescription)
export const PrescriptionItemSchema = z.object({
  id: z.string().uuid('Invalid item ID'),
  drug: DrugSchema,
  strength: z.string()
    .min(1, 'Strength/dose required')
    .regex(/^[\d.]+\s*(mg|mcg|ml|unit|IU)$/, 'Invalid strength format (e.g., "10 mg")'),
  dosage: z.string()
    .min(1, 'Dosage required')
    .describe('Numeric portion of strength (e.g., 10 from "10 mg")'),
  dosageUnit: z.enum(['mg', 'mcg', 'ml', 'unit', 'IU', 'percent', 'other'])
    .describe('Unit of measurement'),
  frequency: z.enum(FREQUENCY_VALUES),
  route: z.enum(DRUG_ROUTES),
  duration: z.enum(DURATION_VALUES),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(9999, 'Quantity exceeds maximum allowed'),
  refills: z.number()
    .int('Refills must be a whole number')
    .min(0, 'Refills cannot be negative')
    .max(11, 'Refills limited to 11 per DEA regulations')
    .default(0),
  instructions: z.string()
    .max(500, 'Instructions must not exceed 500 characters')
    .optional()
    .default(''),
  specialInstructions: z.string()
    .max(200, 'Special instructions must not exceed 200 characters')
    .optional()
    .default(''),
  notes: z.string()
    .max(500, 'Clinical notes must not exceed 500 characters')
    .optional(),
  // Validation flags
  skipDuplicationCheck: z.boolean().default(false),
  skipInteractionCheck: z.boolean().default(false),
}).refine(
  (item) => {
    // Ensure dosage numeric portion is valid
    const numericDosage = parseFloat(item.dosage);
    return !isNaN(numericDosage) && numericDosage > 0;
  },
  {
    message: 'Dosage must be a valid positive number',
    path: ['dosage'],
  }
);

// Full prescription schema
export const PrescriptionSchema = z.object({
  id: z.string().uuid('Invalid prescription ID').optional(),
  patientId: z.string().uuid('Invalid patient ID'),
  patientAge: z.number().int().min(0).max(150, 'Invalid patient age'),
  patientWeight: z.number().positive('Patient weight must be positive').optional(),
  patientPregnant: z.boolean().default(false).describe('Patient is pregnant'),
  patientLactating: z.boolean().default(false).describe('Patient is lactating'),
  patientAllergies: z.array(z.string()).default([]),
  patientRenal: z.enum(['normal', 'mild', 'moderate', 'severe']).default('normal'),
  patientHepatic: z.enum(['normal', 'mild', 'moderate', 'severe']).default('normal'),
  
  items: z.array(PrescriptionItemSchema)
    .min(1, 'At least one medication required')
    .max(20, 'Maximum 20 medications per prescription'),
  
  status: z.enum(['draft', 'pending', 'approved', 'dispensed', 'voided']).default('draft'),
  
  prescriber: z.object({
    id: z.string().uuid(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    licenseNumber: z.string().min(1),
    dea: z.string().optional(),
  }),
  
  facility: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    hospitalId: z.string().uuid(),
  }),
  
  pharmacy: z.object({
    id: z.string().uuid().optional(),
    name: z.string().optional(),
  }).optional(),
  
  createdAt: z.date().default(() => new Date()),
  signedAt: z.date().optional(),
  dispensedAt: z.date().optional(),
  voidedAt: z.date().optional(),
  voidReason: z.string().optional(),
}).refine(
  (prescription) => {
    // Validate pregnancy restrictions
    if (prescription.patientPregnant) {
      const hasXCategory = prescription.items.some(
        item => item.drug.pregnancyCategory === 'X'
      );
      if (hasXCategory) {
        return false; // Fail validation
      }
    }
    return true;
  },
  {
    message: 'Prescription contains Category X drugs contraindicated in pregnancy',
    path: ['items'],
  }
).refine(
  (prescription) => {
    // Check for therapeutic duplication within same prescription
    const drugsByClass = new Map<string, string[]>();
    
    prescription.items.forEach(item => {
      // In real impl, therapeutic class would come from drug database
      // This is simplified for demo
      const class_ = item.drug.id;
      if (!drugsByClass.has(class_)) {
        drugsByClass.set(class_, []);
      }
      drugsByClass.get(class_)!.push(item.drug.name);
    });
    
    // Flag if same drug class appears > once (unless explicitly allowed)
    for (const [_, drugs] of drugsByClass) {
      if (drugs.length > 1) {
        const allSkipped = prescription.items
          .filter(item => drugs.includes(item.drug.name))
          .every(item => item.skipDuplicationCheck);
        if (!allSkipped) {
          return false;
        }
      }
    }
    return true;
  },
  {
    message: 'Prescription contains therapeutic duplication. Override with skipDuplicationCheck flag',
    path: ['items'],
  }
);

// Type inference for form data
export type PrescriptionFormData = z.infer<typeof PrescriptionSchema>;
export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;
export type Drug = z.infer<typeof DrugSchema>;

/**
 * Utility: Extract age-appropriate dosage range from drug
 * Based on patient age and contraindications
 */
export function getAgeAppropriateStrengths(
  drug: Drug,
  patientAge: number
): string[] {
  if (!drug.ageRestrictions || !drug.ageRestrictions.category) {
    return drug.strengths;
  }

  const { minAge, maxAge, category } = drug.ageRestrictions;
  
  // Filter strengths based on age
  if (
    (minAge !== undefined && patientAge < minAge) ||
    (maxAge !== undefined && patientAge > maxAge)
  ) {
    return [];
  }
  
  return drug.strengths;
}

/**
 * Utility: Check if prescription is safe for clinical conditions
 */
export function validateClinicalSafety(
  items: PrescriptionItem[],
  patientAge: number,
  patientPregnant: boolean,
  patientLactating: boolean,
  patientAllergies: string[]
): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  items.forEach(item => {
    // Age check
    if (item.drug.ageRestrictions) {
      const { minAge, maxAge } = item.drug.ageRestrictions;
      if ((minAge && patientAge < minAge) || (maxAge && patientAge > maxAge)) {
        warnings.push(`${item.drug.name} not recommended for patient age ${patientAge}`);
      }
    }

    // Pregnancy check
    if (patientPregnant && item.drug.pregnancyCategory === 'X') {
      warnings.push(`${item.drug.name} is CONTRAINDICATED in pregnancy (Category X)`);
    }

    // Lactation check
    if (patientLactating && item.drug.pregnancyCategory === 'X') {
      warnings.push(`${item.drug.name} not safe during lactation`);
    }

    // Allergy check
    patientAllergies.forEach(allergy => {
      if (item.drug.name.toLowerCase().includes(allergy.toLowerCase()) ||
          item.drug.genericName.toLowerCase().includes(allergy.toLowerCase())) {
        warnings.push(`Patient allergic to ${item.drug.name}`);
      }
    });
  });

  return {
    safe: warnings.length === 0,
    warnings,
  };
}
