import { FastifyInstance } from 'fastify';
import {
  LabResult,
  LabOrder,
  CriticalValueNotification,
  SpecimenTracking,
  LabQCResult
} from '../types/laboratory';
import { connectDatabase } from '../config/database';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cliaCompliant: boolean;
}

interface QuarantinedRecord {
  id: string;
  entity_id: string;
  entity_type: 'lab_order' | 'lab_result' | 'critical_notification' | 'specimen_tracking' | 'qc_result';
  data: any;
  validation_errors: string[];
  quarantined_at: Date;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Date;
  review_notes?: string;
}

export class DataValidationService {
  constructor(private fastify: FastifyInstance) {}

  async validateLaboratoryData(entityType: string, data: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let cliaCompliant = true;

    switch (entityType) {
      case 'lab_result':
        await this.validateLabResult(data as LabResult, errors, warnings);
        cliaCompliant = await this.validateCLIAComplianceForResult(data as LabResult, errors, warnings);
        break;
      case 'lab_order':
        await this.validateLabOrder(data as LabOrder, errors, warnings);
        break;
      case 'critical_notification':
        await this.validateCriticalNotification(data as CriticalValueNotification, errors, warnings);
        break;
      case 'specimen_tracking':
        await this.validateSpecimenTracking(data as SpecimenTracking, errors, warnings);
        break;
      case 'qc_result':
        await this.validateQCResult(data as LabQCResult, errors, warnings);
        cliaCompliant = await this.validateCLIAComplianceForQC(data as LabQCResult, errors, warnings);
        break;
      default:
        errors.push(`Unknown entity type: ${entityType}`);
    }

    // Cross-reference validation
    await this.validateReferences(entityType, data, errors, warnings);

    // HIPAA compliance validation
    await this.validateHIPAACompliance(entityType, data, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cliaCompliant
    };
  }

  async validateBatchLaboratoryData(data: any[]): Promise<{
    valid: any[];
    invalid: { data: any; errors: string[]; warnings: string[]; cliaCompliant: boolean }[];
    quarantined: string[];
  }> {
    const valid: any[] = [];
    const invalid: { data: any; errors: string[]; warnings: string[]; cliaCompliant: boolean }[] = [];
    const quarantined: string[] = [];

    for (const item of data) {
      const validation = await this.validateLaboratoryData(item.entityType || 'unknown', item);

      if (validation.isValid && validation.cliaCompliant) {
        valid.push(item);
      } else {
        invalid.push({
          data: item,
          errors: validation.errors,
          warnings: validation.warnings,
          cliaCompliant: validation.cliaCompliant
        });

        // Auto-quarantine if there are critical errors or CLIA violations
        if (validation.errors.length > 0 || !validation.cliaCompliant) {
          const quarantineId = await this.quarantineInvalidData(item.entityType || 'unknown', item, validation.errors);
          quarantined.push(quarantineId);
        }
      }
    }

    return { valid, invalid, quarantined };
  }

  async quarantineInvalidData(entityType: string, data: any, validationErrors: string[]): Promise<string> {
    const db = await connectDatabase();

    try {
      const quarantineId = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db
        .insertInto('data_quarantine')
        .values({
          id: quarantineId,
          entity_id: data.id,
          entity_type: entityType,
          service_name: 'laboratory',
          data: JSON.stringify(data),
          validation_errors: JSON.stringify(validationErrors),
          quarantined_at: new Date(),
          status: 'pending_review'
        })
        .execute();

      this.fastify.log.warn({
        msg: 'Laboratory data quarantined due to validation errors',
        entityId: data.id,
        entityType,
        quarantineId,
        errors: validationErrors
      });

      return quarantineId;
    } finally {
      await db.destroy();
    }
  }

