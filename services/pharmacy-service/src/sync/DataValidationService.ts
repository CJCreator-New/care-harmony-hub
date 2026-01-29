import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';

interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'enum' | 'custom';
  value?: any;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

interface QuarantinedData {
  id: string;
  recordType: 'prescription' | 'medication' | 'inventory_item' | 'pharmacy_order';
  recordId: string;
  data: any;
  validationErrors: string[];
  quarantinedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  action: 'pending' | 'approved' | 'rejected' | 'corrected';
  correctedData?: any;
  hospitalId: string;
}

export class DataValidationService {
  private validationRules: Record<string, ValidationRule[]> = {
    prescription: [
      { field: 'patient_id', type: 'required', message: 'Patient ID is required', severity: 'error' },
      { field: 'medication_id', type: 'required', message: 'Medication ID is required', severity: 'error' },
      { field: 'provider_id', type: 'required', message: 'Provider ID is required', severity: 'error' },
      { field: 'dosage', type: 'required', message: 'Dosage is required', severity: 'error' },
      { field: 'frequency', type: 'required', message: 'Frequency is required', severity: 'error' },
      { field: 'quantity', type: 'range', value: { min: 0.1 }, message: 'Quantity must be positive', severity: 'error' },
      { field: 'status', type: 'enum', value: ['active', 'completed', 'cancelled', 'suspended'], message: 'Invalid status', severity: 'error' },
      { field: 'start_date', type: 'required', message: 'Start date is required', severity: 'error' }
    ],
    medication: [
      { field: 'name', type: 'required', message: 'Medication name is required', severity: 'error' },
      { field: 'strength', type: 'required', message: 'Strength is required', severity: 'error' },
      { field: 'form', type: 'enum', value: ['tablet', 'capsule', 'liquid', 'injection', 'topical', 'inhaler'], message: 'Invalid form', severity: 'error' },
      { field: 'category', type: 'required', message: 'Category is required', severity: 'error' },
      { field: 'dea_schedule', type: 'custom', message: 'Invalid DEA schedule for controlled substance', severity: 'error' }
    ],
    inventory_item: [
      { field: 'medication_id', type: 'required', message: 'Medication ID is required', severity: 'error' },
      { field: 'batch_number', type: 'required', message: 'Batch number is required', severity: 'error' },
      { field: 'expiration_date', type: 'required', message: 'Expiration date is required', severity: 'error' },
      { field: 'quantity_on_hand', type: 'range', value: { min: 0 }, message: 'Quantity on hand cannot be negative', severity: 'error' },
      { field: 'quantity_reserved', type: { min: 0 }, message: 'Quantity reserved cannot be negative', severity: 'error' },
      { field: 'unit_cost', type: 'range', value: { min: 0 }, message: 'Unit cost cannot be negative', severity: 'error' },
      { field: 'selling_price', type: 'range', value: { min: 0 }, message: 'Selling price cannot be negative', severity: 'error' },
      { field: 'expiration_date', type: 'custom', message: 'Expiration date cannot be in the past', severity: 'warning' }
    ],
    pharmacy_order: [
      { field: 'prescription_id', type: 'required', message: 'Prescription ID is required', severity: 'error' },
      { field: 'patient_id', type: 'required', message: 'Patient ID is required', severity: 'error' },
      { field: 'medication_id', type: 'required', message: 'Medication ID is required', severity: 'error' },
      { field: 'quantity', type: 'range', value: { min: 0.1 }, message: 'Order quantity must be positive', severity: 'error' },
      { field: 'status', type: 'enum', value: ['pending', 'filled', 'partially_filled', 'cancelled'], message: 'Invalid order status', severity: 'error' }
    ]
  };

