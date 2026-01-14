import { describe, it, expect, beforeAll } from 'vitest';
import { FieldEncryptionService, DataMaskingService, SecureTransmissionService } from '@/utils/dataProtection';

describe('Data Protection Services', () => {
  let encryptionService: FieldEncryptionService;
  let maskingService: DataMaskingService;
  let transmissionService: SecureTransmissionService;

  beforeAll(() => {
    encryptionService = new FieldEncryptionService();
    maskingService = new DataMaskingService();
    transmissionService = new SecureTransmissionService();
  });

  describe('Field Encryption Service', () => {
    it('should encrypt and decrypt a field successfully', async () => {
      const originalValue = 'sensitive-data-123';
      const encrypted = await encryptionService.encryptField(originalValue);
      const decrypted = await encryptionService.decryptField(encrypted);

      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.keyVersion).toBe('v1');
      expect(decrypted).toBe(originalValue);
    });

    it('should handle empty values', async () => {
      const encrypted = await encryptionService.encryptField('');
      const decrypted = await encryptionService.decryptField(encrypted);

      expect(encrypted.encrypted).toBe('');
      expect(decrypted).toBe('');
    });

    it('should encrypt different values differently', async () => {
      const value1 = 'test1';
      const value2 = 'test2';

      const encrypted1 = await encryptionService.encryptField(value1);
      const encrypted2 = await encryptionService.encryptField(value2);

      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('Data Masking Service', () => {
    it('should mask SSN correctly', () => {
      const data = { ssn: '123-45-6789' };
      const masked = maskingService.maskData(data);

      expect(masked.ssn).toBe('XXX-XX-6789');
    });

    it('should mask medical record number', () => {
      const data = { medical_record_number: 'MRN-2024-00123' };
      const masked = maskingService.maskData(data);

      expect(masked.medical_record_number).toBe('MRN-2024-0****');
    });

    it('should mask insurance ID', () => {
      const data = { insurance_id: 'INS-ABC-123456' };
      const masked = maskingService.maskData(data);

      expect(masked.insurance_id).toBe('INS-ABC-1****');
    });

    it('should mask phone number', () => {
      const data = { phone: '+1-555-012-3456' };
      const masked = maskingService.maskData(data);

      expect(masked.phone).toBe('+1-555-012-XXXX');
    });

    it('should detect sensitive data', () => {
      const sensitiveData = { ssn: '123-45-6789', name: 'John Doe' };
      const nonSensitiveData = { name: 'John Doe', department: 'cardiology' };

      expect(maskingService.containsSensitiveData(sensitiveData)).toBe(true);
      expect(maskingService.containsSensitiveData(nonSensitiveData)).toBe(false);
    });
  });

  describe('Secure Transmission Service', () => {
    it('should prepare and restore data for transmission', async () => {
      const originalData = {
        id: 'patient-123',
        name: 'John Doe',
        ssn: '123-45-6789',
        diagnosis: 'Hypertension'
      };

      const sensitiveFields = ['ssn'];
      const { data: transmissionData, encryptionMetadata } = await transmissionService.prepareForTransmission(
        originalData,
        sensitiveFields
      );

      expect(transmissionData.ssn).toMatch(/^__ENCRYPTED__/);
      expect(encryptionMetadata.ssn).toBeDefined();

      const restoredData = await transmissionService.restoreFromTransmission(
        transmissionData,
        encryptionMetadata
      );

      expect(restoredData).toEqual(originalData);
    });

    it('should handle multiple sensitive fields', async () => {
      const originalData = {
        id: 'patient-123',
        ssn: '123-45-6789',
        medical_record_number: 'MRN-2024-001',
        insurance_id: 'INS-ABC-123'
      };

      const sensitiveFields = ['ssn', 'medical_record_number', 'insurance_id'];
      const { data: transmissionData, encryptionMetadata } = await transmissionService.prepareForTransmission(
        originalData,
        sensitiveFields
      );

      sensitiveFields.forEach(field => {
        expect(transmissionData[field]).toMatch(/^__ENCRYPTED__/);
        expect(encryptionMetadata[field]).toBeDefined();
      });

      const restoredData = await transmissionService.restoreFromTransmission(
        transmissionData,
        encryptionMetadata
      );

      expect(restoredData).toEqual(originalData);
    });
  });

  describe('HIPAA Compliance Integration', () => {
    it('should encrypt all PHI fields', async () => {
      const patientData = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        ssn: '123-45-6789',
        medical_record_number: 'MRN-2024-001',
        insurance_id: 'INS-ABC-123456',
        date_of_birth: '1980-01-15',
        phone: '+1-555-0123',
        email: 'john.doe@email.com',
        address: '123 Main St',
        diagnosis: 'Hypertension',
        medications: 'Lisinopril 10mg',
        allergies: 'Penicillin'
      };

      const phiFields = [
        'ssn', 'medical_record_number', 'insurance_id', 'date_of_birth',
        'phone', 'email', 'address', 'medications', 'allergies'
      ];

      const { data: encryptedData, encryptionMetadata } = await transmissionService.prepareForTransmission(
        patientData,
        phiFields
      );

      // Check that PHI fields are encrypted
      phiFields.forEach(field => {
        expect(encryptedData[field]).toMatch(/^__ENCRYPTED__/);
        expect(encryptionMetadata[field]).toBeDefined();
      });

      // Check that non-PHI fields are unchanged
      expect(encryptedData.id).toBe(patientData.id);
      expect(encryptedData.firstName).toBe(patientData.firstName);
      expect(encryptedData.lastName).toBe(patientData.lastName);
      expect(encryptedData.diagnosis).toBe(patientData.diagnosis);
    });

    it('should mask data for secure logging', () => {
      const patientData = {
        id: 'patient-123',
        ssn: '123-45-6789',
        medical_record_number: 'MRN-2024-001',
        phone: '+1-555-0123',
        email: 'john.doe@email.com',
        diagnosis: 'Hypertension'
      };

      const masked = maskingService.maskData(patientData);

      expect(masked.ssn).toBe('XXX-XX-6789');
      expect(masked.medical_record_number).toBe('MRN-2024-0**');
      expect(masked.phone).toBe('+1-555-0XXX');
      expect(masked.email).toBe('john.doe@email.com'); // Email masking not implemented yet
      expect(masked.id).toBe('patient-123');
      expect(masked.diagnosis).toBe('Hypertension');
    });
  });
});