  async approveQuarantinedData(quarantineId: string, reviewerId: string, notes?: string): Promise<void> {
    const db = await connectDatabase();

    try {
      // Get quarantined data
      const quarantined = await db
        .selectFrom('data_quarantine')
        .where('id', '=', quarantineId)
        .selectAll()
        .executeTakeFirst();

      if (!quarantined) {
        throw new Error(`Quarantined record ${quarantineId} not found`);
      }

      const data = JSON.parse(quarantined.data as string);

      // Re-validate the data (in case rules changed)
      const validation = await this.validateLaboratoryData(quarantined.entity_type as string, data);
      if (!validation.isValid || !validation.cliaCompliant) {
        throw new Error('Data still fails validation and cannot be approved');
      }

      // Update quarantine status
      await db
        .updateTable('data_quarantine')
        .set({
          status: 'approved',
          reviewed_by: reviewerId,
          reviewed_at: new Date(),
          review_notes: notes || 'Approved after review'
        })
        .where('id', '=', quarantineId)
        .execute();

      // Insert the approved data into the main table
      await this.insertValidatedData(quarantined.entity_type as string, data);

      // Log the approval
      await this.logQuarantineAction(quarantineId, 'approved', reviewerId, notes);

      this.fastify.log.info({
        msg: 'Quarantined laboratory data approved and inserted',
        quarantineId,
        entityId: data.id,
        entityType: quarantined.entity_type,
        reviewerId
      });
    } finally {
      await db.destroy();
    }
  }

  async rejectQuarantinedData(quarantineId: string, reviewerId: string, notes: string): Promise<void> {
    const db = await connectDatabase();

    try {
      await db
        .updateTable('data_quarantine')
        .set({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date(),
          review_notes: notes
        })
        .where('id', '=', quarantineId)
        .execute();

      // Log the rejection
      await this.logQuarantineAction(quarantineId, 'rejected', reviewerId, notes);

      this.fastify.log.info({
        msg: 'Quarantined laboratory data rejected',
        quarantineId,
        reviewerId,
        notes
      });
    } finally {
      await db.destroy();
    }
  }

  async getQuarantinedData(): Promise<QuarantinedRecord[]> {
    const db = await connectDatabase();

    try {
      const result = await db
        .selectFrom('data_quarantine')
        .where('service_name', '=', 'laboratory')
        .where('status', '=', 'pending_review')
        .orderBy('quarantined_at', 'desc')
        .selectAll()
        .execute();

      return result.map(row => ({
        ...row,
        data: JSON.parse(row.data as string),
        validation_errors: JSON.parse(row.validation_errors as string)
      }));
    } finally {
      await db.destroy();
    }
  }

  async getDataQualityMetrics(): Promise<{
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    quarantinedRecords: number;
    cliaCompliantRecords: number;
    averageValidationScore: number;
    commonValidationErrors: { error: string; count: number }[];
  }> {
    const db = await connectDatabase();

    try {
      // Get total records across all lab tables
      const tables = ['lab_orders', 'lab_results', 'critical_value_notifications',
                     'specimen_tracking', 'lab_qc_results'];
      let totalRecords = 0;

      for (const table of tables) {
        const count = await db
          .selectFrom(table as any)
          .select(db.fn.count('id').as('count'))
          .executeTakeFirst();
        totalRecords += Number(count?.count || 0);
      }

      // Get quarantine statistics
      const quarantineStats = await this.getQuarantineStatistics();

      return {
        totalRecords,
        validRecords: totalRecords - quarantineStats.pendingReview,
        invalidRecords: quarantineStats.pendingReview,
        quarantinedRecords: quarantineStats.totalQuarantined,
        cliaCompliantRecords: totalRecords, // Would need CLIA tracking
        averageValidationScore: 0.95, // Placeholder
        commonValidationErrors: [] // Would need to analyze quarantine data
      };
    } finally {
      await db.destroy();
    }
  }