  async validateData(data: any, type: string): Promise<ValidationResult> {
    try {
      const rules = this.validationRules[type];
      if (!rules) {
        return { valid: false, errors: [`Unknown data type: ${type}`], warnings: [] };
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      let sanitizedData = { ...data };

      for (const rule of rules) {
        const value = data[rule.field];
        const validation = this.validateField(value, rule);

        if (!validation.valid) {
          if (rule.severity === 'error') {
            errors.push(validation.message);
          } else {
            warnings.push(validation.message);
          }
        }

        // Apply sanitization if available
        if (validation.sanitizedValue !== undefined) {
          sanitizedData[rule.field] = validation.sanitizedValue;
        }
      }

      // Apply HIPAA sanitization
      sanitizedData = await this.sanitizeForHIPAA(sanitizedData, type);

      const valid = errors.length === 0;

      if (!valid) {
        await this.quarantineInvalidData(data, type, errors);
      }

      return {
        valid,
        errors,
        warnings,
        sanitizedData: valid ? sanitizedData : undefined
      };
    } catch (error) {
      logger.error('Data validation failed', { error, type, data });
      return { valid: false, errors: ['Validation system error'], warnings: [] };
    }
  }

  private validateField(value: any, rule: ValidationRule): { valid: boolean; message: string; sanitizedValue?: any } {
    switch (rule.type) {
      case 'required':
        return {
          valid: value !== null && value !== undefined && value !== '',
          message: rule.message
        };

      case 'range':
        const { min, max } = rule.value;
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return { valid: false, message: `${rule.field} must be a number` };
        }
        const valid = (min === undefined || numValue >= min) && (max === undefined || numValue <= max);
        return {
          valid,
          message: valid ? '' : rule.message,
          sanitizedValue: numValue
        };

      case 'enum':
        return {
          valid: rule.value.includes(value),
          message: rule.message
        };

      case 'custom':
        return this.validateCustomRule(value, rule);

      default:
        return { valid: true, message: '' };
    }
  }

  private validateCustomRule(value: any, rule: ValidationRule): { valid: boolean; message: string } {
    switch (rule.field) {
      case 'dea_schedule':
        // Validate DEA schedule for controlled substances
        const validSchedules = ['I', 'II', 'III', 'IV', 'V'];
        return {
          valid: !value || validSchedules.includes(value),
          message: rule.message
        };

      case 'expiration_date':
        // Check if expiration date is in the future
        const expDate = new Date(value);
        const now = new Date();
        return {
          valid: expDate > now,
          message: rule.message
        };

      default:
        return { valid: true, message: '' };
    }
  }

  private async sanitizeForHIPAA(data: any, type: string): Promise<any> {
    const sanitized = { ...data };

    // Remove or mask sensitive fields based on data type
    switch (type) {
      case 'prescription':
        // Sanitize personal health information
        if (sanitized.instructions) {
          sanitized.instructions = this.maskPHI(sanitized.instructions);
        }
        break;

      case 'medication':
        // Medications themselves are not PHI, but usage context might be
        break;

      case 'inventory_item':
        // Inventory data is generally not PHI
        break;

      case 'pharmacy_order':
        // Order details might contain PHI in notes
        if (sanitized.notes) {
          sanitized.notes = this.maskPHI(sanitized.notes);
        }
        break;
    }

    // Add sanitization metadata
    sanitized.encryption_metadata = {
      sanitized_at: new Date().toISOString(),
      sanitized_by: 'data_validation_service',
      phi_fields_masked: this.getPHIMaskedFields(type)
    };

    return sanitized;
  }

