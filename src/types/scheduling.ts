// Phase 3: Receptionist & Scheduling Types
// Multi-Resource Scheduling, Waitlist Management, Insurance Verification

export interface ResourceType {
  id: string;
  name: string;
  description?: string;
  category: 'room' | 'equipment' | 'vehicle';
  requires_booking: boolean;
  hospital_id: string;
  created_at: string;
}

export interface HospitalResource {
  id: string;
  name: string;
  resource_type: string;
  status: string;
  capacity?: number;
  floor?: string;
  wing?: string;
  booking_buffer_minutes: number;
  max_booking_duration_hours: number;
  requires_approval: boolean;
  resource_type_id?: string;
  hospital_id: string;
}

export interface ResourceBooking {
  id: string;
  resource_id: string;
  appointment_id?: string;
  booked_by: string;
  hospital_id: string;
  start_time: string;
  end_time: string;
  purpose?: string;
  notes?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentWaitlist {
  id: string;
  patient_id: string;
  doctor_id?: string;
  hospital_id: string;
  preferred_date_start?: string;
  preferred_date_end?: string;
  preferred_times: string[];
  appointment_type: string;
  reason_for_visit?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  urgency_level: number; // 1-5
  contact_method: 'phone' | 'email' | 'sms' | 'portal';
  auto_book: boolean;
  max_notice_hours: number;
  status: 'active' | 'notified' | 'booked' | 'expired' | 'cancelled';
  notified_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringAppointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  hospital_id: string;
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_value: number;
  days_of_week?: number[]; // [1,3,5] = Mon,Wed,Fri
  day_of_month?: number;
  appointment_type: string;
  duration_minutes: number;
  preferred_time?: string;
  reason_for_visit?: string;
  series_start_date: string;
  series_end_date?: string;
  max_occurrences?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  last_generated_date?: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceVerification {
  id: string;
  patient_id: string;
  appointment_id?: string;
  hospital_id: string;
  insurance_provider: string;
  policy_number?: string;
  group_number?: string;
  member_id?: string;
  verification_status: 'pending' | 'verified' | 'failed' | 'expired';
  verified_at?: string;
  verified_by?: string;
  copay_amount?: number;
  deductible_amount?: number;
  deductible_met?: number;
  coverage_percentage?: number;
  requires_authorization: boolean;
  authorization_number?: string;
  authorization_expires_at?: string;
  verification_response?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PreRegistrationForm {
  id: string;
  patient_id: string;
  appointment_id?: string;
  hospital_id: string;
  form_data: PreRegistrationData;
  form_version: string;
  status: 'sent' | 'in_progress' | 'completed' | 'expired';
  sent_at: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  patient_signature?: string;
  consent_signatures?: ConsentSignature[];
  created_at: string;
  updated_at: string;
}

export interface PreRegistrationData {
  personal_info: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  insurance_info: {
    primary_insurance: string;
    policy_number: string;
    group_number: string;
    subscriber_name: string;
    relationship: string;
  };
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medical_history: {
    allergies: string[];
    current_medications: string[];
    medical_conditions: string[];
    previous_surgeries: string[];
  };
  reason_for_visit: string;
  symptoms: string[];
  preferred_pharmacy: string;
}

export interface ConsentSignature {
  form_type: string;
  form_title: string;
  signature: string;
  signed_at: string;
  ip_address?: string;
}

export interface AppointmentBufferRule {
  id: string;
  hospital_id: string;
  appointment_type?: string;
  doctor_id?: string;
  department_id?: string;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  cleanup_time_minutes: number;
  max_consecutive_appointments?: number;
  required_break_minutes?: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface SchedulingSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  doctor_available: boolean;
  resources_available: ResourceAvailability[];
  conflicts?: SchedulingConflict[];
}

export interface ResourceAvailability {
  resource_id: string;
  resource_name: string;
  resource_type: string;
  available: boolean;
  booking_id?: string;
  conflict_reason?: string;
}

export interface SchedulingConflict {
  type: 'doctor_unavailable' | 'resource_conflict' | 'buffer_violation' | 'holiday';
  description: string;
  conflicting_appointment_id?: string;
  conflicting_booking_id?: string;
}

export interface MultiResourceBookingRequest {
  patient_id: string;
  doctor_id: string;
  appointment_type: string;
  start_time: string;
  duration_minutes: number;
  required_resources: string[]; // Resource IDs
  preferred_resources?: string[]; // Optional preferred resources
  reason_for_visit?: string;
  notes?: string;
}

export interface WaitlistNotification {
  waitlist_id: string;
  patient_id: string;
  available_slot: SchedulingSlot;
  notification_method: 'phone' | 'email' | 'sms' | 'portal';
  expires_at: string;
  response_required_by: string;
}

export const APPOINTMENT_TYPES = [
  'New Patient Consultation',
  'Follow-up Visit',
  'Annual Physical',
  'Procedure',
  'Lab Work',
  'Imaging',
  'Vaccination',
  'Urgent Care',
  'Telemedicine'
] as const;

export const RECURRENCE_PATTERNS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
] as const;

export const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' }
] as const;

export const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone Call', icon: 'Phone' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'sms', label: 'Text Message', icon: 'MessageSquare' },
  { value: 'portal', label: 'Patient Portal', icon: 'Globe' }
] as const;