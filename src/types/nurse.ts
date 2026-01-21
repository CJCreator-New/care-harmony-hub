// Nurse-specific types with 16 granular permissions and clinical workflows

export enum NursePermission {
  // Patient Management (4)
  PATIENT_ASSESS = 'patient_assess',
  PATIENT_MONITOR = 'patient_monitor',
  PATIENT_ADMIT = 'patient_admit',
  PATIENT_DISCHARGE = 'patient_discharge',

  // Vital Signs & Monitoring (3)
  VITALS_RECORD = 'vitals_record',
  VITALS_MONITOR = 'vitals_monitor',
  ALERTS_MANAGE = 'alerts_manage',

  // Medication Administration (3)
  MEDICATION_ADMINISTER = 'medication_administer',
  MEDICATION_VERIFY = 'medication_verify',
  MEDICATION_DOCUMENT = 'medication_document',

  // Care Coordination (3)
  CARE_PLAN_VIEW = 'care_plan_view',
  CARE_PLAN_UPDATE = 'care_plan_update',
  TEAM_COMMUNICATE = 'team_communicate',

  // Documentation (2)
  NOTES_CREATE = 'notes_create',
  NOTES_VIEW = 'notes_view',

  // Quality & Analytics (1)
  METRICS_VIEW = 'metrics_view',
}

export interface PatientAssignment {
  id: string;
  patientId: string;
  patientName: string;
  roomNumber: string;
  acuityLevel: 'critical' | 'high' | 'medium' | 'low';
  admissionTime: Date;
  primaryDiagnosis: string;
  allergies: string[];
  activeAlerts: Alert[];
  vitalSigns: VitalSigns;
  pendingTasks: Task[];
}

export interface VitalSigns {
  id: string;
  patientId: string;
  timestamp: Date;
  temperature: number;
  heartRate: number;
  bloodPressure: string;
  respiratoryRate: number;
  oxygenSaturation: number;
  bloodGlucose?: number;
  recordedBy: string;
  status: 'normal' | 'abnormal' | 'critical';
}

export interface Alert {
  id: string;
  patientId: string;
  type: 'vital_abnormal' | 'medication_due' | 'task_overdue' | 'order_pending' | 'allergy_warning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface Task {
  id: string;
  patientId: string;
  title: string;
  description: string;
  type: 'assessment' | 'medication' | 'procedure' | 'monitoring' | 'documentation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueTime: Date;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export interface NurseAssessment {
  id: string;
  patientId: string;
  nurseId: string;
  timestamp: Date;
  type: 'admission' | 'shift' | 'focused' | 'discharge';
  vitalSigns: VitalSigns;
  physicalExamination: string;
  mentalStatus: string;
  painLevel: number;
  mobilityStatus: string;
  skinIntegrity: string;
  nutritionStatus: string;
  eliminationStatus: string;
  psychosocialStatus: string;
  riskAssessments: RiskAssessment[];
  carePlanUpdates: string[];
  alerts: Alert[];
}

export interface RiskAssessment {
  type: 'fall' | 'pressure_ulcer' | 'infection' | 'medication_error' | 'aspiration';
  score: number;
  level: 'low' | 'medium' | 'high';
  interventions: string[];
}

export interface MedicationAdministration {
  id: string;
  patientId: string;
  prescriptionId: string;
  medicationName: string;
  dosage: string;
  route: string;
  scheduledTime: Date;
  administeredTime?: Date;
  administeredBy?: string;
  status: 'pending' | 'administered' | 'refused' | 'held' | 'missed';
  reason?: string;
  verifiedBy?: string;
  patientResponse?: string;
}

export interface CarePlan {
  id: string;
  patientId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  goals: CareGoal[];
  interventions: CareIntervention[];
  status: 'active' | 'completed' | 'on_hold';
}

export interface CareGoal {
  id: string;
  description: string;
  targetDate: Date;
  status: 'active' | 'achieved' | 'modified' | 'discontinued';
  measurableOutcomes: string[];
}

export interface CareIntervention {
  id: string;
  description: string;
  frequency: string;
  assignedTo: string;
  status: 'active' | 'completed' | 'discontinued';
  rationale: string;
}

export interface ShiftHandoff {
  id: string;
  shiftDate: Date;
  outgoingNurse: string;
  incomingNurse: string;
  patients: PatientHandoffReport[];
  criticalUpdates: string[];
  pendingOrders: string[];
  staffingNotes: string;
  completedAt: Date;
  verifiedBy: string;
}

export interface PatientHandoffReport {
  patientId: string;
  patientName: string;
  roomNumber: string;
  status: string;
  keyUpdates: string[];
  pendingTasks: string[];
  alerts: Alert[];
}

export interface NurseMetrics {
  totalPatientsAssigned: number;
  tasksCompleted: number;
  taskCompletionRate: number;
  averageResponseTime: number;
  medicationAdministrationAccuracy: number;
  documentationTimeliness: number;
  patientSatisfactionScore: number;
  qualityScore: number;
  shiftsWorked: number;
  averagePatientAcuity: number;
}

export interface NurseDashboard {
  assignedPatients: PatientAssignment[];
  criticalAlerts: Alert[];
  pendingTasks: Task[];
  shiftSummary: {
    patientsAdmitted: number;
    tasksCompleted: number;
    handoffsPending: number;
    qualityMetrics: NurseMetrics;
  };
  communicationHub: TeamMessage[];
  quickActions: QuickAction[];
}

export interface TeamMessage {
  id: string;
  from: string;
  to: string;
  patientId?: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'normal' | 'urgent';
}

export interface QuickAction {
  id: string;
  title: string;
  icon: string;
  action: string;
  permission: NursePermission;
}

export interface NurseUser {
  id: string;
  email: string;
  name: string;
  licenseNumber: string;
  department: string;
  shift: 'morning' | 'afternoon' | 'night';
  permissions: NursePermission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