  private maskPHI(text: string): string {
    if (!text) return text;

    // Mask potential PHI patterns
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, 'XXX-XX-XXXX') // SSN
      .replace(/\b\d{10}\b/g, 'XXXXXXXXXX') // Phone numbers
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'email@masked.com') // Email
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, 'XX/XX/XXXX'); // Dates
  }

  private getPHIMaskedFields(type: string): string[] {
    switch (type) {
      case 'prescription':
        return ['instructions'];
      case 'pharmacy_order':
        return ['notes'];
      default:
        return [];
    }
  }

  private async quarantineInvalidData(data: any, type: string, errors: string[]): Promise<void> {
    try {
      const pool = connectDatabase();
      await pool.query(`
        INSERT INTO data_quarantine (
          record_type, record_id, data, validation_errors,
          quarantined_at, action, hospital_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        type,
        data.id || `temp_${Date.now()}`,
        JSON.stringify(data),
        JSON.stringify(errors),
        new Date(),
        'pending',
        'current_hospital_id' // Would be replaced with actual hospital ID
      ]);

      logger.warn('Data quarantined due to validation errors', { type, errors, recordId: data.id });
    } catch (error) {
      logger.error('Failed to quarantine invalid data', { error, type, data });
    }
  }

  async getQuarantinedData(): Promise<QuarantinedData[]> {
    const pool = connectDatabase();
    const result = await pool.query(
      'SELECT * FROM data_quarantine WHERE action = $1 ORDER BY quarantined_at DESC',
      ['pending']
    );
    return result.rows;
  }

  async reviewQuarantinedData(
    quarantineId: string,
    action: 'approve' | 'reject' | 'correct',
    correctedData?: any
  ): Promise<any> {
    try {
      const pool = connectDatabase();

      if (action === 'correct' && !correctedData) {
        throw new Error('Corrected data is required for correction action');
      }

      // Validate corrected data if provided
      if (action === 'correct') {
        const quarantineRecord = await pool.query('SELECT * FROM data_quarantine WHERE id = $1', [quarantineId]);
        if (quarantineRecord.rows.length === 0) {
          throw new Error('Quarantine record not found');
        }

        const validation = await this.validateData(correctedData, quarantineRecord.rows[0].record_type);
        if (!validation.valid) {
          throw new Error(`Corrected data is still invalid: ${validation.errors.join(', ')}`);
        }
      }

      // Update quarantine record
      await pool.query(`
        UPDATE data_quarantine SET
          action = $2,
          corrected_data = $3,
          reviewed_at = $4,
          reviewed_by = $5
        WHERE id = $1
      `, [
        quarantineId,
        action,
        correctedData ? JSON.stringify(correctedData) : null,
        new Date(),
        'current_user_id' // Would be replaced with actual user ID
      ]);

      // If approved or corrected, apply the data
      if (action === 'approve' || action === 'correct') {
        const finalData = action === 'correct' ? correctedData : JSON.parse(
          (await pool.query('SELECT data FROM data_quarantine WHERE id = $1', [quarantineId])).rows[0].data
        );

        await this.applyQuarantinedData(finalData);
      }

      return { success: true, action, quarantineId };
    } catch (error) {
      logger.error('Failed to review quarantined data', { error, quarantineId, action });
      throw error;
    }
  }

  private async applyQuarantinedData(data: any): Promise<void> {
    // This would apply the validated data to the appropriate service
    // Implementation would depend on the record type
    logger.info('Applying quarantined data', { recordType: data.recordType, recordId: data.id });
  }

  async getValidationStatistics(): Promise<any> {
    const pool = connectDatabase();
    const quarantined = await pool.query(`
      SELECT record_type, action, COUNT(*) as count
      FROM data_quarantine
      WHERE hospital_id = $1
      GROUP BY record_type, action
      ORDER BY record_type, action
    `, ['current_hospital_id']);

    const recentValidations = await pool.query(`
      SELECT record_type, COUNT(*) as total_validated,
             SUM(CASE WHEN validation_errors::text != '[]' THEN 1 ELSE 0 END) as had_errors
      FROM data_quarantine
      WHERE hospital_id = $1 AND reviewed_at > $2
      GROUP BY record_type
    `, ['current_hospital_id', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]); // Last 30 days

    return {
      quarantinedData: quarantined.rows,
      recentValidations: recentValidations.rows
    };
  }

  async validateBulkData(data: any[], type: string): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const item of data) {
      const result = await this.validateData(item, type);
      results.push(result);
    }

    return results;
  }

  async getComplianceReport(): Promise<any> {
    const stats = await this.getValidationStatistics();

    return {
      hipaaCompliance: {
        phiMaskingEnabled: true,
        auditLoggingEnabled: true,
        encryptionEnabled: true
      },
      dataQuality: {
        quarantineRate: this.calculateQuarantineRate(stats),
        errorRate: this.calculateErrorRate(stats),
        correctionRate: this.calculateCorrectionRate(stats)
      },
      recentActivity: stats.recentValidations
    };
  }

  private calculateQuarantineRate(stats: any): number {
    const totalQuarantined = stats.quarantinedData.reduce((sum: number, item: any) => sum + item.count, 0);
    const totalValidated = stats.recentValidations.reduce((sum: number, item: any) => sum + item.total_validated, 0);
    return totalValidated > 0 ? (totalQuarantined / totalValidated) * 100 : 0;
  }

  private calculateErrorRate(stats: any): number {
    const totalWithErrors = stats.recentValidations.reduce((sum: number, item: any) => sum + item.had_errors, 0);
    const totalValidated = stats.recentValidations.reduce((sum: number, item: any) => sum + item.total_validated, 0);
    return totalValidated > 0 ? (totalWithErrors / totalValidated) * 100 : 0;
  }

  private calculateCorrectionRate(stats: any): number {
    const corrected = stats.quarantinedData.find((item: any) => item.action === 'correct')?.count || 0;
    const totalReviewed = stats.quarantinedData
      .filter((item: any) => ['approve', 'reject', 'correct'].includes(item.action))
      .reduce((sum: number, item: any) => sum + item.count, 0);
    return totalReviewed > 0 ? (corrected / totalReviewed) * 100 : 0;
  }
}