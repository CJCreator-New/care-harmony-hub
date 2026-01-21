// Lab Tech-specific types with 14 granular permissions and laboratory workflows

export enum LabTechPermission {
  // Specimen Management (3)
  SPECIMEN_RECEIVE = 'specimen_receive',
  SPECIMEN_PROCESS = 'specimen_process',
  SPECIMEN_REJECT = 'specimen_reject',

  // Testing Operations (4)
  TEST_PERFORM = 'test_perform',
  TEST_VERIFY = 'test_verify',
  RESULT_REVIEW = 'result_review',
  RESULT_APPROVE = 'result_approve',

  // Quality Control (3)
  QC_PERFORM = 'qc_perform',
  QC_REVIEW = 'qc_review',
  MAINTENANCE_LOG = 'maintenance_log',

  // Analyzer Management (2)
  ANALYZER_OPERATE = 'analyzer_operate',
  ANALYZER_CALIBRATE = 'analyzer_calibrate',

  // Analytics (1)
  METRICS_VIEW = 'metrics_view',

  // Communication (1)
  RESULT_COMMUNICATE = 'result_communicate',
}

export interface Specimen {
  id: string;
  patientId: string;
  patientName: string;
  orderId: string;
  specimenType: string;
  collectionTime: Date;
  receivedTime: Date;
  volume: number;
  unit: string;
  status: 'received' | 'processing' | 'tested' | 'reviewed' | 'approved' | 'rejected' | 'cancelled';
  rejectionReason?: string;
  receivedBy: string;
  processedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LabTest {
  id: string;
  specimenId: string;
  patientId: string;
  testCode: string;
  testName: string;
  orderingProvider: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startTime?: Date;
  completionTime?: Date;
  performedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestResult {
  id: string;
  testId: string;
  specimenId: string;
  patientId: string;
  testCode: string;
  testName: string;
  resultValue: string;
  resultUnit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  flag?: string;
  performedBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  reviewTime?: Date;
  approvalTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityControl {
  id: string;
  analyzerId: string;
  testCode: string;
  qcLevel: 'low' | 'normal' | 'high';
  expectedValue: number;
  expectedRange: string;
  actualValue: number;
  status: 'passed' | 'failed' | 'warning';
  performedBy: string;
  performedAt: Date;
  notes?: string;
  createdAt: Date;
}

export interface Analyzer {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  location: string;
  status: 'operational' | 'maintenance' | 'calibration' | 'offline';
  lastCalibration: Date;
  nextCalibration: Date;
  lastMaintenance: Date;
  nextMaintenance: Date;
  testsProcessed: number;
  errorCount: number;
  uptime: number;
  updatedAt: Date;
}

export interface AnalyzerMaintenance {
  id: string;
  analyzerId: string;
  maintenanceType: 'preventive' | 'corrective' | 'calibration';
  description: string;
  performedBy: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
}

export interface LabAlert {
  id: string;
  type: 'critical_result' | 'quality_failure' | 'analyzer_error' | 'specimen_issue' | 'maintenance_due';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  relatedTestId?: string;
  relatedSpecimenId?: string;
  relatedAnalyzerId?: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface LabMetrics {
  testsProcessed: number;
  averageProcessingTime: number;
  qualityScore: number;
  errorRate: number;
  criticalResults: number;
  turnaroundTime: number;
  analyzerUptime: number;
  qcCompliance: number;
  specimenRejectionRate: number;
  staffProductivity: number;
}

export interface LabTechDashboard {
  specimenQueue: Specimen[];
  analyzerStatus: AnalyzerStatus[];
  qualityAlerts: LabAlert[];
  performanceMetrics: LabMetrics;
  pendingReviews: TestResult[];
  maintenanceSchedule: AnalyzerMaintenance[];
  recentResults: TestResult[];
}

export interface AnalyzerStatus {
  id: string;
  analyzerId: string;
  name: string;
  status: 'operational' | 'maintenance' | 'calibration' | 'offline';
  testsInQueue: number;
  averageProcessingTime: number;
  lastTest?: Date;
  nextMaintenance?: Date;
  errorCount: number;
}

export interface CriticalResult {
  id: string;
  testId: string;
  specimenId: string;
  patientId: string;
  patientName: string;
  testName: string;
  resultValue: string;
  criticalThreshold: string;
  severity: 'critical' | 'panic';
  detectedAt: Date;
  notifiedProvider?: string;
  notificationTime?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface SpecimenValidation {
  id: string;
  specimenId: string;
  collectionStandards: boolean;
  transportConditions: boolean;
  labelingAccuracy: boolean;
  testRequirements: boolean;
  isValid: boolean;
  issues: ValidationIssue[];
  validatedBy: string;
  validatedAt: Date;
}

export interface ValidationIssue {
  type: 'collection' | 'transport' | 'labeling' | 'requirements' | 'other';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  recommendation: string;
}

export interface LabTechUser {
  id: string;
  email: string;
  name: string;
  certificationNumber: string;
  certifications: string[];
  department: string;
  shift: 'morning' | 'afternoon' | 'night';
  permissions: LabTechPermission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityMetric {
  id: string;
  type: 'accuracy' | 'precision' | 'sensitivity' | 'specificity' | 'turnaround_time';
  value: number;
  target: number;
  status: 'on_track' | 'at_risk' | 'off_track';
  trend: 'improving' | 'stable' | 'declining';
  period: string;
}

export interface ProficiencyTest {
  id: string;
  testCode: string;
  provider: string;
  submittedResult: string;
  acceptedResult: string;
  status: 'passed' | 'failed' | 'pending';
  submittedAt: Date;
  resultReceivedAt?: Date;
  notes?: string;
}
