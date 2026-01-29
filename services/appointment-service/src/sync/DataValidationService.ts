import { FastifyInstance } from 'fastify';
import { Appointment } from '../types/appointment';
import { connectDatabase } from '../config/database';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface QuarantinedRecord {
  id: string;
  appointment_id: string;
  data: Appointment;
  validation_errors: string[];
  quarantined_at: Date;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Date;
  review_notes?: string;
}

export class DataValidationService {
  constructor(private fastify: FastifyInstance) {}

  async validateAppointmentData(appointment: Appointment): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!appointment.id) {
      errors.push('Appointment ID is required');
    }

    if (!appointment.patient_id) {
      errors.push('Patient ID is required');
    }

    if (!appointment.provider_id) {
      errors.push('Provider ID is required');
    }

    if (!appointment.hospital_id) {
      errors.push('Hospital ID is required');
    }

    if (!appointment.appointment_type) {
      errors.push('Appointment type is required');
    }

    if (!appointment.scheduled_at) {
      errors.push('Scheduled date/time is required');
    }

    // Data type and format validation
    if (appointment.scheduled_at && new Date(appointment.scheduled_at) < new Date()) {
      errors.push('Cannot schedule appointment in the past');
    }

    if (appointment.duration && (appointment.duration < 15 || appointment.duration > 480)) {
      errors.push('Appointment duration must be between 15 and 480 minutes');
    }

    // Status validation
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (appointment.status && !validStatuses.includes(appointment.status)) {
      errors.push(`Invalid appointment status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Business rule validation
    if (appointment.status === 'completed' && !appointment.updated_at) {
      warnings.push('Completed appointment should have an updated timestamp');
    }

    // Virtual meeting validation
    if (appointment.location === 'virtual' && !appointment.virtual_meeting_link) {
      warnings.push('Virtual appointments should have a meeting link');
    }

    // Cross-reference validation (would need database checks)
    await this.validateReferences(appointment, errors, warnings);

    // HIPAA compliance validation
    await this.validateHIPAACompliance(appointment, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async quarantineInvalidData(appointment: Appointment, validationErrors: string[]): Promise<string> {
    const pool = connectDatabase();

    const quarantineId = `quarantine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(`
      INSERT INTO data_quarantine (id, appointment_id, data, validation_errors, quarantined_at, status)
      VALUES ($1, $2, $3, $4, NOW(), 'pending_review')
    `, [
      quarantineId,
      appointment.id,
      JSON.stringify(appointment),
      JSON.stringify(validationErrors)
    ]);

    this.fastify.log.warn({
      msg: 'Appointment data quarantined due to validation errors',
      appointmentId: appointment.id,
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
    const appointment: Appointment = JSON.parse(quarantined.data);

    // Re-validate the data (in case rules changed)
    const validation = await this.validateAppointmentData(appointment);
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
    await this.insertValidatedAppointment(appointment);

    // Log the approval
    await this.logQuarantineAction(quarantineId, 'approved', reviewerId, notes);

    this.fastify.log.info({
      msg: 'Quarantined appointment data approved and inserted',
      quarantineId,
      appointmentId: appointment.id,
      reviewerId
    });
  }

  async rejectQuarantinedData(quarantineId: string, reviewerId: string, notes: string): Promise<void> {
    const pool = connectDatabase();

    await pool.query(`
      UPDATE data_quarantine
      SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
      WHERE id = $1
    `, [quarantineId, reviewerId, notes]);

    // Log the rejection
    await this.logQuarantineAction(quarantineId, 'rejected', reviewerId, notes);

    this.fastify.log.info({
      msg: 'Quarantined appointment data rejected',
      quarantineId,
      reviewerId,
      notes
    });
  }

  async getQuarantinedRecords(): Promise<QuarantinedRecord[]> {
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

  async validateBatchAppointments(appointments: Appointment[]): Promise<{
    valid: Appointment[];
    invalid: { appointment: Appointment; errors: string[]; warnings: string[] }[];
    quarantined: string[];
  }> {
    const valid: Appointment[] = [];
    const invalid: { appointment: Appointment; errors: string[]; warnings: string[] }[] = [];
    const quarantined: string[] = [];

    for (const appointment of appointments) {
      const validation = await this.validateAppointmentData(appointment);

      if (validation.isValid) {
        valid.push(appointment);
      } else {
        invalid.push({
          appointment,
          errors: validation.errors,
          warnings: validation.warnings
        });

        // Auto-quarantine if there are critical errors
        if (validation.errors.length > 0) {
          const quarantineId = await this.quarantineInvalidData(appointment, validation.errors);
          quarantined.push(quarantineId);
        }
      }
    }

    return { valid, invalid, quarantined };
  }

  async getDataQualityMetrics(): Promise<{
    totalAppointments: number;
    validAppointments: number;
    invalidAppointments: number;
    quarantinedRecords: number;
    averageValidationScore: number;
    commonValidationErrors: { error: string; count: number }[];
  }> {
    const pool = connectDatabase();

    // Get total appointments
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM appointments');
    const totalAppointments = parseInt(totalResult.rows[0].count);

    // Get quarantined records
    const quarantineStats = await this.getQuarantineStatistics();

    // For now, return basic metrics (would need more complex logic for full metrics)
    return {
      totalAppointments,
      validAppointments: totalAppointments - quarantineStats.pendingReview,
      invalidAppointments: quarantineStats.pendingReview,
      quarantinedRecords: quarantineStats.totalQuarantined,
      averageValidationScore: 0.95, // Placeholder
      commonValidationErrors: [] // Would need to analyze quarantine data
    };
  }

  async getQuarantinedData(): Promise<QuarantinedRecord[]> {
    return this.getQuarantinedRecords();
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

  // Private helper methods
  private async validateReferences(appointment: Appointment, errors: string[], warnings: string[]): Promise<void> {
    const pool = connectDatabase();

    // Check if patient exists
    const patientResult = await pool.query('SELECT id FROM patients WHERE id = $1', [appointment.patient_id]);
    if (patientResult.rows.length === 0) {
      errors.push(`Patient ${appointment.patient_id} does not exist`);
    }

    // Check if provider exists
    const providerResult = await pool.query('SELECT id FROM providers WHERE id = $1', [appointment.provider_id]);
    if (providerResult.rows.length === 0) {
      errors.push(`Provider ${appointment.provider_id} does not exist`);
    }

    // Check if hospital exists
    const hospitalResult = await pool.query('SELECT id FROM hospitals WHERE id = $1', [appointment.hospital_id]);
    if (hospitalResult.rows.length === 0) {
      errors.push(`Hospital ${appointment.hospital_id} does not exist`);
    }

    // Check for scheduling conflicts
    const conflictResult = await pool.query(`
      SELECT id FROM appointments
      WHERE provider_id = $1
        AND scheduled_at < $2::timestamp + INTERVAL '1 minute' * $3
        AND scheduled_at + INTERVAL '1 minute' * duration > $2
        AND id != $4
        AND status NOT IN ('cancelled', 'no_show')
    `, [
      appointment.provider_id,
      appointment.scheduled_at,
      appointment.duration,
      appointment.id
    ]);

    if (conflictResult.rows.length > 0) {
      errors.push('Appointment conflicts with existing scheduled appointment for this provider');
    }
  }

  private async validateHIPAACompliance(appointment: Appointment, errors: string[], warnings: string[]): Promise<void> {
    // Check for PHI in notes (basic check)
    if (appointment.notes) {
      const phiPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b\d{10}\b/, // Phone number
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      ];

      for (const pattern of phiPatterns) {
        if (pattern.test(appointment.notes)) {
          warnings.push('Notes may contain protected health information (PHI)');
          break;
        }
      }
    }

    // Check for unauthorized access patterns
    if (appointment.reason_for_visit) {
      // This would integrate with HIPAA compliance rules
      // For now, just a basic check
      const sensitiveTerms = ['HIV', 'AIDS', 'mental health', 'substance abuse'];
      for (const term of sensitiveTerms) {
        if (appointment.reason_for_visit.toLowerCase().includes(term)) {
          warnings.push('Visit reason may contain sensitive health information');
          break;
        }
      }
    }
  }

  private async insertValidatedAppointment(appointment: Appointment): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO appointments (id, patient_id, provider_id, hospital_id, appointment_type, scheduled_at, duration, status, notes, reason_for_visit, location, virtual_meeting_link, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        patient_id = EXCLUDED.patient_id,
        provider_id = EXCLUDED.provider_id,
        hospital_id = EXCLUDED.hospital_id,
        appointment_type = EXCLUDED.appointment_type,
        scheduled_at = EXCLUDED.scheduled_at,
        duration = EXCLUDED.duration,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        reason_for_visit = EXCLUDED.reason_for_visit,
        location = EXCLUDED.location,
        virtual_meeting_link = EXCLUDED.virtual_meeting_link,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `, [
      appointment.id,
      appointment.patient_id,
      appointment.provider_id,
      appointment.hospital_id,
      appointment.appointment_type,
      appointment.scheduled_at,
      appointment.duration,
      appointment.status,
      appointment.notes,
      appointment.reason_for_visit,
      appointment.location,
      appointment.virtual_meeting_link,
      appointment.created_at,
      appointment.updated_at,
      appointment.created_by,
      appointment.updated_by
    ]);
  }

  private async logQuarantineAction(
    quarantineId: string,
    action: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_audit_log (id, appointment_id, action, details, performed_at, performed_by)
      VALUES (gen_random_uuid(), (SELECT appointment_id FROM data_quarantine WHERE id = $1), $2, $3, NOW(), $4)
    `, [
      quarantineId,
      `quarantine_${action}`,
      JSON.stringify({ quarantineId, action, notes }),
      reviewerId
    ]);
  }
}