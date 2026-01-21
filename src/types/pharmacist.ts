// Pharmacist-specific types with 15 granular permissions and pharmacy workflows

export enum PharmacistPermission {
  // Prescription Management (4)
  PRESCRIPTION_RECEIVE = 'prescription_receive',
  PRESCRIPTION_VERIFY = 'prescription_verify',
  PRESCRIPTION_FILL = 'prescription_fill',
  PRESCRIPTION_REJECT = 'prescription_reject',

  // Dispensing Operations (3)
  DISPENSING_PROCESS = 'dispensing_process',
  DISPENSING_VERIFY = 'dispensing_verify',
  LABEL_GENERATE = 'label_generate',

  // Inventory Management (3)
  INVENTORY_VIEW = 'inventory_view',
  INVENTORY_UPDATE = 'inventory_update',
  INVENTORY_REORDER = 'inventory_reorder',

  // Clinical Decision Support (3)
  INTERACTION_CHECK = 'interaction_check',
  ALLERGY_CHECK = 'allergy_check',
  DOSAGE_VERIFY = 'dosage_verify',

  // Patient Counseling (1)
  PATIENT_COUNSEL = 'patient_counsel',

  // Quality & Analytics (1)
  METRICS_VIEW = 'metrics_view',
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  prescriberId: string;
  prescriberName: string;
  medicationName: string;
  dosage: string;
  quantity: number;
  route: string;
  frequency: string;
  duration: string;
  refillsRemaining: number;
  prescriptionDate: Date;
  expiryDate: Date;
  status: 'received' | 'verified' | 'filled' | 'dispensed' | 'rejected' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrescriptionVerification {
  id: string;
  prescriptionId: string;
  pharmacistId: string;
  verificationTime: Date;
  drugInteractionCheck: InteractionCheck;
  allergyCheck: AllergyCheck;
  dosageVerification: DosageVerification;
  formularyCompliance: boolean;
  duplicateTherapyCheck: boolean;
  isValid: boolean;
  issues: ValidationIssue[];
  notes?: string;
}

export interface InteractionCheck {
  hasInteractions: boolean;
  interactions: DrugInteraction[];
  severity: 'critical' | 'major' | 'moderate' | 'minor' | 'none';
  recommendations: string[];
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
}

export interface AllergyCheck {
  hasAllergies: boolean;
  allergies: string[];
  medicationAllergies: string[];
  severity: 'critical' | 'major' | 'moderate' | 'minor' | 'none';
  recommendations: string[];
}

export interface DosageVerification {
  isAppropriate: boolean;
  recommendedDosage: string;
  patientAge: number;
  patientWeight?: number;
  renalFunction?: string;
  hepaticFunction?: string;
  issues: string[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'interaction' | 'allergy' | 'dosage' | 'formulary' | 'duplicate' | 'other';
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
}

export interface InventoryItem {
  id: string;
  medicationName: string;
  ndc: string;
  strength: string;
  form: string;
  quantity: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: number;
  expiryDate: Date;
  location: string;
  lastUpdated: Date;
  updatedBy: string;
}

export interface DispensingRecord {
  id: string;
  prescriptionId: string;
  patientId: string;
  pharmacistId: string;
  dispensingTime: Date;
  medicationName: string;
  quantity: number;
  batchNumber: string;
  expiryDate: Date;
  labelGenerated: boolean;
  qualityChecked: boolean;
  counselingProvided: boolean;
  status: 'pending' | 'dispensed' | 'verified' | 'completed';
  notes?: string;
}

export interface PatientCounseling {
  id: string;
  prescriptionId: string;
  patientId: string;
  pharmacistId: string;
  counselingDate: Date;
  medicationName: string;
  topics: string[];
  adherenceSupport: string;
  sideEffects: string[];
  drugInteractions: string[];
  storageInstructions: string;
  refillInstructions: string;
  followUpNeeded: boolean;
  notes?: string;
}

export interface PharmacyAlert {
  id: string;
  type: 'drug_interaction' | 'allergy_warning' | 'dosage_issue' | 'inventory_low' | 'expiry_warning' | 'quality_issue';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  relatedPrescriptionId?: string;
  relatedPatientId?: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface PharmacyMetrics {
  prescriptionsReceived: number;
  prescriptionsFilled: number;
  averageProcessingTime: number;
  dispensingAccuracy: number;
  medicationErrors: number;
  adverseDrugReactions: number;
  interventionRate: number;
  patientSatisfactionScore: number;
  inventoryAccuracy: number;
  costSavings: number;
}

export interface PharmacistDashboard {
  prescriptionQueue: Prescription[];
  inventoryAlerts: InventoryItem[];
  clinicalAlerts: PharmacyAlert[];
  performanceMetrics: PharmacyMetrics;
  pendingVerifications: PrescriptionVerification[];
  recentDispensing: DispensingRecord[];
  qualityIndicators: QualityIndicator[];
}

export interface QualityIndicator {
  id: string;
  type: 'error_rate' | 'accuracy' | 'timeliness' | 'safety' | 'patient_satisfaction';
  value: number;
  target: number;
  status: 'on_track' | 'at_risk' | 'off_track';
  trend: 'improving' | 'stable' | 'declining';
}

export interface InventoryReorderRequest {
  id: string;
  medicationName: string;
  ndc: string;
  currentQuantity: number;
  reorderQuantity: number;
  estimatedCost: number;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface PharmacistUser {
  id: string;
  email: string;
  name: string;
  licenseNumber: string;
  deaNumber?: string;
  department: string;
  shift: 'morning' | 'afternoon' | 'night';
  permissions: PharmacistPermission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClinicalIntervention {
  id: string;
  prescriptionId: string;
  patientId: string;
  pharmacistId: string;
  interventionType: 'dosage_adjustment' | 'drug_substitution' | 'interaction_resolution' | 'allergy_alert' | 'other';
  description: string;
  recommendation: string;
  prescriberNotified: boolean;
  prescriberResponse?: string;
  interventionDate: Date;
  status: 'pending' | 'implemented' | 'rejected' | 'pending_response';
}

export interface MedicationTherapyManagement {
  id: string;
  patientId: string;
  pharmacistId: string;
  startDate: Date;
  endDate?: Date;
  medications: string[];
  goals: string[];
  interventions: string[];
  outcomes: string[];
  followUpSchedule: Date[];
  status: 'active' | 'completed' | 'discontinued';
}
