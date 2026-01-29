import { z } from 'zod';

// LOINC Code schema
export const LOINCCodeSchema = z.object({
  code: z.string(),
  component: z.string(),
  property: z.string().optional(),
  time_aspect: z.string().optional(),
  system_type: z.string().optional(),
  scale_type: z.string().optional(),
  method_type: z.string().optional(),
  class: z.string().optional(),
  reference_range: z.object({
    male: z.string().optional(),
    female: z.string().optional(),
    normal: z.string().optional(),
    pediatric: z.string().optional(),
  }).optional(),
  critical_values: z.object({
    low: z.string().optional(),
    high: z.string().optional(),
    panic_low: z.string().optional(),
    panic_high: z.string().optional(),
  }).optional(),
  units: z.string().optional(),
  specimen_type: z.string().optional(),
  created_at: z.string().datetime(),
});

// Lab Result schema
export const LabResultSchema = z.object({
  id: z.string().uuid(),
  lab_order_id: z.string().uuid(),
  loinc_code: z.string().optional(),
  result_value: z.string(),
  result_numeric: z.number().optional(),
  result_unit: z.string().optional(),
  reference_range: z.string().optional(),
  abnormal_flag: z.enum(['H', 'L', 'HH', 'LL', 'A']).nullable(),
  critical_flag: z.boolean(),
  result_status: z.enum(['preliminary', 'final', 'corrected', 'cancelled']),
  performed_at: z.string().datetime(),
  verified_at: z.string().datetime().optional(),
  verified_by: z.string().uuid().optional(),
  interpretation: z.string().optional(),
  hospital_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

// Enhanced Lab Order schema
export const LabOrderSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  test_name: z.string(),
  loinc_code: z.string().optional(),
  specimen_collected_at: z.string().datetime().optional(),
  specimen_type: z.string().optional(),
  collection_notes: z.string().optional(),
  priority: z.enum(['routine', 'urgent', 'stat']),
  status: z.enum(['ordered', 'collected', 'processing', 'completed', 'cancelled']),
  notes: z.string().optional(),
  hospital_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Critical Value Notification schema
export const CriticalValueNotificationSchema = z.object({
  id: z.string().uuid(),
  lab_result_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  loinc_code: z.string().optional(),
  critical_value: z.string(),
  notification_level: z.number().min(1).max(3),
  notified_at: z.string().datetime(),
  acknowledged_at: z.string().datetime().optional(),
  acknowledged_by: z.string().uuid().optional(),
  read_back_verified: z.boolean(),
  escalation_level: z.number(),
  escalated_at: z.string().datetime().optional(),
  resolution_notes: z.string().optional(),
  hospital_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

// Specimen Tracking schema
export const SpecimenTrackingSchema = z.object({
  specimen_id: z.string().uuid(),
  lab_order_id: z.string().uuid(),
  collection_time: z.string().datetime(),
  collected_by: z.string().uuid(),
  specimen_type: z.string(),
  collection_site: z.string().optional(),
  transport_conditions: z.string(),
  received_time: z.string().datetime().optional(),
  received_by: z.string().uuid().optional(),
  processing_started: z.string().datetime().optional(),
  quality_assessment: z.object({
    adequate_volume: z.boolean(),
    proper_labeling: z.boolean(),
    integrity_maintained: z.boolean(),
    temperature_controlled: z.boolean(),
    rejection_reason: z.string().optional(),
  }),
  chain_of_custody: z.array(z.object({
    timestamp: z.string().datetime(),
    handler: z.string().uuid(),
    action: z.string(),
    location: z.string(),
  })),
});

// Lab QC Result schema
export const LabQCResultSchema = z.object({
  id: z.string().uuid(),
  loinc_code: z.string(),
  qc_level: z.enum(['normal', 'abnormal_low', 'abnormal_high']),
  expected_value: z.number(),
  actual_value: z.number(),
  variance_percent: z.number(),
  within_limits: z.boolean(),
  run_date: z.string().datetime(),
  instrument_id: z.string().optional(),
  lot_number: z.string().optional(),
  technician_id: z.string().uuid().optional(),
  hospital_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

// Lab Instrument schema
export const LabInstrumentSchema = z.object({
  instrument_id: z.string(),
  instrument_name: z.string(),
  manufacturer: z.string(),
  model: z.string(),
  serial_number: z.string(),
  supported_tests: z.array(z.string()), // LOINC codes
  calibration_status: z.enum(['current', 'due', 'overdue']),
  last_calibration: z.string().datetime(),
  next_calibration_due: z.string().datetime(),
  maintenance_status: z.enum(['operational', 'maintenance', 'down']),
  quality_control_status: z.enum(['passing', 'failing', 'pending']),
  location: z.string(),
  hospital_id: z.string().uuid(),
});

// Result Validation schema
export const ResultValidationSchema = z.object({
  result_id: z.string().uuid(),
  validation_rules_applied: z.array(z.string()),
  validation_status: z.enum(['passed', 'failed', 'requires_review']),
  validation_flags: z.array(z.object({
    flag_type: z.enum(['range', 'delta', 'pattern', 'technical']),
    severity: z.enum(['info', 'warning', 'error']),
    message: z.string(),
    auto_resolvable: z.boolean(),
  })),
  manual_review_required: z.boolean(),
  validated_by: z.string().uuid().optional(),
  validated_at: z.string().datetime().optional(),
});

// Type definitions
export type LOINCCode = z.infer<typeof LOINCCodeSchema>;
export type LabResult = z.infer<typeof LabResultSchema>;
export type LabOrder = z.infer<typeof LabOrderSchema>;
export type CriticalValueNotification = z.infer<typeof CriticalValueNotificationSchema>;
export type SpecimenTracking = z.infer<typeof SpecimenTrackingSchema>;
export type LabQCResult = z.infer<typeof LabQCResultSchema>;
export type LabInstrument = z.infer<typeof LabInstrumentSchema>;
export type ResultValidation = z.infer<typeof ResultValidationSchema>;