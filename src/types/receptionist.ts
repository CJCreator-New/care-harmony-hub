// Receptionist-specific types with 14 granular permissions and front desk workflows

export enum ReceptionistPermission {
  // Patient Registration (3)
  PATIENT_REGISTER = 'patient_register',
  PATIENT_UPDATE = 'patient_update',
  PATIENT_VERIFY = 'patient_verify',

  // Appointment Management (4)
  APPOINTMENT_CREATE = 'appointment_create',
  APPOINTMENT_MODIFY = 'appointment_modify',
  APPOINTMENT_CANCEL = 'appointment_cancel',
  APPOINTMENT_VIEW = 'appointment_view',

  // Check-in Operations (3)
  CHECKIN_PROCESS = 'checkin_process',
  CHECKOUT_PROCESS = 'checkout_process',
  INSURANCE_VERIFY = 'insurance_verify',

  // Queue Management (2)
  QUEUE_VIEW = 'queue_view',
  QUEUE_MANAGE = 'queue_manage',

  // Communication (1)
  PATIENT_COMMUNICATE = 'patient_communicate',

  // Analytics (1)
  METRICS_VIEW = 'metrics_view',
}

export interface PatientRegistration {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceInfo: InsuranceInfo;
  medicalHistory: string[];
  allergies: string[];
  medications: string[];
  registeredAt: Date;
  registeredBy: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface InsuranceInfo {
  provider: string;
  memberId: string;
  groupNumber: string;
  planName: string;
  copay: number;
  deductible: number;
  verifiedAt?: Date;
  verifiedBy?: string;
  status: 'verified' | 'pending' | 'invalid';
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  appointmentType: 'consultation' | 'follow_up' | 'procedure' | 'emergency';
  scheduledTime: Date;
  duration: number;
  roomNumber?: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckInRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  checkInTime: Date;
  checkInBy: string;
  insuranceVerified: boolean;
  formsCompleted: boolean;
  vitalsRecorded: boolean;
  waitingRoomAssigned: string;
  status: 'checked_in' | 'waiting' | 'called' | 'in_progress' | 'completed';
  notes?: string;
}

export interface CheckOutRecord {
  id: string;
  appointmentId: string;
  patientId: string;
  checkOutTime: Date;
  checkOutBy: string;
  billGenerated: boolean;
  nextAppointmentScheduled: boolean;
  dischargeSummaryProvided: boolean;
  status: 'completed' | 'pending_payment' | 'pending_followup';
  notes?: string;
}

export interface QueueStatus {
  totalPatients: number;
  waitingPatients: number;
  averageWaitTime: number;
  estimatedWaitTime: number;
  patients: QueuePatient[];
}

export interface QueuePatient {
  appointmentId: string;
  patientName: string;
  checkInTime: Date;
  estimatedCallTime: Date;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'waiting' | 'called' | 'in_progress';
  roomNumber?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  appointmentType: 'consultation' | 'follow_up' | 'procedure' | 'emergency';
  scheduledTime: Date;
  duration: number;
  roomNumber?: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleSlot {
  id: string;
  providerId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  isAvailable: boolean;
  appointmentType: string;
  roomNumber?: string;
}

export interface PatientCommunication {
  id: string;
  patientId: string;
  type: 'sms' | 'email' | 'phone' | 'app_notification';
  subject: string;
  message: string;
  sentAt: Date;
  sentBy: string;
  status: 'sent' | 'delivered' | 'failed' | 'read';
  readAt?: Date;
}

export interface ReceptionistMetrics {
  patientsProcessed: number;
  appointmentsScheduled: number;
  checkInsCompleted: number;
  averageCheckInTime: number;
  averageWaitTime: number;
  insuranceVerificationRate: number;
  appointmentAdherenceRate: number;
  patientSatisfactionScore: number;
  noShowRate: number;
  systemUptime: number;
}

export interface ReceptionistDashboard {
  todaySchedule: Appointment[];
  patientQueue: QueueStatus;
  checkInStations: CheckInStation[];
  performanceMetrics: ReceptionistMetrics;
  alerts: Alert[];
  quickActions: QuickAction[];
  upcomingAppointments: Appointment[];
}

export interface CheckInStation {
  id: string;
  stationNumber: number;
  status: 'available' | 'occupied' | 'maintenance';
  currentPatient?: string;
  averageProcessingTime: number;
  patientsProcessed: number;
}

export interface Alert {
  id: string;
  type: 'appointment_conflict' | 'no_show_risk' | 'insurance_issue' | 'patient_waiting' | 'system_alert';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  relatedAppointmentId?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  action: string;
  permission: ReceptionistPermission;
}

export interface ReceptionistUser {
  id: string;
  email: string;
  name: string;
  employeeId: string;
  department: string;
  shift: 'morning' | 'afternoon' | 'night';
  station?: number;
  permissions: ReceptionistPermission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchedulingConflict {
  id: string;
  appointmentId: string;
  conflictType: 'provider_overlap' | 'room_conflict' | 'resource_unavailable' | 'patient_conflict';
  severity: 'critical' | 'high' | 'medium';
  description: string;
  suggestedResolution?: string;
  timestamp: Date;
}

export interface NoShowPrediction {
  appointmentId: string;
  patientId: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  factors: string[];
  recommendedAction: string;
}
