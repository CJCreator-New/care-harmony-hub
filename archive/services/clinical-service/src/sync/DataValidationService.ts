import { FastifyInstance } from 'fastify';
import { Consultation, ClinicalWorkflow, MedicalRecord, ClinicalDecisionSupport } from '../types/clinical';
import { connectDatabase } from '../config/database';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface QuarantinedRecord {
  id: string;
  record_id: string;
  record_type: string;
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

  async validateClinicalRecord(recordType: string, record: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validation
    if (!record.id) {
      errors.push('Record ID is required');
    }

    if (!record.patient_id) {
      errors.push('Patient ID is required');
    }

    if (!record.hospital_id) {
      errors.push('Hospital ID is required');
    }

    // Type-specific validation
    switch (recordType) {
      case 'consultation':
        await this.validateConsultation(record as Consultation, errors, warnings);
        break;
      case 'clinical_workflow':
        await this.validateClinicalWorkflow(record as ClinicalWorkflow, errors, warnings);
        break;
      case 'medical_record':
        await this.validateMedicalRecord(record as MedicalRecord, errors, warnings);
        break;
      case 'clinical_decision_support':
        await this.validateClinicalDecisionSupport(record as ClinicalDecisionSupport, errors, warnings);
        break;
      default:
        errors.push(`Unknown record type: ${recordType}`);
    }

    // Cross-reference validation
    await this.validateReferences(recordType, record, errors, warnings);

    // HIPAA compliance validation
    await this.validateHIPAACompliance(recordType, record, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateBatchClinicalRecords(records: { type: string; data: any }[]): Promise<{
    valid: { type: string; data: any }[];
    invalid: { record: { type: string; data: any }; errors: string[]; warnings: string[] }[];
    quarantined: string[];
  }> {
    const valid: { type: string; data: any }[] = [];
    const invalid: { record: { type: string; data: any }; errors: string[]; warnings: string[] }[] = [];
    const quarantined: string[] = [];

    for (const record of records) {
      const validation = await this.validateClinicalRecord(record.type, record.data);

      if (validation.isValid) {
        valid.push(record);
      } else {
        invalid.push({
          record,
          errors: validation.errors,
          warnings: validation.warnings
        });

        // Auto-quarantine if there are critical errors
        if (validation.errors.length > 0) {
          const quarantineId = await this.quarantineInvalidData(record.type, record.data, validation.errors);
          quarantined.push(quarantineId);
        }
      }
    }

    return { valid, invalid, quarantined };
  }

  async quarantineInvalidData(recordType: string, record: any, validationErrors: string[]): Promise<string> {
    const pool = connectDatabase();

    const quarantineId = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(`
      INSERT INTO data_quarantine (id, record_id, record_type, data, validation_errors, quarantined_at, status)
      VALUES ($1, $2, $3, $4, $5, NOW(), 'pending_review')
    `, [
      quarantineId,
      record.id,
      recordType,
      JSON.stringify(record),
      JSON.stringify(validationErrors)
    ]);

    this.fastify.log.warn({
      msg: 'Clinical data quarantined due to validation errors',
      recordId: record.id,
      recordType,
      quarantineId,
      errors: validationErrors
    });

    return quarantineId;
  }

  async approveQuarantinedData(quarantineId: string, reviewerId: string, notes?: string): Promise<void> {
    const pool = connectDatabase();

    // Get quarantined data
    const quarantineResult = await pool.query('SELECT * FROM data_quarantine WHERE id = $1', [quarantineId]);
    if (quarantineResult.rows.length === 0) {
      throw new Error(`Quarantined record ${quarantineId} not found`);
    }

    const quarantined = quarantineResult.rows[0];
    const record = JSON.parse(quarantined.data);

    // Re-validate the data (in case rules changed)
    const validation = await this.validateClinicalRecord(quarantined.record_type, record);
    if (!validation.isValid) {
      throw new Error('Data still fails validation and cannot be approved');
    }

    // Update quarantine status
    await pool.query(`
      UPDATE data_quarantine
      SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
      WHERE id = $1
    `, [quarantineId, reviewerId, notes || 'Approved after review']);

    // Insert the approved data into the main table
    await this.insertValidatedRecord(quarantined.record_type, record);

    // Log the approval
    await this.logQuarantineAction(quarantineId, 'approved', reviewerId, notes);

    this.fastify.log.info({
      msg: 'Quarantined clinical data approved and inserted',
      quarantineId,
      recordId: record.id,
      recordType: quarantined.record_type,
      reviewerId
    });
  }

  async rejectQuarantinedData(quarantineId: string, reviewerId: string, reason: string): Promise<void> {
    const pool = connectDatabase();

    await pool.query(`
      UPDATE data_quarantine
      SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
      WHERE id = $1
    `, [quarantineId, reviewerId, reason]);

    // Log the rejection
    await this.logQuarantineAction(quarantineId, 'rejected', reviewerId, reason);

    this.fastify.log.info({
      msg: 'Quarantined clinical data rejected',
      quarantineId,
      reviewerId,
      reason
    });
  }

  async getQuarantinedData(): Promise<QuarantinedRecord[]> {
    const pool = connectDatabase();
    const result = await pool.query(`
      SELECT * FROM data_quarantine
      WHERE status = 'pending_review'
      ORDER BY quarantined_at DESC
    `);

    return result.rows.map(row => ({
      ...row,
      data: JSON.parse(row.data),
      validation_errors: JSON.parse(row.validation_errors)
    }));
  }

  async getDataQualityMetrics(): Promise<{
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    quarantinedRecords: number;
    averageValidationScore: number;
    commonValidationErrors: { error: string; count: number }[];
  }> {
    const pool = connectDatabase();

    // Get total records across all clinical tables
    const consultations = await pool.query('SELECT COUNT(*) as count FROM consultations');
    const workflows = await pool.query('SELECT COUNT(*) as count FROM clinical_workflows');
    const records = await pool.query('SELECT COUNT(*) as count FROM medical_records');
    const cds = await pool.query('SELECT COUNT(*) as count FROM clinical_decision_support');

    const totalRecords = parseInt(consultations.rows[0].count) +
                        parseInt(workflows.rows[0].count) +
                        parseInt(records.rows[0].count) +
                        parseInt(cds.rows[0].count);

    // Get quarantined records
    const quarantineStats = await this.getQuarantineStatistics();

    // For now, return basic metrics (would need more complex logic for full metrics)
    return {
      totalRecords,
      validRecords: totalRecords - quarantineStats.pendingReview,
      invalidRecords: quarantineStats.pendingReview,
      quarantinedRecords: quarantineStats.totalQuarantined,
      averageValidationScore: 0.92, // Placeholder - would calculate based on validation history
      commonValidationErrors: [] // Would need to analyze quarantine data
    };
  }

  async getQuarantineStatistics(): Promise<{
    totalQuarantined: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    averageReviewTime: number;
  }> {
    const pool = connectDatabase();
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_quarantined,
        COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        AVG(EXTRACT(EPOCH FROM (reviewed_at - quarantined_at))) as avg_review_time_seconds
      FROM data_quarantine
    `);

    const stats = result.rows[0];
    return {
      totalQuarantined: parseInt(stats.total_quarantined),
      pendingReview: parseInt(stats.pending_review),
      approved: parseInt(stats.approved),
      rejected: parseInt(stats.rejected),
      averageReviewTime: parseFloat(stats.avg_review_time_seconds) || 0
    };
  }

  // Private validation methods
  private async validateConsultation(consultation: Consultation, errors: string[], warnings: string[]): Promise<void> {
    if (!consultation.provider_id) {
      errors.push('Provider ID is required for consultation');
    }

    if (!consultation.consultation_type) {
      errors.push('Consultation type is required');
    }

    const validTypes = ['initial', 'followup', 'emergency', 'telemedicine'];
    if (consultation.consultation_type && !validTypes.includes(consultation.consultation_type)) {
      errors.push(`Invalid consultation type. Must be one of: ${validTypes.join(', ')}`);
    }

    const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];
    if (consultation.status && !validStatuses.includes(consultation.status)) {
      errors.push(`Invalid consultation status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (consultation.status === 'completed' && !consultation.completed_at) {
      warnings.push('Completed consultation should have a completion timestamp');
    }

    if (consultation.chief_complaint && consultation.chief_complaint.length < 5) {
      warnings.push('Chief complaint seems too brief');
    }

    // Validate vital signs
    if (consultation.vital_signs) {
      const vitals = consultation.vital_signs;
      if (vitals.heart_rate && (vitals.heart_rate < 30 || vitals.heart_rate > 250)) {
        errors.push('Heart rate out of normal range (30-250 bpm)');
      }
      if (vitals.temperature && (vitals.temperature < 30 || vitals.temperature > 45)) {
        errors.push('Temperature out of normal range (30-45°C)');
      }
      if (vitals.respiratory_rate && (vitals.respiratory_rate < 5 || vitals.respiratory_rate > 60)) {
        errors.push('Respiratory rate out of normal range (5-60 breaths/min)');
      }
    }
  }

  private async validateClinicalWorkflow(workflow: ClinicalWorkflow, errors: string[], warnings: string[]): Promise<void> {
    if (!workflow.workflow_type) {
      errors.push('Workflow type is required');
    }

    const validTypes = ['consultation', 'admission', 'discharge', 'transfer', 'procedure'];
    if (workflow.workflow_type && !validTypes.includes(workflow.workflow_type)) {
      errors.push(`Invalid workflow type. Must be one of: ${validTypes.join(', ')}`);
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'failed'];
    if (workflow.status && !validStatuses.includes(workflow.status)) {
      errors.push(`Invalid workflow status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent', 'critical'];
    if (workflow.priority && !validPriorities.includes(workflow.priority)) {
      errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    if (workflow.steps && workflow.steps.length === 0) {
      warnings.push('Workflow should have at least one step defined');
    }

    // Validate workflow steps
    if (workflow.steps) {
      for (const step of workflow.steps) {
        if (!step.id || !step.name) {
          errors.push('Workflow steps must have id and name');
          break;
        }
      }
    }
  }

  private async validateMedicalRecord(record: MedicalRecord, errors: string[], warnings: string[]): Promise<void> {
    if (!record.record_type) {
      errors.push('Record type is required');
    }

    const validTypes = ['consultation', 'lab_result', 'imaging', 'prescription', 'procedure', 'discharge'];
    if (record.record_type && !validTypes.includes(record.record_type)) {
      errors.push(`Invalid record type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!record.title || record.title.trim().length === 0) {
      errors.push('Record title is required');
    }

    if (!record.content || record.content.trim().length === 0) {
      errors.push('Record content is required');
    }

    if (!record.provider_id) {
      errors.push('Provider ID is required for medical record');
    }

    if (record.record_date && new Date(record.record_date) > new Date()) {
      errors.push('Record date cannot be in the future');
    }

    if (record.is_confidential && (!record.tags || !record.tags.includes('confidential'))) {
      warnings.push('Confidential records should be tagged as confidential');
    }
  }

  private async validateClinicalDecisionSupport(cds: ClinicalDecisionSupport, errors: string[], warnings: string[]): Promise<void> {
    if (!cds.rule_type) {
      errors.push('Rule type is required');
    }

    const validTypes = ['drug_interaction', 'allergy_alert', 'duplicate_therapy', 'dose_check', 'diagnosis_suggestion'];
    if (cds.rule_type && !validTypes.includes(cds.rule_type)) {
      errors.push(`Invalid rule type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!cds.severity) {
      errors.push('Severity is required');
    }

    const validSeverities = ['info', 'warning', 'critical'];
    if (cds.severity && !validSeverities.includes(cds.severity)) {
      errors.push(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
    }

    if (!cds.title || cds.title.trim().length === 0) {
      errors.push('CDS title is required');
    }

    if (!cds.message || cds.message.trim().length === 0) {
      errors.push('CDS message is required');
    }

    if (cds.severity === 'critical' && !cds.is_acknowledged) {
      warnings.push('Critical CDS alerts should be acknowledged');
    }
  }

  private async validateReferences(recordType: string, record: any, errors: string[], warnings: string[]): Promise<void> {
    const pool = connectDatabase();

    // Check if patient exists
    const patientResult = await pool.query('SELECT id FROM patients WHERE id = $1', [record.patient_id]);
    if (patientResult.rows.length === 0) {
      errors.push(`Patient ${record.patient_id} does not exist`);
    }

    // Check if hospital exists
    const hospitalResult = await pool.query('SELECT id FROM hospitals WHERE id = $1', [record.hospital_id]);
    if (hospitalResult.rows.length === 0) {
      errors.push(`Hospital ${record.hospital_id} does not exist`);
    }

    // Type-specific reference checks
    switch (recordType) {
      case 'consultation':
        if (record.provider_id) {
          const providerResult = await pool.query('SELECT id FROM providers WHERE id = $1', [record.provider_id]);
          if (providerResult.rows.length === 0) {
            errors.push(`Provider ${record.provider_id} does not exist`);
          }
        }
        break;

      case 'medical_record':
        if (record.provider_id) {
          const providerResult = await pool.query('SELECT id FROM providers WHERE id = $1', [record.provider_id]);
          if (providerResult.rows.length === 0) {
            errors.push(`Provider ${record.provider_id} does not exist`);
          }
        }
        break;
    }
  }

  private async validateHIPAACompliance(recordType: string, record: any, errors: string[], warnings: string[]): Promise<void> {
    // Check for PHI in various fields
    const phiFields = ['chief_complaint', 'history_of_present_illness', 'assessment', 'plan', 'progress_notes', 'clinical_notes', 'content'];

    for (const field of phiFields) {
      if (record[field]) {
        const phiPatterns = [
          /\b\d{3}-\d{2}-\d{4}\b/, // SSN
          /\b\d{10}\b/, // Phone number
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
        ];

        for (const pattern of phiPatterns) {
          if (pattern.test(record[field])) {
            warnings.push(`${field} may contain protected health information (PHI)`);
            break;
          }
        }
      }
    }

    // Check for sensitive health information
    if (recordType === 'medical_record' && record.is_confidential === false) {
      const sensitiveTerms = ['HIV', 'AIDS', 'mental health', 'substance abuse', 'domestic violence'];
      for (const term of sensitiveTerms) {
        if (record.content && record.content.toLowerCase().includes(term.toLowerCase())) {
          warnings.push('Record may contain sensitive health information and should be marked confidential');
          break;
        }
      }
    }
  }

  private async insertValidatedRecord(recordType: string, record: any): Promise<void> {
    const pool = connectDatabase();

    switch (recordType) {
      case 'consultation':
        await pool.query(`
          INSERT INTO consultations (id, patient_id, provider_id, appointment_id, hospital_id, consultation_type, status, chief_complaint, history_of_present_illness, vital_signs, physical_examination, assessment, plan, diagnosis_codes, procedure_codes, medications_prescribed, lab_orders, imaging_orders, follow_up_instructions, progress_notes, clinical_notes, started_at, completed_at, created_at, updated_at, created_by, updated_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            assessment = EXCLUDED.assessment,
            plan = EXCLUDED.plan,
            progress_notes = EXCLUDED.progress_notes,
            clinical_notes = EXCLUDED.clinical_notes,
            completed_at = EXCLUDED.completed_at,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
        `, [
          record.id, record.patient_id, record.provider_id, record.appointment_id,
          record.hospital_id, record.consultation_type, record.status, record.chief_complaint,
          record.history_of_present_illness, JSON.stringify(record.vital_signs), record.physical_examination,
          record.assessment, record.plan, JSON.stringify(record.diagnosis_codes),
          JSON.stringify(record.procedure_codes), JSON.stringify(record.medications_prescribed),
          JSON.stringify(record.lab_orders), JSON.stringify(record.imaging_orders),
          record.follow_up_instructions, record.progress_notes, record.clinical_notes,
          record.started_at, record.completed_at, record.created_at, record.updated_at,
          record.created_by, record.updated_by
        ]);
        break;

      case 'clinical_workflow':
        await pool.query(`
          INSERT INTO clinical_workflows (id, consultation_id, patient_id, hospital_id, workflow_type, status, priority, current_step, steps, metadata, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            current_step = EXCLUDED.current_step,
            steps = EXCLUDED.steps,
            updated_at = EXCLUDED.updated_at
        `, [
          record.id, record.consultation_id, record.patient_id, record.hospital_id,
          record.workflow_type, record.status, record.priority, record.current_step,
          JSON.stringify(record.steps), JSON.stringify(record.metadata),
          record.created_at, record.updated_at
        ]);
        break;

      case 'medical_record':
        await pool.query(`
          INSERT INTO medical_records (id, patient_id, hospital_id, record_type, record_date, provider_id, title, content, attachments, tags, is_confidential, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            attachments = EXCLUDED.attachments,
            tags = EXCLUDED.tags,
            updated_at = EXCLUDED.updated_at
        `, [
          record.id, record.patient_id, record.hospital_id, record.record_type, record.record_date,
          record.provider_id, record.title, record.content, JSON.stringify(record.attachments),
          JSON.stringify(record.tags), record.is_confidential, record.created_at, record.updated_at
        ]);
        break;

      case 'clinical_decision_support':
        await pool.query(`
          INSERT INTO clinical_decision_support (id, patient_id, consultation_id, rule_type, severity, title, message, recommendations, evidence, is_acknowledged, acknowledged_by, acknowledged_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            is_acknowledged = EXCLUDED.is_acknowledged,
            acknowledged_by = EXCLUDED.acknowledged_by,
            acknowledged_at = EXCLUDED.acknowledged_at
        `, [
          record.id, record.patient_id, record.consultation_id, record.rule_type, record.severity, record.title,
          record.message, JSON.stringify(record.recommendations), record.evidence, record.is_acknowledged,
          record.acknowledged_by, record.acknowledged_at, record.created_at
        ]);
        break;
    }
  }

  private async logQuarantineAction(
    quarantineId: string,
    action: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_audit_log (id, record_id, record_type, action, details, performed_at, performed_by)
      VALUES (gen_random_uuid(), (SELECT record_id FROM data_quarantine WHERE id = $1), (SELECT record_type FROM data_quarantine WHERE id = $1), $2, $3, NOW(), $4)
    `, [
      quarantineId,
      `quarantine_${action}`,
      JSON.stringify({ quarantineId, action, notes }),
      reviewerId
    ]);
  }
}