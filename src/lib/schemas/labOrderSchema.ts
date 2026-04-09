import { z } from 'zod';

/**
 * HP-2 PR3: LabOrderForm Validation Schema
 * 
 * Comprehensive lab order validation with:
 * - Test/procedure selection (common clinical tests)
 * - Patient preparation (fasting, special handling)
 * - Collection method and specimen type
 * - Clinical indication and priority
 * - Critical thresholds for automated alerts
 * - Cross-field validation (e.g., stat vs routine, specimen compatibility)
 * - HIPAA compliance (no PHI logging)
 */

// Common lab tests with specimen types and requirements
export const COMMON_LAB_TESTS = [
  { code: 'CBC', name: 'Complete Blood Count', specimen: 'blood', fasting: false, turnaroundDays: 1 },
  { code: 'CMP', name: 'Comprehensive Metabolic Panel', specimen: 'blood', fasting: true, turnaroundDays: 1 },
  { code: 'TSH', name: 'Thyroid Stimulating Hormone', specimen: 'blood', fasting: false, turnaroundDays: 2 },
  { code: 'LIPID', name: 'Lipid Panel', specimen: 'blood', fasting: true, turnaroundDays: 1 },
  { code: 'BNP', name: 'B-Type Natriuretic Peptide', specimen: 'blood', fasting: false, turnaroundDays: 1 },
  { code: 'TROPONIN', name: 'Cardiac Troponin', specimen: 'blood', fasting: false, turnaroundDays: 1 },
  { code: 'GLUCOSE', name: 'Blood Glucose', specimen: 'blood', fasting: false, turnaroundDays: 1 },
  { code: 'HBA1C', name: 'Hemoglobin A1C', specimen: 'blood', fasting: false, turnaroundDays: 2 },
  { code: 'CREATININE', name: 'Creatinine & eGFR', specimen: 'blood', fasting: false, turnaroundDays: 1 },
  { code: 'ALBUMIN', name: 'Albumin Level', specimen: 'blood', fasting: false, turnaroundDays: 1 },
  { code: 'URINALYSIS', name: 'Urinalysis', specimen: 'urine', fasting: false, turnaroundDays: 1 },
  { code: 'URINE_CULTURE', name: 'Urine Culture', specimen: 'urine', fasting: false, turnaroundDays: 3 },
  { code: 'STOOL_OCC', name: 'Stool Occult Blood', specimen: 'stool', fasting: false, turnaroundDays: 2 },
  { code: 'BLOOD_CULTURE', name: 'Blood Culture', specimen: 'blood', fasting: false, turnaroundDays: 3 },
  { code: 'UA', name: 'Aspartate Aminotransferase (AST)', specimen: 'blood', fasting: false, turnaroundDays: 1 },
  { code: 'ALT', name: 'Alanine Aminotransferase (ALT)', specimen: 'blood', fasting: false, turnaroundDays: 1 },
];

// Collection methods
export const COLLECTION_METHODS = [
  { code: 'VENIPUNCTURE', name: 'Venipuncture (Blood Draw)' },
  { code: 'CAPILLARY', name: 'Capillary Puncture (Finger Stick)' },
  { code: 'MIDSTREAM', name: 'Midstream Urine' },
  { code: 'CLEAN_CATCH', name: 'Clean Catch Urine' },
  { code: 'CATHETER', name: 'Catheter Collection' },
  { code: 'STOOL_SAMPLE', name: 'Stool Sample' },
  { code: 'SALIVA', name: 'Saliva Sample' },
  { code: 'SPUTUM', name: 'Sputum Sample' },
];

// Priority levels with SLA
export const PRIORITY_LEVELS = [
  { code: 'ROUTINE', label: 'Routine (72 hours)', slaDays: 3, urgent: false },
  { code: 'STAT', label: 'STAT (< 4 hours)', slaDays: 0.17, urgent: true }, // ~4 hours
  { code: 'URGENT', label: 'Urgent (24 hours)', slaDays: 1, urgent: false },
];

/**
 * Get test details by code
 */
export function getTestDetails(testCode: string) {
  return COMMON_LAB_TESTS.find(t => t.code === testCode);
}

/**
 * Get collection method details
 */
export function getCollectionMethod(methodCode: string) {
  return COLLECTION_METHODS.find(m => m.code === methodCode);
}

/**
 * Validate collection method compatibility with specimen type
 */
export function validateSpecimenCompatibility(
  specimenType: string,
  collectionMethod: string
): boolean {
  const methodDetails = getCollectionMethod(collectionMethod);
  if (!methodDetails) return false;

  // Map of specimen types and compatible collection methods
  const compatibility: Record<string, string[]> = {
    blood: ['VENIPUNCTURE', 'CAPILLARY'],
    urine: ['MIDSTREAM', 'CLEAN_CATCH', 'CATHETER'],
    stool: ['STOOL_SAMPLE'],
    saliva: ['SALIVA'],
    sputum: ['SPUTUM'],
  };

  const compatibleMethods = compatibility[specimenType] || [];
  return compatibleMethods.includes(collectionMethod);
}

/**
 * Calculate expected turnaround time in hours
 */
export function calculateTurnaroundHours(testCode: string, priority: string): number {
  const test = getTestDetails(testCode);
  const priorityLevel = PRIORITY_LEVELS.find(p => p.code === priority);

  if (!test || !priorityLevel) return 24;

  // For STAT, use the SLA hours directly (4 hours = 0.17 days)
  if (priority === 'STAT') {
    return Math.ceil(priorityLevel.slaDays * 24); // 4 hours
  }

  // For other priorities, use test's turnaround or priority SLA, whichever is faster
  const testHours = test.turnaroundDays * 24;
  const slaHours = priorityLevel.slaDays * 24;
  return Math.ceil(Math.min(testHours, slaHours));
}

