import { FastifyInstance } from 'fastify';
import { Patient } from '../types/patient';
import { connectDatabase } from '../config/database';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  completenessScore: number;
  accuracyScore: number;
  consistencyScore: number;
  lastValidationDate: Date;
}

export class DataValidationService {
  constructor(private fastify: FastifyInstance) {}

  async validatePatientData(patient: Patient): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required field validation
    this.validateRequiredFields(patient, errors);

    // Data type validation
    this.validateDataTypes(patient, errors);

    // Business rule validation
    this.validateBusinessRules(patient, errors, warnings);

    // HIPAA compliance validation
    this.validateHIPAACompliance(patient, errors, warnings);

    // Data quality checks
    this.validateDataQuality(patient, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateBatchPatients(patients: Patient[]): Promise<{
    validPatients: Patient[];
    invalidPatients: { patient: Patient; validation: ValidationResult }[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      errorCount: number;
      warningCount: number;
    };
  }> {
    const validPatients: Patient[] = [];
    const invalidPatients: { patient: Patient; validation: ValidationResult }[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const patient of patients) {
      const validation = await this.validatePatientData(patient);

      if (validation.isValid) {
        validPatients.push(patient);
      } else {
        invalidPatients.push({ patient, validation });
      }

      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;
    }

    return {
      validPatients,
      invalidPatients,
      summary: {
        total: patients.length,
        valid: validPatients.length,
        invalid: invalidPatients.length,
        errorCount: totalErrors,
        warningCount: totalWarnings
      }
    };
  }

  async getDataQualityMetrics(): Promise<DataQualityMetrics> {
    const totalRecords = await this.getTotalPatientCount();
    const validationResults = await this.getRecentValidationResults();

    let validRecords = 0;
    let completenessScore = 0;
    let accuracyScore = 0;
    let consistencyScore = 0;

    if (validationResults.length > 0) {
      validRecords = validationResults.filter(r => r.isValid).length;

      // Calculate completeness score (percentage of required fields present)
      const completenessScores = validationResults.map(r => this.calculateCompletenessScore(r.patient));
      completenessScore = completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length;

      // Calculate accuracy score (inverse of error rate)
      const errorRates = validationResults.map(r => r.errors.length / 10); // Normalize to 0-1 scale
      accuracyScore = 1 - (errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length);

      // Calculate consistency score (based on data format consistency)
      const consistencyScores = validationResults.map(r => this.calculateConsistencyScore(r.patient));
      consistencyScore = consistencyScores.reduce((sum, score) => sum + score, 0) / consistencyScores.length;
    }

    return {
      totalRecords,
      validRecords,
      invalidRecords: totalRecords - validRecords,
      completenessScore: Math.round(completenessScore * 100) / 100,
      accuracyScore: Math.round(accuracyScore * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      lastValidationDate: new Date()
    };
  }

  async quarantineInvalidData(patient: Patient, validationResult: ValidationResult): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO data_quarantine (id, patient_id, patient_data, validation_errors, validation_warnings, quarantined_at, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), 'pending_review')
    `, [
      patient.id,
      JSON.stringify(patient),
      JSON.stringify(validationResult.errors),
      JSON.stringify(validationResult.warnings)
    ]);

    this.fastify.log.warn(`Patient ${patient.id} quarantined due to validation errors: ${validationResult.errors.length} errors`);
  }

  async getQuarantinedData(limit: number = 50): Promise<any[]> {
    const pool = connectDatabase();
    const result = await pool.query(`
      SELECT * FROM data_quarantine
      WHERE status = 'pending_review'
      ORDER BY quarantined_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row: any) => ({
      id: row.id,
      patientId: row.patient_id,
      patientData: JSON.parse(row.patient_data),
      validationErrors: JSON.parse(row.validation_errors),
      validationWarnings: JSON.parse(row.validation_warnings),
      quarantinedAt: new Date(row.quarantined_at),
      status: row.status
    }));
  }

  async approveQuarantinedData(quarantineId: string, approvedBy: string): Promise<void> {
    const quarantinedRecord = await this.getQuarantinedRecord(quarantineId);
    if (!quarantinedRecord) {
      throw new Error(`Quarantined record ${quarantineId} not found`);
    }

    // Insert the approved data into the main patients table
    const patientData = quarantinedRecord.patientData;
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO patients (id, hospital_id, medical_record_number, first_name, last_name, date_of_birth, gender, email, phone, status, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        hospital_id = EXCLUDED.hospital_id,
        medical_record_number = EXCLUDED.medical_record_number,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        date_of_birth = EXCLUDED.date_of_birth,
        gender = EXCLUDED.gender,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `, [
      patientData.id,
      patientData.hospital_id,
      patientData.medical_record_number,
      patientData.first_name,
      patientData.last_name,
      patientData.date_of_birth,
      patientData.gender,
      patientData.email,
      patientData.phone,
      patientData.status,
      patientData.created_at,
      new Date().toISOString(),
      patientData.created_by,
      approvedBy
    ]);

    // Mark as approved
    await pool.query(`
      UPDATE data_quarantine
      SET status = 'approved', approved_by = $2, approved_at = NOW()
      WHERE id = $1
    `, [quarantineId, approvedBy]);

    this.fastify.log.info(`Approved quarantined data for patient ${patientData.id}`);
  }

  async rejectQuarantinedData(quarantineId: string, rejectedBy: string, reason: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE data_quarantine
      SET status = 'rejected', rejected_by = $2, rejected_at = NOW(), rejection_reason = $3
      WHERE id = $1
    `, [quarantineId, rejectedBy, reason]);

    this.fastify.log.info(`Rejected quarantined data ${quarantineId}: ${reason}`);
  }

  // Private helper methods
  private validateRequiredFields(patient: Patient, errors: ValidationError[]): void {
    const requiredFields = ['id', 'hospital_id', 'medical_record_number', 'first_name', 'last_name', 'date_of_birth'];

    for (const field of requiredFields) {
      if (!patient[field as keyof Patient]) {
        errors.push({
          field,
          code: 'REQUIRED_FIELD_MISSING',
          message: `${field} is required`,
          severity: 'error'
        });
      }
    }
  }

  private validateDataTypes(patient: Patient, errors: ValidationError[]): void {
    // Email validation
    if (patient.email && !this.isValidEmail(patient.email)) {
      errors.push({
        field: 'email',
        code: 'INVALID_EMAIL_FORMAT',
        message: 'Email format is invalid',
        severity: 'error'
      });
    }

    // Phone validation
    if (patient.phone && !this.isValidPhone(patient.phone)) {
      errors.push({
        field: 'phone',
        code: 'INVALID_PHONE_FORMAT',
        message: 'Phone format is invalid',
        severity: 'error'
      });
    }

    // Date of birth validation
    if (patient.date_of_birth && !this.isValidDate(patient.date_of_birth)) {
      errors.push({
        field: 'date_of_birth',
        code: 'INVALID_DATE_FORMAT',
        message: 'Date of birth format is invalid',
        severity: 'error'
      });
    }
  }

  private validateBusinessRules(patient: Patient, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Age validation
    if (patient.date_of_birth) {
      const age = this.calculateAge(new Date(patient.date_of_birth));
      if (age < 0) {
        errors.push({
          field: 'date_of_birth',
          code: 'INVALID_BIRTH_DATE',
          message: 'Date of birth cannot be in the future',
          severity: 'error'
        });
      } else if (age > 150) {
        warnings.push({
          field: 'date_of_birth',
          code: 'UNUSUALLY_OLD_AGE',
          message: 'Patient age seems unusually high'
        });
      }
    }

    // Name length validation
    if (patient.first_name && patient.first_name.length > 50) {
      warnings.push({
        field: 'first_name',
        code: 'NAME_TOO_LONG',
        message: 'First name is unusually long'
      });
    }

    if (patient.last_name && patient.last_name.length > 50) {
      warnings.push({
        field: 'last_name',
        code: 'NAME_TOO_LONG',
        message: 'Last name is unusually long'
      });
    }
  }

  private validateHIPAACompliance(patient: Patient, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check for PHI in logs or non-encrypted fields
    const phiFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'];

    for (const field of phiFields) {
      const value = patient[field as keyof Patient];
      if (typeof value === 'string' && value.length > 0) {
        // Basic check for potential PHI exposure
        if (value.includes('test') || value.includes('sample')) {
          warnings.push({
            field,
            code: 'POTENTIAL_TEST_DATA',
            message: 'Field may contain test data'
          });
        }
      }
    }
  }

  private validateDataQuality(patient: Patient, warnings: ValidationWarning[]): void {
    // Check for duplicate emails
    if (patient.email) {
      // This would typically check against a database
      // For now, just a placeholder
    }

    // Check for suspicious patterns
    if (patient.first_name && patient.last_name && patient.first_name === patient.last_name) {
      warnings.push({
        field: 'first_name,last_name',
        code: 'SUSPICIOUS_NAME_PATTERN',
        message: 'First and last names are identical'
      });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - adjust based on your requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private isValidDate(date: string): boolean {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private calculateCompletenessScore(patient: Patient): number {
    const requiredFields = ['id', 'hospital_id', 'medical_record_number', 'first_name', 'last_name', 'date_of_birth', 'email'];
    const presentFields = requiredFields.filter(field => patient[field as keyof Patient]);
    return presentFields.length / requiredFields.length;
  }

  private calculateConsistencyScore(patient: Patient): number {
    let score = 1.0;

    // Deduct for inconsistent formats
    if (patient.first_name && !/^[A-Za-z\s\-']+$/.test(patient.first_name)) {
      score -= 0.1;
    }
    if (patient.last_name && !/^[A-Za-z\s\-']+$/.test(patient.last_name)) {
      score -= 0.1;
    }

    return Math.max(0, score);
  }

  private async getTotalPatientCount(): Promise<number> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT COUNT(*) as count FROM patients');
    return parseInt(result.rows[0].count);
  }

  private async getRecentValidationResults(): Promise<{ patient: Patient; isValid: boolean; errors: ValidationError[] }[]> {
    // This would typically cache recent validation results
    // For now, return empty array
    return [];
  }

  private async getQuarantinedRecord(quarantineId: string): Promise<any> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM data_quarantine WHERE id = $1', [quarantineId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      patientId: row.patient_id,
      patientData: JSON.parse(row.patient_data),
      validationErrors: JSON.parse(row.validation_errors),
      validationWarnings: JSON.parse(row.validation_warnings),
      quarantinedAt: new Date(row.quarantined_at),
      status: row.status
    };
  }
}