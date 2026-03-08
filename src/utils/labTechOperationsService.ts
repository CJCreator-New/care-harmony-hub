import {
  Specimen,
  LabTest,
  TestResult,
  QualityControl,
  Analyzer,
  AnalyzerMaintenance,
  LabAlert,
  LabMetrics,
  LabTechDashboard,
  CriticalResult,
  SpecimenValidation,
  AnalyzerStatus,
} from '../types/labtech';
import { LabTechRBACManager } from './labTechRBACManager';
import { logAudit } from './auditLogQueue';

export class LabTechOperationsService {
  private rbacManager: LabTechRBACManager;
  private labTechId: string;
  private hospitalId: string;

  constructor(rbacManager: LabTechRBACManager, labTechId: string, hospitalId = '') {
    this.rbacManager = rbacManager;
    this.labTechId = labTechId;
    this.hospitalId = hospitalId;
  }

  // Receive Specimen
  async receiveSpecimen(specimenData: Partial<Specimen>): Promise<Specimen> {
    if (!this.rbacManager.canReceiveSpecimen()) {
      throw new Error('Insufficient permissions to receive specimen');
    }

    const specimen: Specimen = {
      id: `spec_${Date.now()}`,
      patientId: specimenData.patientId || '',
      patientName: specimenData.patientName || '',
      orderId: specimenData.orderId || '',
      specimenType: specimenData.specimenType || '',
      collectionTime: specimenData.collectionTime || new Date(),
      receivedTime: new Date(),
      volume: specimenData.volume || 0,
      unit: specimenData.unit || 'mL',
      status: 'received',
      receivedBy: this.labTechId,
      notes: specimenData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'receive_specimen', entity_type: 'specimen', entity_id: specimen.id });

