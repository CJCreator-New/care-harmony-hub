// Input Validation Schemas for Edge Functions
// BE-002: Add Zod schema validation

import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);
export const dateSchema = z.string().datetime();

// AI Clinical Support
export const aiClinicalSupportSchema = z.object({
  patientId: uuidSchema,
  symptoms: z.array(z.string()).min(1),
  vitalSigns: z.object({
    temperature: z.number().optional(),
    bloodPressure: z.string().optional(),
    heartRate: z.number().optional(),
  }).optional(),
});

// FHIR Integration
export const fhirPatientSchema = z.object({
  patientId: uuidSchema,
  action: z.enum(['export', 'import', 'sync']),
  resourceType: z.enum(['Patient', 'Observation', 'Encounter']).optional(),
});

// Insurance Integration
export const insuranceClaimSchema = z.object({
  patientId: uuidSchema,
  invoiceId: uuidSchema,
  claimType: z.enum(['professional', 'institutional']),
  serviceDate: dateSchema,
});

// Symptom Analysis
export const symptomAnalysisSchema = z.object({
  symptoms: z.array(z.string()).min(1).max(20),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

// Notification
export const notificationSchema = z.object({
  userId: uuidSchema,
  type: z.enum(['email', 'sms', 'push']),
  message: z.string().min(1).max(1000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

// Helper function to validate request body
export async function validateRequest<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid JSON body' };
  }
}

// Create validation error response
export function validationErrorResponse(error: string): Response {
  return new Response(
    JSON.stringify({ error: 'Validation failed', details: error }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
