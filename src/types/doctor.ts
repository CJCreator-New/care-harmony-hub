// Doctor Role Enhanced Types
import { UserRole } from './auth';

export enum DoctorPermission {
  // Consultation
  CONSULTATION_CREATE = 'consultation:create',
  CONSULTATION_READ = 'consultation:read',
  CONSULTATION_UPDATE = 'consultation:update',
  CONSULTATION_CLOSE = 'consultation:close',
  
  // Prescription
  PRESCRIPTION_CREATE = 'prescription:create',
  PRESCRIPTION_READ = 'prescription:read',
  PRESCRIPTION_MODIFY = 'prescription:modify',
  PRESCRIPTION_CANCEL = 'prescription:cancel',
  
  // Lab Orders
  LAB_ORDER_CREATE = 'lab:order:create',
  LAB_ORDER_READ = 'lab:order:read',
  LAB_RESULT_VIEW = 'lab:result:view',
  
  // Patient Access
  PATIENT_READ_ALL = 'patient:read:all',
  PATIENT_UPDATE = 'patient:update',
  PATIENT_HISTORY = 'patient:history:read',
  
  // Analytics
  ANALYTICS_VIEW_DEPT = 'analytics:view:department',
  ANALYTICS_PERSONAL = 'analytics:personal',
  
  // Queue Management
  QUEUE_READ = 'queue:read',
  QUEUE_MANAGE = 'queue:manage',
  
  // Telemedicine
  TELEMEDICINE_READ = 'telemedicine:read',
  TELEMEDICINE_WRITE = 'telemedicine:write',
}

export interface DoctorDashboard {
  todaySchedule: Consultation[];
  urgentCases: Patient[];
  patientQueue: QueueItem[];
  performanceMetrics: DoctorMetrics;
  departmentAlerts: Alert[];
}

export interface DoctorMetrics {
  consultationsToday: number;
  avgConsultationTime: number;
  patientSatisfaction: number;
  completionRate: number;
  prescriptionAccuracy: number;
}

export interface Consultation {
  id: string;
  doctorId: string;
  patientId: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  diagnosis: string[];
  prescriptions: string[];
  labOrders: string[];
  followUp?: Date;
}

export interface QueueItem {
  id: string;
  patientId: string;
  appointmentId: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  waitTime: number;
  status: 'waiting' | 'called' | 'in_progress' | 'completed';
  checkInTime: Date;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phone: string;
  email: string;
  medicalHistory: MedicalHistory;
  allergies: Allergy[];
  currentMedications: Medication[];
}

export interface MedicalHistory {
  conditions: Condition[];
  surgeries: Surgery[];
  hospitalizations: Hospitalization[];
  familyHistory: string[];
}

export interface Condition {
  id: string;
  name: string;
  diagnosisDate: Date;
  status: 'active' | 'resolved';
  notes: string;
}

export interface Surgery {
  id: string;
  name: string;
  date: Date;
  surgeon: string;
  notes: string;
}

export interface Hospitalization {
  id: string;
  admissionDate: Date;
  dischargeDate?: Date;
  reason: string;
  outcome: string;
}

export interface Allergy {
  id: string;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  prescribedBy: string;
}

export interface Prescription {
  id: string;
  doctorId: string;
  patientId: string;
  consultationId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  createdAt: Date;
  status: 'pending' | 'dispensed' | 'cancelled';
}

export interface LabOrder {
  id: string;
  doctorId: string;
  patientId: string;
  consultationId: string;
  tests: LabTest[];
  priority: 'routine' | 'urgent';
  createdAt: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface LabTest {
  id: string;
  name: string;
  code: string;
  status: 'pending' | 'completed';
  result?: string;
  referenceRange?: string;
  unit?: string;
  completedAt?: Date;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  patientId?: string;
  createdAt: Date;
  read: boolean;
}

export interface DoctorAnalytics {
  clinicalMetrics: {
    patientsSeen: number;
    avgConsultationTime: number;
    diagnosisAccuracy: number;
    treatmentSuccessRate: number;
  };
  patientMetrics: {
    satisfactionScore: number;
    followUpCompliance: number;
    readmissionRate: number;
  };
  operationalMetrics: {
    onTimeAppointments: number;
    documentationCompleteness: number;
    prescriptionAccuracy: number;
  };
}
