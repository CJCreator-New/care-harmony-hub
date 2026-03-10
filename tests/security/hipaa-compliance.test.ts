import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { dataMasking, secureTransmission } from '@/utils/dataProtection';
import { sanitizeLogMessage } from '@/utils/sanitize';

describe('HIPAA Compliance Tests', () => {
  describe('PHI Protection', () => {
    it('redacts common PHI patterns from log messages', () => {
      const rawMessage =
        'Patient ssn 123-45-6789 email jane.doe@hospital.org phone 555-123-4567 card 4111 1111 1111 1111';
      const sanitized = sanitizeLogMessage(rawMessage);

      expect(sanitized).not.toContain('123-45-6789');
      expect(sanitized).not.toContain('jane.doe@hospital.org');
      expect(sanitized).not.toContain('555-123-4567');
      expect(sanitized).not.toContain('4111 1111 1111 1111');
      expect(sanitized).toContain('[SSN]');
      expect(sanitized).toContain('[EMAIL]');
      expect(sanitized).toContain('[PHONE]');
      expect(sanitized).toContain('[CARD]');
    });

    it('masks sensitive fields before logs/displays', () => {
      const masked = dataMasking.maskData(
        {
          ssn: '123-45-6789',
          medical_record_number: 'MRN-2026-98765',
          phone: '+1 (555) 123-4567',
        },
        ['ssn', 'medical_record_number', 'phone']
      );

      expect(masked.ssn).toBe('XXX-XX-6789');
      expect(masked.medical_record_number).not.toBe('MRN-2026-98765');
      expect(String(masked.phone)).toContain('XXX');
    });

    it('encrypts and restores PHI for secure transmission', async () => {
      const payload = {
        ssn: '123-45-6789',
        diagnosis: 'Acute viral pharyngitis',
      };

      const { data, encryptionMetadata } = await secureTransmission.prepareForTransmission(payload, ['ssn']);
      expect(data.ssn).toMatch(/^__ENCRYPTED__/);
      expect(encryptionMetadata.ssn).toBeDefined();
      expect(data.diagnosis).toBe(payload.diagnosis);

      const restored = await secureTransmission.restoreFromTransmission(data, encryptionMetadata);
      expect(restored.ssn).toBe(payload.ssn);
      expect(restored.diagnosis).toBe(payload.diagnosis);
    });
  });

  describe('Deterministic Compliance Controls', () => {
    it('keeps required HIPAA PHI field definitions in compliance hook', () => {
      const source = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useDataProtection.ts'), 'utf8');
      const requiredPhiFields = [
        "'ssn'",
        "'medical_record_number'",
        "'insurance_id'",
        "'date_of_birth'",
        "'diagnosis_codes'",
        "'treatment_notes'",
      ];

      for (const field of requiredPhiFields) {
        expect(source).toContain(field);
      }
    });

    it('enforces 30-minute inactivity timeout configuration', () => {
      const source = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useSessionTimeout.ts'), 'utf8');
      expect(source).toMatch(/SESSION_TIMEOUT\s*=\s*30\s*\*\s*60\s*\*\s*1000/);
      expect(source).toMatch(/WARNING_TIME\s*=\s*5\s*\*\s*60\s*\s*\*\s*1000|WARNING_TIME\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
    });

    it('keeps audit logging mapped to activity_logs with required metadata', () => {
      const source = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/auditLogger.ts'), 'utf8');
      expect(source).toContain(".from('activity_logs')");
      expect(source).toContain('hospital_id');
      expect(source).toContain('user_id');
      expect(source).toContain('action_type');
      expect(source).toContain('created_at');
    });
  });
});