  async getCLIAComplianceStatus(): Promise<{
    totalTests: number;
    cliaCompliantTests: number;
    nonCompliantTests: number;
    pendingReview: number;
    complianceRate: number;
    recentViolations: any[];
  }> {
    const db = await connectDatabase();

    try {
      // Get QC results for CLIA compliance
      const qcResults = await db
        .selectFrom('lab_qc_results')
        .selectAll()
        .execute();

      const totalTests = qcResults.length;
      const compliantTests = qcResults.filter(qc => qc.within_limits).length;
      const nonCompliantTests = totalTests - compliantTests;

      // Get pending CLIA reviews from quarantine
      const pendingReviews = await db
        .selectFrom('data_quarantine')
        .where('service_name', '=', 'laboratory')
        .where('status', '=', 'pending_review')
        .where('validation_errors', 'like', '%CLIA%')
        .select(db.fn.count('id').as('count'))
        .executeTakeFirst();

      return {
        totalTests,
        cliaCompliantTests: compliantTests,
        nonCompliantTests,
        pendingReview: Number(pendingReviews?.count || 0),
        complianceRate: totalTests > 0 ? (compliantTests / totalTests) * 100 : 100,
        recentViolations: [] // Would need to track recent violations
      };
    } finally {
      await db.destroy();
    }
  }

  async validateCLIATestResults(testResults: any[]): Promise<{
    valid: any[];
    invalid: { result: any; violations: string[] }[];
  }> {
    const valid: any[] = [];
    const invalid: { result: any; violations: string[] }[] = [];

    for (const result of testResults) {
      const violations: string[] = [];

      // CLIA validation rules
      if (!result.performed_at) {
        violations.push('Test result missing performance timestamp');
      }

      if (!result.verified_at) {
        violations.push('Test result missing verification timestamp');
      }

      if (result.result_status === 'preliminary' && !result.verified_at) {
        violations.push('Preliminary results must have verification timeline');
      }

      // Check critical values
      if (result.critical_flag && !result.verified_at) {
        violations.push('Critical values must be verified immediately');
      }

      if (violations.length === 0) {
        valid.push(result);
      } else {
        invalid.push({ result, violations });
      }
    }

    return { valid, invalid };
  }

  async getQuarantineStatistics(): Promise<{
    totalQuarantined: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    averageReviewTime: number;
  }> {
    const db = await connectDatabase();

    try {
      const result = await db
        .selectFrom('data_quarantine')
        .where('service_name', '=', 'laboratory')
        .select([
          db.fn.count('id').as('total_quarantined'),
          db.fn.count(db.case().when('status', '=', 'pending_review').then(1).end()).as('pending_review'),
          db.fn.count(db.case().when('status', '=', 'approved').then(1).end()).as('approved'),
          db.fn.count(db.case().when('status', '=', 'rejected').then(1).end()).as('rejected'),
          db.fn.avg(
            db.fn.extract('epoch').from(
              db.fn.timestampDiff('reviewed_at', 'quarantined_at')
            )
          ).as('avg_review_time_seconds')
        ])
        .executeTakeFirst();

      return {
        totalQuarantined: Number(result?.total_quarantined || 0),
        pendingReview: Number(result?.pending_review || 0),
        approved: Number(result?.approved || 0),
        rejected: Number(result?.rejected || 0),
        averageReviewTime: Number(result?.avg_review_time_seconds || 0)
      };
    } finally {
      await db.destroy();
    }
  }

