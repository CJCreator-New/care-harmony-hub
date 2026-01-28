import { z } from 'zod';

// Base appointment schema
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  appointment_type: z.string().min(1).max(100),
  scheduled_at: z.string().datetime(),
  duration: z.number().int().positive().max(480), // max 8 hours
  status: z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']),
  notes: z.string().optional(),
  reason_for_visit: z.string().min(1).max(500),
  location: z.string().optional(),
  virtual_meeting_link: z.string().url().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid(),
});

// Availability slot schema
export const AvailabilitySlotSchema = z.object({
  id: z.string().uuid(),
  provider_id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  is_available: z.boolean().default(true),
  recurrence_rule: z.string().optional(), // iCal RRULE format
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Scheduling rule schema
export const SchedulingRuleSchema = z.object({
  id: z.string().uuid(),
  provider_id: z.string().uuid().optional(), // null for global rules
  hospital_id: z.string().uuid(),
  rule_type: z.enum(['buffer_time', 'max_appointments_per_day', 'working_hours', 'blocked_periods']),
  rule_value: z.string(), // JSON string with rule-specific data
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Appointment creation schema
export const CreateAppointmentSchema = AppointmentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
});

// Appointment update schema
export const UpdateAppointmentSchema = CreateAppointmentSchema.partial();

// Availability slot creation schema
export const CreateAvailabilitySlotSchema = AvailabilitySlotSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Scheduling rule creation schema
export const CreateSchedulingRuleSchema = SchedulingRuleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Search/filter schemas
export const AppointmentSearchSchema = z.object({
  hospital_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  provider_id: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).optional(),
  appointment_type: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sort_by: z.enum(['scheduled_at', 'created_at', 'updated_at']).default('scheduled_at'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export const AvailabilitySearchSchema = z.object({
  provider_id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

// Type definitions
export type Appointment = z.infer<typeof AppointmentSchema>;
export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;
export type SchedulingRule = z.infer<typeof SchedulingRuleSchema>;
export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;
export type CreateAvailabilitySlot = z.infer<typeof CreateAvailabilitySlotSchema>;
export type CreateSchedulingRule = z.infer<typeof CreateSchedulingRuleSchema>;
export type AppointmentSearch = z.infer<typeof AppointmentSearchSchema>;
export type AvailabilitySearch = z.infer<typeof AvailabilitySearchSchema>;

// API response types
export interface AppointmentResponse {
  data: Appointment;
  success: true;
}

export interface AppointmentsResponse {
  data: Appointment[];
  total: number;
  limit: number;
  offset: number;
  success: true;
}

export interface AvailabilityResponse {
  data: AvailabilitySlot[];
  success: true;
}

export interface SchedulingRulesResponse {
  data: SchedulingRule[];
  success: true;
}

// Error response type
export interface ErrorResponse {
  error: string;
  message: string;
  success: false;
  code?: string;
}

// Common API response union
export type ApiResponse<T> = T | ErrorResponse;