    return specimen;
  }

  // Validate Specimen
  async validateSpecimen(specimenId: string): Promise<SpecimenValidation> {
    const validation: SpecimenValidation = {
      id: `valid_${Date.now()}`,
      specimenId,
      collectionStandards: true,
      transportConditions: true,
      labelingAccuracy: true,
      testRequirements: true,
      isValid: true,
      issues: [],
      validatedBy: this.labTechId,
      validatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'validate_specimen', entity_type: 'specimen', entity_id: specimenId });

    return validation;
  }

  // Process Specimen
  async processSpecimen(specimenId: string): Promise<Specimen> {
    if (!this.rbacManager.canProcessSpecimen()) {
      throw new Error('Insufficient permissions to process specimen');
    }

    const processed: Specimen = {
      id: specimenId,
      patientId: '',
      patientName: '',
      orderId: '',
      specimenType: '',
      collectionTime: new Date(),
      receivedTime: new Date(),
      volume: 0,
      unit: 'mL',
      status: 'processing',
      receivedBy: this.labTechId,
      processedBy: this.labTechId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'process_specimen', entity_type: 'specimen', entity_id: specimenId });

    return processed;
  }

  // Reject Specimen
  async rejectSpecimen(specimenId: string, reason: string): Promise<Specimen> {
    if (!this.rbacManager.canRejectSpecimen()) {
      throw new Error('Insufficient permissions to reject specimen');
    }

    const rejected: Specimen = {
      id: specimenId,
      patientId: '',
      patientName: '',
      orderId: '',
      specimenType: '',
      collectionTime: new Date(),
      receivedTime: new Date(),
      volume: 0,
      unit: 'mL',
      status: 'rejected',
      rejectionReason: reason,
      receivedBy: this.labTechId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'reject_specimen', entity_type: 'specimen', entity_id: specimenId, details: { reason } });

    return rejected;
  }

  // Perform Test
  async performTest(specimenId: string, testCode: string): Promise<LabTest> {
    if (!this.rbacManager.canPerformTest()) {
      throw new Error('Insufficient permissions to perform test');
    }

    const test: LabTest = {
      id: `test_${Date.now()}`,
      specimenId,
      patientId: '',
      testCode,
      testName: '',
      orderingProvider: '',
      status: 'in_progress',
      startTime: new Date(),
      performedBy: this.labTechId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'perform_test', entity_type: 'test', entity_id: test.id, details: { specimenId, testCode } });

    return test;
  }

  // Verify Test
  async verifyTest(testId: string): Promise<LabTest> {
    if (!this.rbacManager.canVerifyTest()) {
      throw new Error('Insufficient permissions to verify test');
    }

    const verified: LabTest = {
      id: testId,
      specimenId: '',
      patientId: '',
      testCode: '',
      testName: '',
      orderingProvider: '',
      status: 'completed',
      completionTime: new Date(),
      performedBy: this.labTechId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'verify_test', entity_type: 'test', entity_id: testId });

    return verified;
  }

  // Review Result
  async reviewResult(testId: string, resultData: Partial<TestResult>): Promise<TestResult> {
    if (!this.rbacManager.canReviewResult()) {
      throw new Error('Insufficient permissions to review result');
    }

    const result: TestResult = {
      id: `result_${Date.now()}`,
      testId,
      specimenId: resultData.specimenId || '',
      patientId: resultData.patientId || '',
      testCode: resultData.testCode || '',
      testName: resultData.testName || '',
      resultValue: resultData.resultValue || '',
      resultUnit: resultData.resultUnit || '',
      referenceRange: resultData.referenceRange || '',
      status: resultData.status || 'normal',
      flag: resultData.flag,
      performedBy: this.labTechId,
      reviewedBy: this.labTechId,
      reviewTime: new Date(),
      notes: resultData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'review_result', entity_type: 'result', entity_id: result.id });

    return result;
  }

  // Approve Result
  async approveResult(resultId: string): Promise<TestResult> {
    if (!this.rbacManager.canApproveResult()) {
      throw new Error('Insufficient permissions to approve result');
    }

    const approved: TestResult = {
      id: resultId,
      testId: '',
      specimenId: '',
      patientId: '',
      testCode: '',
      testName: '',
      resultValue: '',
      resultUnit: '',
      referenceRange: '',
      status: 'normal',
      performedBy: this.labTechId,
      approvedBy: this.labTechId,
      approvalTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'approve_result', entity_type: 'result', entity_id: resultId });

    return approved;
  }

  // Perform Quality Control
  async performQC(analyzerId: string, testCode: string, qcLevel: 'low' | 'normal' | 'high'): Promise<QualityControl> {
    if (!this.rbacManager.canPerformQC()) {
      throw new Error('Insufficient permissions to perform QC');
    }

    const qc: QualityControl = {
      id: `qc_${Date.now()}`,
      analyzerId,
      testCode,
      qcLevel,
      expectedValue: 0,
      expectedRange: '',
      actualValue: 0,
      status: 'passed',
      performedBy: this.labTechId,
      performedAt: new Date(),
      createdAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'perform_qc', entity_type: 'analyzer', entity_id: analyzerId, details: { testCode, qcLevel } });

    return qc;
  }

  // Operate Analyzer
  async operateAnalyzer(analyzerId: string, operation: string): Promise<{ success: boolean; message: string }> {
    if (!this.rbacManager.canOperateAnalyzer()) {
      throw new Error('Insufficient permissions to operate analyzer');
    }

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'operate_analyzer', entity_type: 'analyzer', entity_id: analyzerId, details: { operation } });

    return { success: true, message: `Analyzer operation completed: ${operation}` };
  }

  // Calibrate Analyzer
  async calibrateAnalyzer(analyzerId: string): Promise<AnalyzerMaintenance> {
    if (!this.rbacManager.canCalibrateAnalyzer()) {
      throw new Error('Insufficient permissions to calibrate analyzer');
    }

    const maintenance: AnalyzerMaintenance = {
      id: `maint_${Date.now()}`,
      analyzerId,
      maintenanceType: 'calibration',
      description: 'Analyzer calibration',
      performedBy: this.labTechId,
      startTime: new Date(),
      endTime: new Date(),
      status: 'completed',
      createdAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'calibrate_analyzer', entity_type: 'analyzer', entity_id: analyzerId });

    return maintenance;
  }

  // Log Maintenance
  async logMaintenance(analyzerId: string, maintenanceData: Partial<AnalyzerMaintenance>): Promise<AnalyzerMaintenance> {
    if (!this.rbacManager.canLogMaintenance()) {
      throw new Error('Insufficient permissions to log maintenance');
    }

    const maintenance: AnalyzerMaintenance = {
      id: `maint_${Date.now()}`,
      analyzerId,
      maintenanceType: maintenanceData.maintenanceType || 'preventive',
      description: maintenanceData.description || '',
      performedBy: this.labTechId,
      startTime: maintenanceData.startTime || new Date(),
      endTime: maintenanceData.endTime,
      status: maintenanceData.status || 'completed',
      notes: maintenanceData.notes,
      createdAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'log_maintenance', entity_type: 'analyzer', entity_id: analyzerId });

    return maintenance;
  }

  // Get Analyzer Status
  async getAnalyzerStatus(): Promise<AnalyzerStatus[]> {
    return [];
  }

  // Handle Critical Result
  async handleCriticalResult(testId: string, resultData: Partial<TestResult>): Promise<CriticalResult> {
    const critical: CriticalResult = {
      id: `crit_${Date.now()}`,
      testId,
      specimenId: resultData.specimenId || '',
      patientId: resultData.patientId || '',
      patientName: '',
      testName: resultData.testName || '',
      resultValue: resultData.resultValue || '',
      criticalThreshold: '',
      severity: 'critical',
      detectedAt: new Date(),
      acknowledged: false,
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.labTechId, action_type: 'detect_critical_result', entity_type: 'result', entity_id: critical.id, details: { testId } });

    return critical;
  }

  // Get Dashboard Data
  async getDashboardData(): Promise<LabTechDashboard> {
    if (!this.rbacManager.canAccessLabPanel()) {
      throw new Error('Insufficient permissions to access lab panel');
    }

    return {
      specimenQueue: [],
      analyzerStatus: [],
      qualityAlerts: [],
      performanceMetrics: this.getDefaultMetrics(),
      pendingReviews: [],
      maintenanceSchedule: [],
      recentResults: [],
    };
  }

  // Get Metrics
  async getMetrics(): Promise<LabMetrics> {
    if (!this.rbacManager.canViewMetrics()) {
      throw new Error('Insufficient permissions to view metrics');
    }

    return this.getDefaultMetrics();
  }

  // Helper Methods
  private getDefaultMetrics(): LabMetrics {
    return {
      testsProcessed: 0,
      averageProcessingTime: 0,
      qualityScore: 0,
      errorRate: 0,
      criticalResults: 0,
      turnaroundTime: 0,
      analyzerUptime: 0,
      qcCompliance: 0,
      specimenRejectionRate: 0,
      staffProductivity: 0,
    };
  }
}