  // Private validation methods
  private async validateLabResult(result: LabResult, errors: string[], warnings: string[]): Promise<void> {
    if (!result.id) errors.push('Lab result ID is required');
    if (!result.lab_order_id) errors.push('Lab order ID is required');
    if (!result.result_value) errors.push('Result value is required');

    if (result.result_numeric && (result.result_numeric < 0 || !isFinite(result.result_numeric))) {
      errors.push('Invalid numeric result value');
    }

    const validStatuses = ['preliminary', 'final', 'corrected', 'cancelled'];
    if (!validStatuses.includes(result.result_status)) {
      errors.push(`Invalid result status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (result.critical_flag && result.result_status === 'preliminary') {
      warnings.push('Critical results should be finalized immediately');
    }
  }

  private async validateLabOrder(order: LabOrder, errors: string[], warnings: string[]): Promise<void> {
    if (!order.id) errors.push('Lab order ID is required');
    if (!order.patient_id) errors.push('Patient ID is required');
    if (!order.doctor_id) errors.push('Doctor ID is required');
    if (!order.test_name) errors.push('Test name is required');
    if (!order.hospital_id) errors.push('Hospital ID is required');

    const validStatuses = ['ordered', 'collected', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(order.status)) {
      errors.push(`Invalid order status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const validPriorities = ['routine', 'urgent', 'stat'];
    if (!validPriorities.includes(order.priority)) {
      errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }
  }

  private async validateCriticalNotification(notification: CriticalValueNotification, errors: string[], warnings: string[]): Promise<void> {
    if (!notification.id) errors.push('Notification ID is required');
    if (!notification.lab_result_id) errors.push('Lab result ID is required');
    if (!notification.patient_id) errors.push('Patient ID is required');
    if (!notification.critical_value) errors.push('Critical value is required');

    if (notification.notification_level < 1 || notification.notification_level > 3) {
      errors.push('Notification level must be between 1 and 3');
    }

    if (!notification.acknowledged_at && notification.escalation_level > 1) {
      warnings.push('Escalated notifications should be acknowledged');
    }
  }

  private async validateSpecimenTracking(tracking: SpecimenTracking, errors: string[], warnings: string[]): Promise<void> {
    if (!tracking.specimen_id) errors.push('Specimen ID is required');
    if (!tracking.lab_order_id) errors.push('Lab order ID is required');
    if (!tracking.collection_time) errors.push('Collection time is required');
    if (!tracking.collected_by) errors.push('Collected by is required');
    if (!tracking.specimen_type) errors.push('Specimen type is required');

    if (tracking.received_time && new Date(tracking.received_time) < new Date(tracking.collection_time)) {
      errors.push('Received time cannot be before collection time');
    }

    if (!tracking.quality_assessment.adequate_volume) {
      warnings.push('Specimen volume may be inadequate');
    }
  }

  private async validateQCResult(qc: LabQCResult, errors: string[], warnings: string[]): Promise<void> {
    if (!qc.id) errors.push('QC result ID is required');
    if (!qc.loinc_code) errors.push('LOINC code is required');
    if (qc.expected_value <= 0) errors.push('Expected value must be positive');
    if (qc.actual_value <= 0) errors.push('Actual value must be positive');

    if (!qc.within_limits) {
      errors.push('QC result is outside acceptable limits');
    }
  }

  private async validateCLIAComplianceForResult(result: LabResult, errors: string[], warnings: string[]): Promise<boolean> {
    let compliant = true;

    // CLIA requires timely verification of critical results
    if (result.critical_flag) {
      if (!result.verified_at) {
        errors.push('CLIA Violation: Critical results must be verified immediately');
        compliant = false;
      } else {
        const performedTime = new Date(result.performed_at);
        const verifiedTime = new Date(result.verified_at);
        const timeDiff = (verifiedTime.getTime() - performedTime.getTime()) / (1000 * 60); // minutes

        if (timeDiff > 60) { // CLIA requires critical results within 1 hour for non-life threatening
          warnings.push('CLIA Warning: Critical result verification took longer than recommended');
        }
      }
    }

    // Preliminary results need final verification
    if (result.result_status === 'preliminary') {
      const performedTime = new Date(result.performed_at);
      const now = new Date();
      const hoursSincePerformed = (now.getTime() - performedTime.getTime()) / (1000 * 60 * 60);

      if (hoursSincePerformed > 24) {
        warnings.push('CLIA Warning: Preliminary result pending final verification for more than 24 hours');
      }
    }

    return compliant;
  }

  private async validateCLIAComplianceForQC(qc: LabQCResult, errors: string[], warnings: string[]): Promise<boolean> {
    if (!qc.within_limits) {
      errors.push('CLIA Violation: QC failure requires immediate corrective action');
      return false;
    }

    // Check if QC is performed at required frequency (daily for most tests)
    const lastQcTime = new Date(qc.run_date);
    const now = new Date();
    const hoursSinceQc = (now.getTime() - lastQcTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceQc > 24) {
      warnings.push('CLIA Warning: QC not performed within required frequency');
    }

    return true;
  }

  private async validateReferences(entityType: string, data: any, errors: string[], warnings: string[]): Promise<void> {
    const db = await connectDatabase();

    try {
      // Validate patient exists
      if (data.patient_id) {
        const patientExists = await db
          .selectFrom('patients')
          .where('id', '=', data.patient_id)
          .select('id')
          .executeTakeFirst();

        if (!patientExists) {
          errors.push(`Patient ${data.patient_id} does not exist`);
        }
      }

      // Validate hospital exists
      if (data.hospital_id) {
        const hospitalExists = await db
          .selectFrom('hospitals')
          .where('id', '=', data.hospital_id)
          .select('id')
          .executeTakeFirst();

        if (!hospitalExists) {
          errors.push(`Hospital ${data.hospital_id} does not exist`);
        }
      }

      // Entity-specific validations
      switch (entityType) {
        case 'lab_result':
          const orderExists = await db
            .selectFrom('lab_orders')
            .where('id', '=', data.lab_order_id)
            .select('id')
            .executeTakeFirst();

          if (!orderExists) {
            errors.push(`Lab order ${data.lab_order_id} does not exist`);
          }
          break;
      }
    } finally {
      await db.destroy();
    }
  }

  private async validateHIPAACompliance(entityType: string, data: any, errors: string[], warnings: string[]): Promise<void> {
    // Check for PHI in free-text fields
    const textFields = ['notes', 'interpretation', 'collection_notes', 'resolution_notes'];

    for (const field of textFields) {
      if (data[field]) {
        const phiPatterns = [
          /\b\d{3}-\d{2}-\d{4}\b/, // SSN
          /\b\d{10}\b/, // Phone number
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
        ];

        for (const pattern of phiPatterns) {
          if (pattern.test(data[field])) {
            warnings.push(`${field} may contain protected health information (PHI)`);
            break;
          }
        }
      }
    }

    // Check for sensitive health information
    if (data.interpretation || data.notes) {
      const sensitiveTerms = ['HIV', 'AIDS', 'mental health', 'substance abuse', 'genetic disorder'];
      const textToCheck = (data.interpretation || '') + ' ' + (data.notes || '');

      for (const term of sensitiveTerms) {
        if (textToCheck.toLowerCase().includes(term)) {
          warnings.push('Content may contain sensitive health information requiring special handling');
          break;
        }
      }
    }
  }

  private async insertValidatedData(entityType: string, data: any): Promise<void> {
    const db = await connectDatabase();

    try {
      const tableName = this.getTableName(entityType);

      // Remove any audit fields that shouldn't be in the data
      const { created_at, updated_at, ...insertData } = data;

      await db
        .insertInto(tableName)
        .values({
          ...insertData,
          created_at: new Date(),
          updated_at: new Date()
        })
        .onConflict('id')
        .doUpdateSet({
          ...insertData,
          updated_at: new Date()
        })
        .execute();
    } finally {
      await db.destroy();
    }
  }

  private async logQuarantineAction(
    quarantineId: string,
    action: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    const db = await connectDatabase();

    try {
      await db
        .insertInto('sync_audit_log')
        .values({
          id: crypto.randomUUID(),
          entity_id: quarantineId,
          entity_type: 'quarantine',
          action: `quarantine_${action}`,
          details: JSON.stringify({ quarantineId, action, notes }),
          performed_at: new Date(),
          performed_by: reviewerId
        })
        .execute();
    } finally {
      await db.destroy();
    }
  }

  private getTableName(entityType: string): string {
    switch (entityType) {
      case 'lab_order': return 'lab_orders';
      case 'lab_result': return 'lab_results';
      case 'critical_notification': return 'critical_value_notifications';
      case 'specimen_tracking': return 'specimen_tracking';
      case 'qc_result': return 'lab_qc_results';
      default: throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
}