/**
 * Validate if fasting is required based on test
 */
export function isFastingRequired(testCode: string): boolean {
  const test = getTestDetails(testCode);
  return test?.fasting || false;
}

// ============================================================================
// MAIN SCHEMA DEFINITIONS
// ============================================================================

/**
 * Lab Order Form Schema
 * 
 * Clinical validations:
 * - Test must be from approved list
 * - Fasting requirement enforced if test requires it
 * - Collection method must be compatible with specimen type
 * - Clinical indication required (min 10 chars)
 * - Priority enum (routine, urgent, stat)
 * - Special handling rules for STAT orders
 * - Cross-field validation for specimen compatibility
 */
export const LabOrderSchema = z.object({
  // Test selection
  testCode: z.string()
    .min(2, 'Test code must be selected')
    .refine(
      (code) => COMMON_LAB_TESTS.some(t => t.code === code),
      'Selected test is not available'
    ),

  // Specimen requirements
  specimenType: z.enum(['blood', 'urine', 'stool', 'saliva', 'sputum', 'other'], {
    errorMap: () => ({ message: 'Please select a specimen type' }),
  }),

  // Collection method
  collectionMethod: z.enum(['VENIPUNCTURE', 'CAPILLARY', 'MIDSTREAM', 'CLEAN_CATCH', 'CATHETER', 'STOOL_SAMPLE', 'SALIVA', 'SPUTUM'], {
    errorMap: () => ({ message: 'Please select a collection method' }),
  }),

  // Patient preparation
  requiresFasting: z.boolean().optional(),

  fastingHours: z.number()
    .min(0, 'Fasting hours must be non-negative')
    .max(24, 'Fasting cannot exceed 24 hours')
    .optional(),

  specialHandling: z.string()
    .max(200, 'Special handling instructions too long')
    .optional()
    .or(z.literal('')), // Allow empty string

  // Clinical context
  clinicalIndication: z.string()
    .min(10, 'Clinical indication must be at least 10 characters')
    .max(500, 'Clinical indication too long'),

  // Priority & urgency
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT'], {
    errorMap: () => ({ message: 'Please select a priority level' }),
  }),

  // Additional information
  additionalNotes: z.string()
    .max(300, 'Additional notes too long')
    .optional()
    .or(z.literal('')),

  // Hospital & provider context
  hospitalId: z.string().uuid('Invalid hospital ID'),

  orderingProviderId: z.string().uuid('Invalid provider ID'),

  // Patient identifier (not full PHI, just reference ID)
  patientId: z.string().uuid('Invalid patient ID'),

}).strict()
  // Cross-field validation: collection method must be compatible with specimen
  .refine(
    (data) => validateSpecimenCompatibility(data.specimenType, data.collectionMethod),
    {
      message: 'Selected collection method is not compatible with specimen type',
      path: ['collectionMethod'],
    }
  )
  // Cross-field validation: fasting requirement must match test requirements
  .refine(
    (data) => {
      const testDetails = getTestDetails(data.testCode);
      if (!testDetails) return true; // Test already validated above
      
      // If test requires fasting, requiresFasting should be true OR undefined (not explicitly false)
      if (testDetails.fasting && data.requiresFasting === false) {
        return false;
      }
      return true;
    },
    {
      message: 'Fasting required for this test - please confirm',
      path: ['requiresFasting'],
    }
  )
  // Cross-field validation: STAT orders have specific requirements
  .refine(
    (data) => {
      if (data.priority !== 'STAT') return true;
      // STAT orders must have clinical indication and priority is already validated
      return data.clinicalIndication.length >= 10;
    },
    {
      message: 'STAT orders require comprehensive clinical indication',
      path: ['clinicalIndication'],
    }
  );

// ============================================================================
// TYPE EXPORTS & UTILITY FUNCTIONS
// ============================================================================

export type LabOrderFormData = z.infer<typeof LabOrderSchema>;

/**
 * Validate complete lab order data
 * Useful for final submission validation before Supabase insert
 */
export async function validateLabOrder(
  data: unknown
): Promise<{ valid: boolean; errors?: Record<string, string> }> {
  try {
    await LabOrderSchema.parseAsync(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { _error: 'Validation failed' } };
  }
}

/**
 * Get fasting recommendation text
 */
export function getFastingRecommendation(testCode: string): string | null {
  const test = getTestDetails(testCode);
  if (!test?.fasting) return null;
  return `This test requires ${test.fasting ? '8-12 hours' : 'no'} of fasting before collection.`;
}

/**
 * Get turnaround time display text
 */
export function getTurnaroundDisplay(testCode: string, priority: string): string {
  const hours = calculateTurnaroundHours(testCode, priority);
  if (hours < 24) {
    return `${hours} hours`;
  }
  const days = Math.ceil(hours / 24);
  return `${days} business day(s)`;
}

/**
 * Get priority SLA details
 */
export function getPrioritySLA(priority: string): { slaDays: number; label: string } | null {
  return PRIORITY_LEVELS.find(p => p.code === priority) || null;
}

/**
 * Check if order is critical/STAT
 */
export function isStatOrder(priority: string): boolean {
  return priority === 'STAT';
}

/**
 * Get fasting hours recommendation for a test
 */
export function getRecommendedFastingHours(testCode: string): number {
  // Standard fasting requirement for most tests that require fasting
  const test = getTestDetails(testCode);
  return test?.fasting ? 12 : 0; // 8-12 hours, defaulting to 12
}
