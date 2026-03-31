import { describe, it, expect } from 'vitest';
import {
  validateAuditContext,
  sanitizeChangeReason,
  HIGH_RISK_ACTION_TYPES,
  type AuditContext,
} from '@/lib/workflow/contracts';

describe('Audit Context Validation', () => {
  describe('validateAuditContext', () => {
    describe('low-risk actions', () => {
      it('should return true for low-risk actions without audit context', () => {
        // create_task is not high-risk
        const result = validateAuditContext('create_task', undefined);
        expect(result).toBe(true);
      });

      it('should return true for send_notification without audit context', () => {
        const result = validateAuditContext('send_notification', undefined);
        expect(result).toBe(true);
      });
    });

    describe('high-risk actions', () => {
      it('should throw when update_status has no audit context', () => {
        expect(() => validateAuditContext('update_status', undefined)).toThrow(
          /audit context required/i
        );
      });

      it('should throw when trigger_function has no audit context', () => {
        expect(() => validateAuditContext('trigger_function', undefined)).toThrow(
          /audit context required/i
        );
      });

      it('should throw when escalate has no audit context', () => {
        expect(() => validateAuditContext('escalate', undefined)).toThrow(
          /audit context required/i
        );
      });

      it('should throw when change_reason is missing', () => {
        const contextWithoutReason: Partial<AuditContext> = {
          action_type: 'patient_status_update',
          performed_by: 'user-123',
          hospital_id: 'hospital-456',
          resource_type: 'patient',
        };

        expect(() => validateAuditContext('update_status', contextWithoutReason)).toThrow(
          /change_reason is required/i
        );
      });

      it('should throw when change_reason is empty string', () => {
        const contextWithEmptyReason: Partial<AuditContext> = {
          action_type: 'patient_status_update',
          performed_by: 'user-123',
          hospital_id: 'hospital-456',
          resource_type: 'patient',
          change_reason: '', // ← Empty
        };

        expect(() => validateAuditContext('update_status', contextWithEmptyReason)).toThrow(
          /change_reason is required/i
        );
      });

      it('should throw when performed_by is missing', () => {
        const contextWithoutPerformedBy: Partial<AuditContext> = {
          action_type: 'patient_status_update',
          hospital_id: 'hospital-456',
          change_reason: 'Patient vitals stable',
          resource_type: 'patient',
        };

        expect(() => validateAuditContext('update_status', contextWithoutPerformedBy)).toThrow(
          /performed_by is required/i
        );
      });

      it('should throw when hospital_id is missing', () => {
        const contextWithoutHospital: Partial<AuditContext> = {
          action_type: 'patient_status_update',
          performed_by: 'user-123',
          change_reason: 'Patient vitals stable',
          resource_type: 'patient',
        };

        expect(() => validateAuditContext('update_status', contextWithoutHospital)).toThrow(
          /hospital_id is required/i
        );
      });

      it('should throw when resource_type is missing', () => {
        const contextWithoutResourceType: Partial<AuditContext> = {
          action_type: 'patient_status_update',
          performed_by: 'user-123',
          hospital_id: 'hospital-456',
          change_reason: 'Patient vitals stable',
        };

        expect(() => validateAuditContext('update_status', contextWithoutResourceType)).toThrow(
          /resource_type is required/i
        );
      });

      it('should return true with all required fields for update_status', () => {
        const validContext: AuditContext = {
          action_type: 'patient_status_update',
          performed_by: 'user-123',
          hospital_id: 'hospital-456',
          patient_id: 'patient-789',
          change_reason: 'Vitals stable: BP 120/80, HR 82, Temp 98.6°F',
          resource_type: 'patient',
          before_state: { status: 'in_prep' },
          after_state: { status: 'in_service' },
        };

        const result = validateAuditContext('update_status', validContext);
        expect(result).toBe(true);
      });

      it('should return true with all required fields for escalate', () => {
        const validContext: AuditContext = {
          action_type: 'clinical_escalation',
          performed_by: 'doctor-123',
          hospital_id: 'hospital-456',
          patient_id: 'patient-789',
          change_reason: 'Critical lab value detected: Potassium 6.8 mEq/L (HIGH)',
          resource_type: 'lab_result',
        };

        const result = validateAuditContext('escalate', validContext);
        expect(result).toBe(true);
      });

      it('should return true with all required fields for trigger_function', () => {
        const validContext: AuditContext = {
          action_type: 'discharge_workflow_trigger',
          performed_by: 'doctor-123',
          hospital_id: 'hospital-456',
          patient_id: 'patient-789',
          change_reason: 'Patient medically cleared for discharge. All medications verified.',
          resource_type: 'discharge_order',
        };

        const result = validateAuditContext('trigger_function', validContext);
        expect(result).toBe(true);
      });
    });
  });

  describe('sanit izeChangeReason', () => {
    it('should strip email addresses', () => {
      const reason = 'Patient confirmed by doctor@hospital.com';
      const sanitized = sanitizeChangeReason(reason);
      expect(sanitized).toBe('Patient confirmed by [EMAIL]');
    });

    it('should strip phone numbers', () => {
      const reason = 'Contact patient at 555-123-4567 for follow-up';
      const sanitized = sanitizeChangeReason(reason);
      expect(sanitized).toBe('Contact patient at [PHONE] for follow-up');
    });

    it('should strip phone numbers (no-dash format)', () => {
      const reason = 'Emergency contact: 5551234567';
      const sanitized = sanitizeChangeReason(reason);
      expect(sanitized).toBe('Emergency contact: [PHONE]');
    });

    it('should strip MRN patterns', () => {
      const reason = 'Updated based on chart review MRN-12-34-56789';
      const sanitized = sanitizeChangeReason(reason);
      expect(sanitized).toBe('Updated based on chart review [MRN]');
    });

    it('should handle multiple PHI patterns in one string', () => {
      const reason =
        'Patient John Doe (MRN 123456) called 555-987-6543 email: john@example.com to confirm';
      const sanitized = sanitizeChangeReason(reason);
      expect(sanitized).toContain('[MRN]');
      expect(sanitized).toContain('[PHONE]');
      expect(sanitized).toContain('[EMAIL]');
      expect(sanitized).not.toContain('555-987-6543');
      expect(sanitized).not.toContain('john@example.com');
    });

    it('should trim whitespace', () => {
      const reason = '  Vitals checked  ';
      const sanitized = sanitizeChangeReason(reason);
      expect(sanitized).toBe('Vitals checked');
    });

    it('should handle empty string', () => {
      const sanitized = sanitizeChangeReason('');
      expect(sanitized).toBe('');
    });

    it('should preserve legitimate clinical information', () => {
      const reason = 'Vitals stable: BP 120/80, HR 82, Temp 98.6F. Patient ready for doctor.';
      const sanitized = sanitizeChangeReason(reason);
      expect(sanitized).toBe(reason); // No PHI patterns, unchanged
    });
  });

  describe('HIGH_RISK_ACTION_TYPES', () => {
    it('should contain update_status', () => {
      expect(HIGH_RISK_ACTION_TYPES.has('update_status')).toBe(true);
    });

    it('should contain trigger_function', () => {
      expect(HIGH_RISK_ACTION_TYPES.has('trigger_function')).toBe(true);
    });

    it('should contain escalate', () => {
      expect(HIGH_RISK_ACTION_TYPES.has('escalate')).toBe(true);
    });

    it('should not contain create_task', () => {
      expect(HIGH_RISK_ACTION_TYPES.has('create_task')).toBe(false);
    });

    it('should not contain send_notification', () => {
      expect(HIGH_RISK_ACTION_TYPES.has('send_notification')).toBe(false);
    });

    it('should have exactly 3 entries', () => {
      expect(HIGH_RISK_ACTION_TYPES.size).toBe(3);
    });
  });
});
